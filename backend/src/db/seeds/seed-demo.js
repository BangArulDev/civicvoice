const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const pool = require('../pool');
const config = require('../../common/config');

/**
 * Titik koordinat pusat perkiraan untuk 8 kecamatan utama di Kabupaten Grobogan.
 * CATATAN PENTING:
 * Koordinat pusat kecamatan di bawah ini adalah perkiraan titik representatif
 * untuk simulasi sebaran aduan publik saat demo MVP.
 */
const KECAMATAN_CENTERS = [
  { name: 'Purwodadi', lat: -7.0881, lng: 110.9167 },
  { name: 'Godong', lat: -7.0542, lng: 110.7604 },
  { name: 'Gubug', lat: -7.0526, lng: 110.6558 },
  { name: 'Toroh', lat: -7.1362, lng: 110.9115 },
  { name: 'Wirosari', lat: -7.1089, lng: 111.1098 },
  { name: 'Pulokulon', lat: -7.1681, lng: 111.0825 },
  { name: 'Geyer', lat: -7.2183, lng: 110.9022 },
  { name: 'Tawangharjo', lat: -7.0782, lng: 111.0125 },
];

/**
 * Menghasilkan koordinat acak dalam radius ~3 km dari pusat kecamatan.
 * Setiap koordinat WAJIB divalidasi dengan ST_Covers terhadap service_areas.
 * Jika berada di luar wilayah Grobogan, titik dibuang dan di-generate ulang.
 */
