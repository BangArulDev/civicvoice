const fs = require('fs');
const path = require('path');
const request = require('supertest');
const sharp = require('sharp');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const pool = require('../src/db/pool');
const config = require('../src/common/config');
const cryptoHelper = require('../src/common/crypto');

describe('M1 Complaint Module Integration Tests', () => {
  const timestamp = Date.now();
  let validPngBuffer;
  const fakeJpgBuffer = Buffer.from('INI_BUKAN_GAMBAR_VALID_HANYA_TEKS_BIASA');

  let categoryId;
  let warga1Id;
  let warga1Email;
  let warga1Token;

  let warga2Id;
  let warga2Email;
  let warga2Token;

  let createdComplaintIdWarga1;
  let createdTicketNoWarga1;
  let createdComplaintIdAnon;
  let createdTicketNoAnon;

  const createdComplaintDirs = [];

  beforeAll(async () => {
    // 1. Buat buffer gambar PNG kecil yang valid menggunakan Sharp
    validPngBuffer = await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    // 2. Pastikan tabel ticket_counters dan service_areas terisi
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_counters (
        day DATE PRIMARY KEY,
        last_no INT NOT NULL DEFAULT 0
      );
    `);

    // Pastikan batas Grobogan aktif di service_areas (hanya pasang placeholder bila tabel masih kosong)
    const areaCheck = await pool.query('SELECT COUNT(*) AS count FROM service_areas;');
    if (parseInt(areaCheck.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO service_areas (name, geom, is_active)
        VALUES (
          'Kabupaten Grobogan',
          ST_GeogFromText('SRID=4326;MULTIPOLYGON(((110.55 -7.45, 111.15 -7.45, 111.15 -6.95, 110.55 -6.95, 110.55 -7.45)))'),
          TRUE
        );
      `);
    }

    // 3. Ambil satu categoryId aktif
    const catRes = await pool.query(
      `INSERT INTO categories (name, description, is_active)
       VALUES ('Infrastruktur Jalan Uji', 'Uji coba kategori jalan', TRUE)
       ON CONFLICT (name) DO UPDATE SET is_active = TRUE
       RETURNING id;`
    );
    categoryId = catRes.rows[0].id;

    // 4. Siapkan 2 pengguna Warga untuk pengujian
    const roleRes = await pool.query("SELECT id FROM roles WHERE name = 'warga' LIMIT 1;");
    const wargaRoleId = roleRes.rows[0].id;
    const passwordHash = await bcrypt.hash('Password123!', 12);

    warga1Email = `warga1_${timestamp}@example.com`;
    const u1 = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role_id, is_active)
       VALUES ($1, $2, 'Warga Satu', $3, TRUE)
       RETURNING id;`,
      [warga1Email, passwordHash, wargaRoleId]
    );
    warga1Id = u1.rows[0].id;

    warga2Email = `warga2_${timestamp}@example.com`;
    const u2 = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role_id, is_active)
       VALUES ($1, $2, 'Warga Dua', $3, TRUE)
       RETURNING id;`,
      [warga2Email, passwordHash, wargaRoleId]
    );
    warga2Id = u2.rows[0].id;

    // Login kedua warga untuk mendapatkan token
    const login1 = await request(app).post('/api/v1/auth/login').send({
      email: warga1Email,
      password: 'Password123!',
    });
    warga1Token = login1.body.accessToken;

    const login2 = await request(app).post('/api/v1/auth/login').send({
      email: warga2Email,
      password: 'Password123!',
    });
    warga2Token = login2.body.accessToken;
  });

  afterAll(async () => {
    // 1. Bersihkan direktori foto yang dibuat selama pengujian
    for (const dir of createdComplaintDirs) {
      if (fs.existsSync(dir)) {
        try {
          fs.rmSync(dir, { recursive: true, force: true });
        } catch (e) {
          // Abaikan error penghapusan file sementara
        }
      }
    }

    // 2. Hapus data pengguna uji dari DB (akan meng-cascade atau membersihkan aduan)
    await pool.query('DELETE FROM complaints WHERE reporter_id IN ($1, $2);', [
      warga1Id,
      warga2Id,
    ]);
    if (createdComplaintIdAnon) {
      await pool.query('DELETE FROM complaints WHERE id = $1;', [createdComplaintIdAnon]);
    }
    await pool.query('DELETE FROM users WHERE id IN ($1, $2);', [warga1Id, warga2Id]);

    // 3. Lepaskan koneksi pool
    await pool.end();
  });

  describe('1. Validasi Pembantu Enkripsi AES-256-GCM', () => {
    it('harus menghasilkan ciphertext berbeda untuk input yang sama (karena IV acak) dan dekripsi bolak-balik menghasilkan teks asli', () => {
      const plaintext = JSON.stringify({ id: warga1Id, email: warga1Email });

      const c1 = cryptoHelper.encrypt(plaintext);
      const c2 = cryptoHelper.encrypt(plaintext);

      expect(Buffer.isBuffer(c1)).toBe(true);
      expect(Buffer.isBuffer(c2)).toBe(true);

      // Ciphertext biner berbeda karena IV acak (NFR-S-02)
      expect(c1.equals(c2)).toBe(false);

      // Dekripsi kedua ciphertext menghasilkan string plaintext yang sama persis
      expect(cryptoHelper.decrypt(c1)).toBe(plaintext);
      expect(cryptoHelper.decrypt(c2)).toBe(plaintext);
    });
  });

  describe('2. POST /api/v1/complaints - Validasi Koordinat & Berkas', () => {
    it('harus menolak koordinat di luar wilayah Grobogan (Semarang) dengan status 422 dan issue "out_of_service_area"', async () => {
      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${warga1Token}`)
        .field('title', 'Laporan di Semarang')
        .field('categoryId', categoryId)
        .field('description', 'Titik ini di luar Grobogan')
        .field('lat', -6.9667)
        .field('lng', 110.4203)
        .field('accuracyM', 10)
        .attach('photos', validPngBuffer, 'test.png');

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      const issue = res.body.error.details.find((d) => d.issue === 'out_of_service_area');
      expect(issue).toBeDefined();
    });

    it('harus menolak akurasi GPS > 100 meter (150m) dengan status 422 dan issue "gps_accuracy_too_low"', async () => {
      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${warga1Token}`)
        .field('title', 'Laporan Akurasi Buruk')
        .field('categoryId', categoryId)
        .field('description', 'Akurasi GPS perangkat 150 meter')
        .field('lat', -7.0881)
        .field('lng', 110.9167)
        .field('accuracyM', 150)
        .attach('photos', validPngBuffer, 'test.png');

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      const issue = res.body.error.details.find((d) => d.issue === 'gps_accuracy_too_low');
      expect(issue).toBeDefined();
    });

    it('harus menolak jika tanpa foto bukti dengan status 422', async () => {
      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${warga1Token}`)
        .field('title', 'Laporan Tanpa Foto')
        .field('categoryId', categoryId)
        .field('description', 'Tidak ada foto terlampir')
        .field('lat', -7.0881)
        .field('lng', 110.9167)
        .field('accuracyM', 10);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('harus menolak jika berkas foto lebih dari 5 (6 foto) dengan status 422', async () => {
      const req = request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${warga1Token}`)
        .field('title', 'Laporan 6 Foto')
        .field('categoryId', categoryId)
        .field('description', 'Melampirkan 6 foto')
        .field('lat', -7.0881)
        .field('lng', 110.9167)
        .field('accuracyM', 10);

      for (let i = 1; i <= 6; i++) {
        req.attach('photos', validPngBuffer, `foto${i}.png`);
      }

      const res = await req;
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('harus menolak berkas teks yang dinamai .jpg (gagal magic bytes) dengan status 422', async () => {
      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${warga1Token}`)
        .field('title', 'Laporan File Palsu')
        .field('categoryId', categoryId)
        .field('description', 'File teks menyamar .jpg')
        .field('lat', -7.0881)
        .field('lng', 110.9167)
        .field('accuracyM', 10)
        .attach('photos', fakeJpgBuffer, 'gambar_palsu.jpg');

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      const issue = res.body.error.details.find((d) => d.issue === 'invalid_image_type');
      expect(issue).toBeDefined();
    });
  });

  describe('3. POST /api/v1/complaints - Pembuatan Aduan Berhasil', () => {
    it('harus berhasil membuat aduan dari warga login di Purwodadi (status 201)', async () => {
      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${warga1Token}`)
        .field('title', 'Jalan Rusak Depan Pasar Purwodadi')
        .field('categoryId', categoryId)
        .field('description', 'Aspal berlubang cukup dalam membahayakan pengendara motor')
        .field('lat', -7.0881)
        .field('lng', 110.9167)
        .field('accuracyM', 12.5)
        .field('locationSource', 'auto')
        .attach('photos', validPngBuffer, 'jalan_rusak.png');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('ticketNo');
      expect(res.body.ticketNo).toMatch(/^CV-\d{8}-\d{4}$/);
      expect(res.body.status).toBe('baru');
      expect(res.body).toHaveProperty('createdAt');

      createdComplaintIdWarga1 = res.body.id;
      createdTicketNoWarga1 = res.body.ticketNo;

      createdComplaintDirs.push(
        path.join(config.uploadDir, 'complaints', createdComplaintIdWarga1)
      );

      // Verifikasi di database: reporter_id terisi dengan ID warga1
      const dbCheck = await pool.query(
        'SELECT reporter_id, is_anonymous, reporter_identity_enc FROM complaints WHERE id = $1;',
        [createdComplaintIdWarga1]
      );
      expect(dbCheck.rows[0].reporter_id).toBe(warga1Id);
      expect(dbCheck.rows[0].is_anonymous).toBe(false);
      expect(dbCheck.rows[0].reporter_identity_enc).toBeNull();
    });

    it('harus berhasil membuat aduan tanpa token (anonim), dan respons tidak memuat identitas', async () => {
      const res = await request(app)
        .post('/api/v1/complaints')
        // Tanpa Authorization header
        .field('title', 'Lampu PJU Padam')
        .field('categoryId', categoryId)
        .field('description', 'Lampu penerangan padam sejak semalam')
        .field('lat', -7.0881)
        .field('lng', 110.9167)
        .field('accuracyM', 20)
        .attach('photos', validPngBuffer, 'pju_padam.png');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('ticketNo');
      expect(res.body.status).toBe('baru');
      // Respons tidak boleh memuat identitas apa pun
      expect(res.body).not.toHaveProperty('reporterId');
      expect(res.body).not.toHaveProperty('reporter_id');
      expect(res.body).not.toHaveProperty('email');

      createdComplaintIdAnon = res.body.id;
      createdTicketNoAnon = res.body.ticketNo;

      createdComplaintDirs.push(
        path.join(config.uploadDir, 'complaints', createdComplaintIdAnon)
      );

      // Verifikasi di database: reporter_id NULL dan is_anonymous = true
      const dbCheck = await pool.query(
        'SELECT reporter_id, is_anonymous, reporter_identity_enc FROM complaints WHERE id = $1;',
        [createdComplaintIdAnon]
      );
      expect(dbCheck.rows[0].reporter_id).toBeNull();
      expect(dbCheck.rows[0].is_anonymous).toBe(true);
      expect(dbCheck.rows[0].reporter_identity_enc).toBeNull();
    });
  });

  describe('4. GET /api/v1/complaints/mine', () => {
    it('harus hanya mengembalikan daftar aduan milik pengguna itu sendiri', async () => {
      // Warga 1 meminta daftar aduannya
      const res = await request(app)
        .get('/api/v1/complaints/mine')
        .set('Authorization', `Bearer ${warga1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Pastikan aduan warga 1 ada di daftar
      const found = res.body.data.find((c) => c.id === createdComplaintIdWarga1);
      expect(found).toBeDefined();

      // Warga 2 meminta daftar aduannya (belum pernah membuat aduan)
      const res2 = await request(app)
        .get('/api/v1/complaints/mine')
        .set('Authorization', `Bearer ${warga2Token}`);

      expect(res2.status).toBe(200);
      expect(res2.body.data.length).toBe(0);
    });
  });

  describe('5. GET /api/v1/complaints/track/:ticketNo (Publik)', () => {
    it('harus mengembalikan nomor tiket, status, riwayat status, dan TIDAK memuat identitas pelapor', async () => {
      const res = await request(app).get(
        `/api/v1/complaints/track/${createdTicketNoWarga1}`
      );

      expect(res.status).toBe(200);
      expect(res.body.ticketNo).toBe(createdTicketNoWarga1);
      expect(res.body.status).toBe('baru');
      expect(Array.isArray(res.body.history)).toBe(true);
      expect(res.body.history.length).toBeGreaterThanOrEqual(1);
      expect(res.body.history[0].status).toBe('baru');

      // Pastikan tidak ada identitas pelapor yang bocor
      expect(res.body).not.toHaveProperty('reporter_id');
      expect(res.body).not.toHaveProperty('reporterId');
      expect(res.body).not.toHaveProperty('reporterIdentity');
      expect(res.body).not.toHaveProperty('email');
    });

    it('harus mengembalikan 404 jika nomor tiket tidak terdaftar', async () => {
      const res = await request(app).get('/api/v1/complaints/track/CV-99999999-9999');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('6. GET /api/v1/complaints/:id - Kontrol Akses Detail', () => {
    it('harus berhasil mengembalikan detail aduan bagi pemilik aslinya (Warga 1)', async () => {
      const res = await request(app)
        .get(`/api/v1/complaints/${createdComplaintIdWarga1}`)
        .set('Authorization', `Bearer ${warga1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdComplaintIdWarga1);
      expect(res.body.ticketNo).toBe(createdTicketNoWarga1);
      expect(res.body.location).toHaveProperty('lat');
      expect(res.body.location).toHaveProperty('lng');
      expect(Array.isArray(res.body.photos)).toBe(true);
      expect(res.body.photos.length).toBe(1);
      expect(res.body.photos[0]).toMatch(/^\/uploads\/complaints\//);
    });

    it('harus menolak warga lain (Warga 2) dengan status 403 saat membuka aduan milik Warga 1', async () => {
      const res = await request(app)
        .get(`/api/v1/complaints/${createdComplaintIdWarga1}`)
        .set('Authorization', `Bearer ${warga2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
