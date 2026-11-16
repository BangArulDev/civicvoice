const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const pool = require('../../db/pool');
const config = require('../../common/config');
const { validationError, notFound, forbidden } = require('../../common/errors');
const cryptoHelper = require('../../common/crypto');
const complaintRepository = require('./repository');

/**
 * Pemeriksaan Magic Bytes biner untuk memastikan berkas asli berupa JPEG atau PNG
 */
function isValidImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 8) return false;

  // JPEG: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  return isJpeg || isPng;
}

function formatComplaintResponse(row) {
  return {
    id: row.id,
    ticketNo: row.ticket_no,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    status: row.status,
    priority: row.priority,
    isAnonymous: row.is_anonymous,
    location: {
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      accuracyM: row.gps_accuracy_m !== null ? parseFloat(row.gps_accuracy_m) : null,
      source: row.location_source,
    },
    photos: Array.isArray(row.photos) ? row.photos : [],
    skpdId: row.skpd_id || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

async function createComplaint({ data, files, currentUser }) {
  // 1. Validasi Akurasi GPS (Maksimal 100 meter)
  if (data.accuracyM !== null && data.accuracyM !== undefined && data.accuracyM > 100) {
    throw validationError(
      'Akurasi GPS perangkat melebihi batas toleransi maksimal 100 meter',
      [{ field: 'accuracyM', issue: 'gps_accuracy_too_low' }]
    );
  }

  // 2. Validasi Wilayah Layanan (Wajib berada dalam poligon Kabupaten Grobogan)
  const isInside = await complaintRepository.isInsideServiceArea(data.lng, data.lat);
  if (!isInside) {
    throw validationError('Koordinat berada di luar wilayah layanan Kabupaten Grobogan', [
      { field: 'location', issue: 'out_of_service_area' },
    ]);
  }

  // 3. Validasi Keberadaan Kategori Aduan
  const category = await complaintRepository.findCategoryById(data.categoryId);
  if (!category) {
    throw validationError('Kategori aduan tidak ditemukan', [
      { field: 'categoryId', issue: 'category_not_found' },
    ]);
  }

  // 4. Validasi Berkas Foto (Minimal 1, Maksimal 5)
  if (!files || files.length === 0) {
    throw validationError('Foto bukti aduan wajib disertakan (minimal 1 berkas foto)', [
      { field: 'photos', issue: 'photos_required' },
    ]);
  }

  if (files.length > 5) {
    throw validationError('Maksimal 5 berkas foto bukti aduan yang diperbolehkan', [
      { field: 'photos', issue: 'too_many_photos' },
    ]);
  }

  // 5. Validasi Magic Bytes Biner Setiap Berkas Foto
  for (const file of files) {
    if (!isValidImageMagicBytes(file.buffer)) {
      throw validationError(
        'Format berkas foto tidak valid. Hanya gambar JPEG dan PNG yang diperbolehkan',
        [{ field: 'photos', issue: 'invalid_image_type' }]
      );
    }
  }

  // 6. Penentuan Status Anonimitas & Enkripsi Identitas Pelapor
  const isAnonymous = !currentUser || Boolean(data.isAnonymous);
  let reporterId = null;
  let reporterIdentityEnc = null;

  if (isAnonymous) {
    reporterId = null;
    // Jika pengguna login namun memilih anonim, enkripsi ID & email menggunakan AES-256-GCM
    if (currentUser) {
      const identityPayload = JSON.stringify({
        id: currentUser.id,
        email: currentUser.email,
        fullName: currentUser.fullName,
      });
      reporterIdentityEnc = cryptoHelper.encrypt(identityPayload);
    }
  } else {
    reporterId = currentUser.id;
    reporterIdentityEnc = null;
  }

  // 7. Eksekusi Transaksi Basis Data & Pemrosesan Berkas Gambar
  const client = await pool.connect();
  let createdComplaintDir = null;

  try {
    await client.query('BEGIN');

    // a. Buat nomor tiket aduan berurutan (CV-YYYYMMDD-NNNN)
    const ticketNo = await complaintRepository.generateTicketNo(client);

    // b. Ambil usulan dinas (SKPD) yang membidangi kategori aduan ini
    const suggestedSkpdId = await complaintRepository.getSuggestedSkpdId(data.categoryId, client);

    // c. Simpan aduan utama ke tabel complaints
    const createdComplaint = await complaintRepository.insertComplaint(
      {
        ticketNo,
        reporterId,
        reporterIdentityEnc,
        isAnonymous,
        categoryId: data.categoryId,
        title: data.title,
        description: data.description,
        lng: data.lng,
        lat: data.lat,
        accuracyM: data.accuracyM,
        locationSource: data.locationSource,
        priority: 1,
        status: 'baru',
      },
      client
    );

    const complaintId = createdComplaint.id;
    const complaintDir = path.join(config.uploadDir, 'complaints', complaintId);
    createdComplaintDir = complaintDir;

    // Pastikan direktori tujuan tersedia
    fs.mkdirSync(complaintDir, { recursive: true });

    // d. Proses setiap foto dengan Sharp (strip EXIF, resize max 1600px, thumbnail 320px)
    const photoRecords = [];
    for (const file of files) {
      const photoId = crypto.randomUUID();
      const mainFileName = `${photoId}.jpg`;
      const thumbFileName = `${photoId}_thumb.jpg`;
      const mainFilePath = path.join(complaintDir, mainFileName);
      const thumbFilePath = path.join(complaintDir, thumbFileName);

      // Gambar utama: maksimal 1600px, kualitas JPEG 85, EXIF otomatis terhapus saat re-encode
      await sharp(file.buffer)
        .rotate()
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(mainFilePath);

      // Thumbnail: maksimal 320px, kualitas JPEG 80
      await sharp(file.buffer)
        .rotate()
        .resize(320, 320, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbFilePath);

      photoRecords.push({
        url: `/uploads/complaints/${complaintId}/${mainFileName}`,
        caption: file.originalname ? path.parse(file.originalname).name : null,
      });
    }

    // e. Simpan daftar foto ke tabel complaint_photos
    await complaintRepository.insertComplaintPhotos(complaintId, photoRecords, client);

    // f. Catat riwayat status awal ("baru") ke status_history
    await complaintRepository.insertStatusHistory(
      {
        complaintId,
        status: 'baru',
        changedBy: reporterId,
        note: 'Aduan berhasil dibuat oleh warga',
      },
      client
    );

    // g. Commit transaksi
    await client.query('COMMIT');

    return {
      id: createdComplaint.id,
      ticketNo: createdComplaint.ticket_no,
      status: createdComplaint.status,
      suggestedSkpdId,
      createdAt:
        createdComplaint.created_at instanceof Date
          ? createdComplaint.created_at.toISOString()
          : createdComplaint.created_at,
    };
  } catch (error) {
    // Rollback transaksi jika terjadi kesalahan
    await client.query('ROLLBACK');

    // Hapus berkas gambar yang sudah sempat ditulis di disk agar tidak menjadi sampah
    if (createdComplaintDir && fs.existsSync(createdComplaintDir)) {
      try {
        fs.rmSync(createdComplaintDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.error('[CLEANUP ERROR] Gagal menghapus folder berkas saat rollback:', cleanupErr);
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

async function listMyComplaints(user, query) {
  const result = await complaintRepository.findComplaintsByReporter(user.id, query);
  return {
    data: result.rows.map(formatComplaintResponse),
    page: query.page,
    limit: query.limit,
    total: result.total,
  };
}

async function trackComplaint(ticketNo) {
  const result = await complaintRepository.findComplaintByTicketNo(ticketNo);
  if (!result) {
    throw notFound(`Aduan dengan nomor tiket '${ticketNo}' tidak ditemukan`);
  }
  return result;
}

async function getComplaintById(id, user) {
  const row = await complaintRepository.findComplaintById(id);
  if (!row) {
    throw notFound('Aduan tidak ditemukan');
  }

  // Pengecekan Otorisasi Berdasarkan Peran
  if (user.role === 'skpd') {
    // TODO: izinkan akses SKPD setelah fitur disposisi M2/M3 selesai
    throw forbidden('Akses untuk petugas SKPD belum dibuka hingga modul disposisi aktif');
  }

  if (user.role === 'warga') {
    // Warga hanya boleh melihat aduan miliknya sendiri
    if (row.reporter_id !== user.id) {
      throw forbidden('Anda tidak memiliki izin untuk melihat detail aduan milik warga lain');
    }
  }

  // Operator dan Admin diizinkan melihat semua aduan
  return formatComplaintResponse(row);
}

async function listCategories() {
  const categories = await complaintRepository.findAllActiveCategories();
  return {
    data: categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
    })),
  };
}

module.exports = {
  createComplaint,
  listMyComplaints,
  trackComplaint,
  getComplaintById,
  listCategories,
};