async function generateValidCoordinate(center, client) {
  const maxRadiusKm = 3.0;
  let attempts = 0;

  while (attempts < 50) {
    attempts++;
    // Distribusi titik acak dalam lingkaran 2D (uniform disk)
    const radius = Math.sqrt(Math.random()) * maxRadiusKm;
    const angle = Math.random() * 2 * Math.PI;

    // 1 derajat lintang ~ 111 km, bujur disesuaikan kosinus lintang
    const deltaLat = (radius / 111.0) * Math.sin(angle);
    const deltaLng =
      (radius / (111.0 * Math.cos((center.lat * Math.PI) / 180))) * Math.cos(angle);

    const candidateLat = parseFloat((center.lat + deltaLat).toFixed(6));
    const candidateLng = parseFloat((center.lng + deltaLng).toFixed(6));

    // Periksa apakah titik berada di dalam batas administratif resmi Kabupaten Grobogan
    const checkRes = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM service_areas
         WHERE is_active = TRUE
           AND ST_Covers(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)
       ) AS inside;`,
      [candidateLng, candidateLat]
    );

    if (checkRes.rows[0]?.inside) {
      return { lat: candidateLat, lng: candidateLng };
    }
  }

  // Fallback ke titik pusat kecamatan jika loop melebihi 50 iterasi
  return { lat: center.lat, lng: center.lng };
}

/**
 * Template narasi realistis per kategori aduan publik di Kabupaten Grobogan.
 */
const COMPLAINT_TEMPLATES = {
  'Jalan Rusak': [
    {
      title: 'Aspal Berlubang Cukup Parah di Jalur Penghubung Kecamatan {kecamatan}',
      desc: 'Permukaan aspal terkelupas dan berlubang sedalam sekitar 15 cm. Saat hujan jalanan tergenang air keruh sehingga sering membuat pengendara motor terperosok dan terjatuh.',
    },
    {
      title: 'Bahu Jalan Amblas Dekat Jembatan Irigasi di {kecamatan}',
      desc: 'Bahu jalan di dekat jembatan saluran irigasi terkikis arus air dan amblas sedalam 30 cm. Sudah dipasang penanda darurat dari bambu, perlu penanganan bronjong segera.',
    },
    {
      title: 'Kerusakan Jalan Beton Retak Membahayakan Pengendara di {kecamatan}',
      desc: 'Lempengan cor beton jalan utama patah dan mencuat setinggi 10 cm. Kendaraan berkecepatan sedang rawan mengalami pecah ban atau terpelanting.',
    },
    {
      title: 'Jalan Utama {kecamatan} Bergelombang Parah Akibat Muatan Berat',
      desc: 'Kondisi jalan bergelombang dan berlubang memanjang di lajur kiri. Jalur ini merupakan akses vital warga menuju pasar dan fasilitas kesehatan.',
    },
    {
      title: 'Paving Block Jalan Lingkungan Lepas dan Berserakan di {kecamatan}',
      desc: 'Akses jalan desa dengan konstruksi paving block banyak yang ambrol dan hilang terbawa aliran air hujan, menyulitkan mobilitas warga dan anak sekolah.',
    },
  ],
  'Sampah Menumpuk': [
    {
      title: 'Tumpukan Sampah Liar Meluber ke Bahu Jalan di {kecamatan}',
      desc: 'Timbunan kantong plastik, sampah pasar, dan sisa makanan menumpuk setinggi 1 meter di pinggir jalan utama. Menimbulkan aroma busuk menyengat dan mengundang lalat.',
    },
    {
      title: 'Tempat Pembuangan Sampah Liar Mencemari Saluran Air {kecamatan}',
      desc: 'Banyak warga luar membuang sampah karungan langsung ke saluran irigasi sekunder. Aliran air tersumbat dan memicu luapan air kotor ke pemukiman saat hujan lebat.',
    },
    {
      title: 'Sampah Pasar Tradisional Menumpuk Tidak Diangkut di {kecamatan}',
      desc: 'Bak penampungan sampah sementara di area pasar meluber hingga memakan separuh jalan desa. Sudah 4 hari truk pengangkut sampah belum datang mengangkut.',
    },
    {
      title: 'Limbah Plastik dan Sampah Rumah Tangga Dibuang di Lahan Terbuka {kecamatan}',
      desc: 'Lahan kosong di pinggir perkebunan dijadikan tempat pembuangan liar oleh oknum tak bertanggung jawab. Warga memohon pemasangan papan peringatan tegas.',
    },
    {
      title: 'Tumpukan Sampah Ranting dan Kresek Menutup Drainase di {kecamatan}',
      desc: 'Saluran drainase depan pemukiman penuh dengan endapan sampah organik dan plastik, mengakibatkan genangan air setinggi mata kaki saat hujan deras.',
    },
  ],
  'Lampu Penerangan Mati': [
    {
      title: 'Lampu Penerangan Jalan Umum (LPJU) Padam di Tikungan Rawan {kecamatan}',
      desc: 'Empat titik lampu penerangan jalan umum padam sejak satu pekan terakhir. Kawasan tikungan tajam menjadi gelap gulita dan rawan terjadi kecelakaan malam hari.',
    },
    {
      title: 'Tiang Lampu Jalan Mati di Depan Sekolah Dasar {kecamatan}',
      desc: 'Lampu penerangan tepat di depan gerbang sekolah padam total. Lokasi ini ramai lalu lalang anak-anak dan warga yang beraktivitas di musala pada malam hari.',
    },
    {
      title: 'Kabel Lampu Penerangan Kendur Menjuntai di Jalan Raya {kecamatan}',
      desc: 'Kabel suplai daya lampu jalan terlepas dari klem tiang dan menjuntai cukup rendah, membahayakan truk bermuatan tinggi dan lampu dalam kondisi tidak menyala.',
    },
    {
      title: 'Lampu Jalan Berkedip dan Padam Total Sepanjang Jalur {kecamatan}',
      desc: 'Bohlam lampu LPJU merkuri berkedip tidak stabil lalu mati. Kondisi jalur persawahan yang sepi memerlukan penerangan yang memadai.',
    },
    {
      title: 'Deretan Lampu Penerangan Menuju Jembatan {kecamatan} Mati',
      desc: 'Akses jembatan penghubung antar-desa sangat gelap karena tiga tiang lampu berturut-turut tidak menyala, diduga sekring pada boks panel putus.',
    },
  ],
  'Ketertiban/Parkir Liar': [
    {
      title: 'Parkir Liar Truk Tronton Memakan Badan Jalan Sempit di {kecamatan}',
      desc: 'Deretan truk ekspedisi parkir inap di pinggir jalan raya tanpa penerangan atau rambu darurat. Mengganggu kelancaran arus lalu lintas pada jam sibuk pagi hari.',
    },
    {
      title: 'Lapak PKL Liar Menutup Akses Trotoar Pejalan Kaki di {kecamatan}',
      desc: 'Pedagang kaki lima mendirikan lapak semi-permanen tepat di atas trotoar, memaksa pejalan kaki dan lansia berjalan di tepi aspal jalan yang ramai kendaraan.',
    },
    {
      title: 'Parkir Sembarangan Pengunjung Toko Menyebabkan Macet di {kecamatan}',
      desc: 'Kendaraan roda empat parkir berlapis di depan pertokoan tanpa juru parkir resmi, menghalangi lajur kendaraan lain dan memicu kemacetan panjang.',
    },
    {
      title: 'Tumpukan Pasir dan Material Proyek Memakan Bahu Jalan di {kecamatan}',
      desc: 'Material pasir dan batu kali dibiarkan menumpuk di badan jalan tanpa penutup terpal atau rambu penanda, sudah menyebabkan pengendara motor tergelincir.',
    },
    {
      title: 'Spanduk Promosi Liar Roboh Melintang di Atas Jalan {kecamatan}',
      desc: 'Baliho komersial tanpa izin roboh dan bambu penyangganya melintang di atas jalan raya, sangat membahayakan pengendara sepeda motor yang melintas.',
    },
  ],
};

/**
 * Palet warna per kategori untuk pembuatan foto placeholder lokal dengan Sharp.
 */
const CATEGORY_COLORS = {
  1: { bg: '#1e3a8a', accent: '#3b82f6', label: 'Infrastruktur Jalan' }, // Blue
  2: { bg: '#14532d', accent: '#22c55e', label: 'Kebersihan & Sampah' }, // Green
  3: { bg: '#78350f', accent: '#f59e0b', label: 'Penerangan Jalan' }, // Amber
  4: { bg: '#581c87', accent: '#a855f7', label: 'Ketertiban Umum' }, // Purple
};

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Menghasilkan buffer JPEG gambar placeholder lokal menggunakan Sharp & SVG.
 * Tanpa mengunduh dari internet sama sekali.
 */
async function generateCategoryPhotos(categories) {
  const photoMap = {};

  for (const cat of categories) {
    const color = CATEGORY_COLORS[cat.id] || {
      bg: '#1e293b',
      accent: '#64748b',
      label: cat.name,
    };

    const categoryTitle = escapeXml(cat.name.toUpperCase());

    const svg = `
      <svg width="1200" height="900" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad-${cat.id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color.bg};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color.accent};stop-opacity:0.85" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad-${cat.id})" />
        <rect x="50" y="50" width="1100" height="800" rx="24" fill="none" stroke="#ffffff" stroke-width="4" stroke-opacity="0.3" />
        
        <!-- Badge Tag -->
        <rect x="100" y="100" width="300" height="50" rx="12" fill="#ffffff" fill-opacity="0.2" />
        <text x="250" y="133" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">
          CIVICVOICE GROBOGAN
        </text>

        <!-- Nama Kategori Utama -->
        <text x="600" y="420" font-family="Arial, sans-serif" font-size="58" font-weight="bold" fill="#ffffff" text-anchor="middle">
          ${categoryTitle}
        </text>

        <!-- Keterangan Subtitle -->
        <text x="600" y="490" font-family="Arial, sans-serif" font-size="26" fill="#f1f5f9" text-anchor="middle">
          Dokumentasi Bukti Aduan Lapangan (Simulasi Demo MVP)
        </text>
        <text x="600" y="540" font-family="Arial, sans-serif" font-size="20" fill="#cbd5e1" text-anchor="middle">
          Foto diproses otomatis secara lokal dengan Sharp (EXIF Sanitized)
        </text>

        <!-- Footer Bar -->
        <rect x="50" y="770" width="1100" height="80" rx="12" fill="#000000" fill-opacity="0.3" />
        <text x="600" y="818" font-family="Arial, sans-serif" font-size="20" fill="#94a3b8" text-anchor="middle">
          Wilayah Layanan Kabupaten Grobogan, Jawa Tengah &#8226; Koordinat Geotagged
        </text>
      </svg>
    `;

    // Gambar Utama (1200x900 JPEG kualitas 85)
    const mainBuffer = await sharp(Buffer.from(svg))
      .jpeg({ quality: 85 })
      .toBuffer();

    // Gambar Thumbnail (320x240 JPEG kualitas 80)
    const thumbBuffer = await sharp(Buffer.from(svg))
      .resize(320, 240)
      .jpeg({ quality: 80 })
      .toBuffer();

    photoMap[cat.id] = { mainBuffer, thumbBuffer };
  }

  return photoMap;
}

/**
 * Skrip Seeder Data Demo MVP CivicVoice:
 * - 60 Aduan simulasi anonim berawalan nomor tiket CVD-XXXX
 * - Tersebar di 8 kecamatan utama Grobogan
 * - ~70% berstatus 'baru', sisanya campuran 'diverifikasi', 'diproses', 'selesai'
 * - Riwayat status (status_history) dan foto Sharp lengkap
 * - Transaksional dan Idempoten
 */
async function seedDemo(customClient = null) {
  const isExternalClient = Boolean(customClient);
  const client = customClient || (await pool.connect());

  try {
    console.log('=== [DEMO SEEDER] Memulai Pengisian Data Demo MVP CivicVoice (60 Aduan) ===');
    await client.query('BEGIN');

    // 1. Ambil semua kategori aktif dari database
    const catRes = await client.query(
      'SELECT id, name FROM categories WHERE is_active = TRUE ORDER BY id ASC;'
    );
    const categories = catRes.rows;
    if (categories.length === 0) {
      throw new Error('Tidak ada kategori aduan aktif. Jalankan npm run seed terlebih dahulu.');
    }
    console.log(`-> Ditemukan ${categories.length} kategori aktif.`);

    // 2. Bersihkan data demo lama (idempoten)
    const oldDemoRes = await client.query(
      "SELECT id FROM complaints WHERE ticket_no LIKE 'CVD-%';"
    );
    if (oldDemoRes.rows.length > 0) {
      console.log(`-> Menghapus ${oldDemoRes.rows.length} aduan demo lama (tiket CVD-*)...`);
      for (const row of oldDemoRes.rows) {
        const oldUploadDir = path.join(config.uploadDir, 'complaints', row.id);
        if (fs.existsSync(oldUploadDir)) {
          fs.rmSync(oldUploadDir, { recursive: true, force: true });
        }
      }
      await client.query("DELETE FROM complaints WHERE ticket_no LIKE 'CVD-%';");
    }

    // 3. Siapkan buffer foto Sharp per kategori
    console.log('-> Menghasilkan berkas gambar placeholder JPEG dengan Sharp...');
    const categoryPhotos = await generateCategoryPhotos(categories);

    // 4. Susun daftar status: 42 'baru' (70%), 6 'diverifikasi' (10%), 6 'diproses' (10%), 6 'selesai' (10%)
    const statusDistribution = [
      ...Array(42).fill('baru'),
      ...Array(6).fill('diverifikasi'),
      ...Array(6).fill('diproses'),
      ...Array(6).fill('selesai'),
    ];

    // Acak urutan status agar tidak mengelompok
    for (let i = statusDistribution.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [statusDistribution[i], statusDistribution[j]] = [statusDistribution[j], statusDistribution[i]];
    }

    console.log('-> Membuat 60 aduan simulasi di 8 kecamatan Kabupaten Grobogan...');

    const totalComplaints = 60;
    const now = Date.now();

    for (let i = 1; i <= totalComplaints; i++) {
      const ticketNo = `CVD-${String(i).padStart(4, '0')}`;
      const status = statusDistribution[i - 1];

      // Tentukan kecamatan bergantian di 8 kecamatan
      const kecamatan = KECAMATAN_CENTERS[(i - 1) % KECAMATAN_CENTERS.length];

      // Generate koordinat valid di dalam kecamatan yang lolos ST_Covers
      const coord = await generateValidCoordinate(kecamatan, client);

      // Tentukan kategori (rotasi teratur)
      const category = categories[(i - 1) % categories.length];

      // Ambil template judul & kronologi
      const templateList = COMPLAINT_TEMPLATES[category.name] || COMPLAINT_TEMPLATES['Jalan Rusak'];
      const template = templateList[(i - 1) % templateList.length];

      const title = template.title.replace('{kecamatan}', kecamatan.name);
      const description = template.desc.replace('{kecamatan}', kecamatan.name);

      // Prioritas 1 s.d. 3 (1: normal, 2: sedang, 3: darurat)
      const priority = (i % 3) + 1;

      // Waktu dibuat tersebar dalam 30 hari terakhir
      // Formula: aduan lebih awal punya tanggal lebih lama (1 sampai 29 hari lalu)
      const daysAgo = Math.floor(((totalComplaints - i) / totalComplaints) * 28) + 1;
      const hoursOffset = (i * 7) % 24;
      const minutesOffset = (i * 13) % 60;
      const createdAt = new Date(now - (daysAgo * 86400000 + hoursOffset * 3600000 + minutesOffset * 60000));

      const accuracyM = parseFloat((Math.random() * 15 + 5).toFixed(1)); // 5.0 - 20.0 meter

      // Insert aduan ke tabel complaints
      const insertComplaintQuery = `
        INSERT INTO complaints (
          ticket_no,
          reporter_id,
          reporter_identity_enc,
          is_anonymous,
          category_id,
          title,
          description,
          location,
          gps_accuracy_m,
          location_source,
          priority,
          status,
          created_at,
          updated_at
        )
        VALUES (
          $1, NULL, NULL, TRUE, $2, $3, $4,
          ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
          $7, 'auto', $8, $9, $10, $10
        )
        RETURNING id;
      `;

      const { rows: insertedRows } = await client.query(insertComplaintQuery, [
        ticketNo,
        category.id,
        title,
        description,
        coord.lng,
        coord.lat,
        accuracyM,
        priority,
        status,
        createdAt,
      ]);

      const complaintId = insertedRows[0].id;

      // 5. Simpan foto placeholder ke direktori uploads
      const complaintDir = path.join(config.uploadDir, 'complaints', complaintId);
      fs.mkdirSync(complaintDir, { recursive: true });

      const photoId = crypto.randomUUID();
      const mainFileName = `${photoId}.jpg`;
      const thumbFileName = `${photoId}_thumb.jpg`;

      const catPhoto = categoryPhotos[category.id] || categoryPhotos[categories[0].id];
      fs.writeFileSync(path.join(complaintDir, mainFileName), catPhoto.mainBuffer);
      fs.writeFileSync(path.join(complaintDir, thumbFileName), catPhoto.thumbBuffer);

      const photoUrl = `/uploads/complaints/${complaintId}/${mainFileName}`;
      await client.query(
        `INSERT INTO complaint_photos (complaint_id, photo_url, caption, created_at)
         VALUES ($1, $2, $3, $4);`,
        [complaintId, photoUrl, `Foto Simulasi - ${category.name}`, createdAt]
      );

      // 6. Buat riwayat status (status_history) yang konsisten
      const t0 = createdAt;
      const t1 = new Date(Math.min(now, t0.getTime() + 2 * 3600000));
      const t2 = new Date(Math.min(now, t1.getTime() + 6 * 3600000));
      const t3 = new Date(Math.min(now, t2.getTime() + 18 * 3600000));

      // Entri status awal selalu 'baru'
      await client.query(
        `INSERT INTO status_history (complaint_id, status, note, created_at)
         VALUES ($1, 'baru', 'Aduan berhasil dibuat oleh warga dan masuk ke antrean triase operator.', $2);`,
        [complaintId, t0]
      );

      if (status === 'diverifikasi' || status === 'diproses' || status === 'selesai') {
        await client.query(
          `INSERT INTO status_history (complaint_id, status, note, created_at)
           VALUES ($1, 'diverifikasi', 'Aduan telah diverifikasi oleh operator dan siap didisposisikan ke dinas terkait.', $2);`,
          [complaintId, t1]
        );
      }

      if (status === 'diproses' || status === 'selesai') {
        await client.query(
          `INSERT INTO status_history (complaint_id, status, note, created_at)
           VALUES ($1, 'diproses', 'Petugas dinas terkait menerima laporan dan sedang melakukan penanganan fisik di lapangan.', $2);`,
          [complaintId, t2]
        );
      }

      if (status === 'selesai') {
        await client.query(
          `INSERT INTO status_history (complaint_id, status, note, created_at)
           VALUES ($1, 'selesai', 'Laporan telah berhasil ditangani dan diselesaikan secara tuntas oleh petugas.', $2);`,
          [complaintId, t3]
        );
      }
    }

    await client.query('COMMIT');
    console.log('=== [DEMO SEEDER] Berhasil menyisipkan 60 aduan simulasi demo MVP! ===');
    console.log('   - 42 Aduan berstatus "baru" (70%)');
    console.log('   -  6 Aduan berstatus "diverifikasi" (10%)');
    console.log('   -  6 Aduan berstatus "diproses" (10%)');
    console.log('   -  6 Aduan berstatus "selesai" (10%)');
    console.log('   - Tersebar merata di 8 kecamatan dengan foto Sharp lokal.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Fatal error saat seeding data demo:', error.message);
    throw error;
  } finally {
    if (!isExternalClient) {
      client.release();
    }
  }
}

if (require.main === module) {
  seedDemo()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}

module.exports = seedDemo;
