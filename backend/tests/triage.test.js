const fs = require('fs');
const path = require('path');
const request = require('supertest');
const sharp = require('sharp');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const pool = require('../src/db/pool');
const config = require('../src/common/config');

describe('M2 Triage Queue Module Integration Tests', () => {
  const timestamp = Date.now();
  let validPngBuffer;

  let categoryId;
  let operatorToken;
  let operatorUserId;
  let wargaToken;
  let wargaUserId;

  let complaint1Id;
  let complaint2Id;
  let complaint3Id;
  const createdComplaintDirs = [];

  beforeAll(async () => {
    // 1. Buat buffer gambar PNG kecil yang valid
    validPngBuffer = await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 3,
        background: { r: 0, g: 128, b: 255 },
      },
    })
      .png()
      .toBuffer();

    // 2. Siapkan peran, wilayah layanan, dan kategori
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_counters (
        day DATE PRIMARY KEY,
        last_no INT NOT NULL DEFAULT 0
      );
    `);

    await pool.query(`
      INSERT INTO service_areas (name, geom, is_active)
      VALUES (
        'Kabupaten Grobogan',
        ST_GeogFromText('SRID=4326;MULTIPOLYGON(((110.55 -7.45, 111.15 -7.45, 111.15 -6.95, 110.55 -6.95, 110.55 -7.45)))'),
        TRUE
      )
      ON CONFLICT DO NOTHING;
    `);

    // Pastikan ada dinas SKPD dan kategori terhubung
    const skpdRes = await pool.query(`
      INSERT INTO skpd (name, code, description)
      VALUES ('Dinas Triase Tester', 'DTT', 'SKPD Uji Triase')
      ON CONFLICT (name) DO UPDATE SET is_active = TRUE
      RETURNING id;
    `);
    const testSkpdId = skpdRes.rows[0].id;

    const catRes = await pool.query(
      `INSERT INTO categories (name, description, is_active)
       VALUES ('Kategori Triase Uji', 'Deskripsi Kategori Triase', TRUE)
       ON CONFLICT (name) DO UPDATE SET is_active = TRUE
       RETURNING id;`
    );
    categoryId = catRes.rows[0].id;

    await pool.query(
      `INSERT INTO category_skpd (category_id, skpd_id, is_primary)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (category_id, skpd_id) DO NOTHING;`,
      [categoryId, testSkpdId]
    );

    // 3. Buat akun Operator dan Warga untuk pengujian RBAC
    const opRole = await pool.query("SELECT id FROM roles WHERE name = 'operator' LIMIT 1;");
    const wgRole = await pool.query("SELECT id FROM roles WHERE name = 'warga' LIMIT 1;");

    const passHash = await bcrypt.hash('Password123!', 12);

    const opUser = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role_id, is_active)
       VALUES ($1, $2, 'Operator Triase', $3, TRUE)
       RETURNING id;`,
      [`operator_${timestamp}@civicvoice.grobo.go.id`, passHash, opRole.rows[0].id]
    );
    operatorUserId = opUser.rows[0].id;

    const wgUser = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role_id, is_active)
       VALUES ($1, $2, 'Warga Biasa', $3, TRUE)
       RETURNING id;`,
      [`warga_triase_${timestamp}@example.com`, passHash, wgRole.rows[0].id]
    );
    wargaUserId = wgUser.rows[0].id;

    // Login untuk mendapatkan token autentikasi
    const opLogin = await request(app).post('/api/v1/auth/login').send({
      email: `operator_${timestamp}@civicvoice.grobo.go.id`,
      password: 'Password123!',
    });
    operatorToken = opLogin.body.accessToken;

    const wgLogin = await request(app).post('/api/v1/auth/login').send({
      email: `warga_triase_${timestamp}@example.com`,
      password: 'Password123!',
    });
    wargaToken = wgLogin.body.accessToken;

    // 4. Buat 3 aduan secara berurutan melalui API
    // Aduan 1 (tertua)
    const c1 = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${wargaToken}`)
      .field('title', 'Aduan Triase 1 - Tertua')
      .field('categoryId', categoryId)
      .field('description', 'Aduan pertama untuk triase')
      .field('lat', -7.0881)
      .field('lng', 110.9167)
      .attach('photos', validPngBuffer, 'foto1.png');
    complaint1Id = c1.body.id;
    createdComplaintDirs.push(path.join(config.uploadDir, 'complaints', complaint1Id));

    // Jeda sejenak untuk memastikan perbedaan stempel waktu created_at
    await new Promise((r) => setTimeout(r, 20));

    // Aduan 2 (tengah)
    const c2 = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${wargaToken}`)
      .field('title', 'Aduan Triase 2 - Yang Akan Diverifikasi')
      .field('categoryId', categoryId)
      .field('description', 'Aduan kedua')
      .field('lat', -7.0881)
      .field('lng', 110.9167)
      .attach('photos', validPngBuffer, 'foto2.png');
    complaint2Id = c2.body.id;
    createdComplaintDirs.push(path.join(config.uploadDir, 'complaints', complaint2Id));

    await new Promise((r) => setTimeout(r, 20));

    // Aduan 3 (terbaru)
    const c3 = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${wargaToken}`)
      .field('title', 'Aduan Triase 3 - Terbaru')
      .field('categoryId', categoryId)
      .field('description', 'Aduan ketiga')
      .field('lat', -7.0881)
      .field('lng', 110.9167)
      .attach('photos', validPngBuffer, 'foto3.png');
    complaint3Id = c3.body.id;
    createdComplaintDirs.push(path.join(config.uploadDir, 'complaints', complaint3Id));

    // 5. Ubah status Aduan 2 menjadi 'diverifikasi' langsung lewat SQL di basis data
    await pool.query("UPDATE complaints SET status = 'diverifikasi' WHERE id = $1;", [
      complaint2Id,
    ]);
  });

  afterAll(async () => {
    // Bersihkan berkas foto
    for (const dir of createdComplaintDirs) {
      if (fs.existsSync(dir)) {
        try {
          fs.rmSync(dir, { recursive: true, force: true });
        } catch (e) {}
      }
    }

    // Bersihkan database
    await pool.query('DELETE FROM complaints WHERE id IN ($1, $2, $3);', [
      complaint1Id,
      complaint2Id,
      complaint3Id,
    ]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2);', [operatorUserId, wargaUserId]);

    await pool.end();
  });

  describe('1. Kontrol Akses RBAC (GET /api/v1/triage/queue)', () => {
    it('harus menolak request tanpa token dengan status 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/triage/queue');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('harus menolak request dari peran warga dengan status 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/triage/queue')
        .set('Authorization', `Bearer ${wargaToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('harus mengizinkan request dari peran operator dengan status 200 OK', async () => {
      const res = await request(app)
        .get('/api/v1/triage/queue')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('page', 1);
      expect(res.body).toHaveProperty('limit', 20);
      expect(res.body).toHaveProperty('total');
    });
  });

  describe('2. Filter Status & Urutan Antrean FIFO', () => {
    it('harus hanya menampilkan aduan berstatus "baru" (Aduan 2 yang berstatus "diverifikasi" tidak boleh muncul)', async () => {
      const res = await request(app)
        .get('/api/v1/triage/queue')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(200);

      const items = res.body.data;
      // Pastikan semua item berstatus 'baru'
      items.forEach((item) => {
        expect(item.status).toBe('baru');
      });

      // Aduan 2 tidak boleh ada dalam antrean
      const foundAduan2 = items.find((item) => item.id === complaint2Id);
      expect(foundAduan2).toBeUndefined();

      // Aduan 1 dan 3 harus ada dalam antrean
      const foundAduan1 = items.find((item) => item.id === complaint1Id);
      const foundAduan3 = items.find((item) => item.id === complaint3Id);
      expect(foundAduan1).toBeDefined();
      expect(foundAduan3).toBeDefined();

      // Urutan antrean harus FIFO (Aduan 1 lebih dulu daripada Aduan 3)
      const idx1 = items.findIndex((i) => i.id === complaint1Id);
      const idx3 = items.findIndex((i) => i.id === complaint3Id);
      expect(idx1).toBeLessThan(idx3);
    });

    it('harus menjalankan paginasi (page & limit) dengan benar', async () => {
      // Ambil page=1 limit=1
      const resPage1 = await request(app)
        .get('/api/v1/triage/queue?page=1&limit=1')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(resPage1.status).toBe(200);
      expect(resPage1.body.data.length).toBe(1);
      expect(resPage1.body.page).toBe(1);
      expect(resPage1.body.limit).toBe(1);

      // Ambil page=2 limit=1
      const resPage2 = await request(app)
        .get('/api/v1/triage/queue?page=2&limit=1')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(resPage2.status).toBe(200);
      expect(resPage2.body.data.length).toBe(1);
      expect(resPage2.body.page).toBe(2);

      // Item di page 1 dan page 2 tidak boleh sama
      expect(resPage1.body.data[0].id).not.toBe(resPage2.body.data[0].id);
    });
  });

  describe('3. Struktur Data & Kerahasiaan Identitas Pelapor', () => {
    it('harus memuat seluruh atribut yang ditentukan tanpa membocorkan identitas pelapor', async () => {
      const res = await request(app)
        .get('/api/v1/triage/queue')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(200);
      const target = res.body.data.find((item) => item.id === complaint1Id);
      expect(target).toBeDefined();

      // Atribut yang wajib ada
      expect(target).toHaveProperty('id');
      expect(target).toHaveProperty('ticketNo');
      expect(target).toHaveProperty('title');
      expect(target).toHaveProperty('category');
      expect(target).toHaveProperty('categoryId');
      expect(target).toHaveProperty('priority');
      expect(target).toHaveProperty('status', 'baru');
      expect(target).toHaveProperty('location');
      expect(target.location).toHaveProperty('lat');
      expect(target.location).toHaveProperty('lng');
      expect(target).toHaveProperty('thumbnailUrl');
      expect(target.thumbnailUrl).toMatch(/_thumb\.jpg$/);
      expect(target).toHaveProperty('suggestedSkpdId');
      expect(target).toHaveProperty('suggestedSkpdName');
      expect(target).toHaveProperty('createdAt');

      // VERIFIKASI KEAMANAN PRIVASI: Tidak boleh ada data pelapor apa pun
      expect(target).not.toHaveProperty('reporter_id');
      expect(target).not.toHaveProperty('reporterId');
      expect(target).not.toHaveProperty('reporter');
      expect(target).not.toHaveProperty('email');
      expect(target).not.toHaveProperty('fullName');
      expect(target).not.toHaveProperty('reporter_identity_enc');
    });
  });
});
