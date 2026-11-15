const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const pool = require('../src/db/pool');

describe('Auth & RBAC Module Integration Tests', () => {
  const timestamp = Date.now();
  const testWargaEmail = `warga_test_${timestamp}@example.com`;
  const testWargaPassword = 'PasswordWarga123!';
  const testWargaName = 'Warga Pengujian Jest';

  let testAdminEmail;
  let testAdminPassword;
  let wargaAccessToken;
  let wargaRefreshToken;
  let adminAccessToken;

  beforeAll(async () => {
    // 1. Pastikan peran 'admin' dan 'warga' ada di basis data
    await pool.query(`
      INSERT INTO roles (name, description) VALUES
      ('admin', 'Administrator'),
      ('warga', 'Warga')
      ON CONFLICT (name) DO NOTHING;
    `);

    // 2. Siapkan pengguna dengan peran 'admin' untuk pengujian RBAC
    testAdminEmail = `admin_test_${timestamp}@example.com`;
    testAdminPassword = 'PasswordAdmin123!';
    const adminHash = await bcrypt.hash(testAdminPassword, 12);

    const adminRoleRes = await pool.query("SELECT id FROM roles WHERE name = 'admin' LIMIT 1;");
    const adminRoleId = adminRoleRes.rows[0].id;

    await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role_id, is_active)
       VALUES ($1, $2, 'Admin Tester', $3, TRUE)
       ON CONFLICT (email) DO NOTHING;`,
      [testAdminEmail, adminHash, adminRoleId]
    );

    // Ambil token admin
    const adminLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: testAdminEmail,
      password: testAdminPassword,
    });
    adminAccessToken = adminLoginRes.body.accessToken;
  });

  afterAll(async () => {
    // Bersihkan pengguna pengujian agar tidak meninggalkan sampah data
    await pool.query('DELETE FROM users WHERE email IN ($1, $2);', [
      testWargaEmail,
      testAdminEmail,
    ]);
    // Lepaskan koneksi pool
    await pool.end();
  });

  describe('POST /api/v1/auth/register', () => {
    it('harus berhasil mendaftarkan warga baru dengan status 201', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: testWargaEmail,
        password: testWargaPassword,
        fullName: testWargaName,
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(testWargaEmail);
      expect(res.body.fullName).toBe(testWargaName);
      expect(res.body.role).toBe('warga');
      expect(res.body.isActive).toBe(true);
      expect(res.body).toHaveProperty('createdAt');
      // Pastikan password_hash tidak pernah dibocorkan ke respons klien
      expect(res.body).not.toHaveProperty('password_hash');
      expect(res.body).not.toHaveProperty('password');
    });

    it('harus mengembalikan status 409 jika email sudah terdaftar', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: testWargaEmail, // Menggunakan email yang sama
        password: 'PasswordBaru999!',
        fullName: 'Percobaan Duplikat',
      });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toMatch(/sudah terdaftar/i);
    });

    it('harus mengembalikan status 422 jika password kurang dari 8 karakter', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: `short_pass_${timestamp}@example.com`,
        password: '123',
        fullName: 'User Pendek',
      });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('harus berhasil login dan mengembalikan accessToken serta refreshToken (200)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testWargaEmail,
        password: testWargaPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.tokenType).toBe('Bearer');
      expect(res.body.expiresIn).toBe(900);

      // Simpan token untuk pengujian tahap berikutnya
      wargaAccessToken = res.body.accessToken;
      wargaRefreshToken = res.body.refreshToken;
    });

    it('harus mengembalikan status 401 jika kata sandi salah', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testWargaEmail,
        password: 'PasswordYangPastiSalah999!',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toMatch(/tidak valid/i);
    });

    it('harus mengembalikan status 401 jika email tidak terdaftar (pesan tetap generik)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: `email_tidak_ada_${timestamp}@example.com`,
        password: testWargaPassword,
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      // Pesan error sama persis dengan kegagalan password salah agar tidak membocorkan keberadaan akun
      expect(res.body.error.message).toMatch(/tidak valid/i);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('harus mengembalikan status 401 jika diakses tanpa token', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('harus mengembalikan profil pengguna (200) jika diakses dengan token yang valid', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${wargaAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(testWargaEmail);
      expect(res.body.fullName).toBe(testWargaName);
      expect(res.body.role).toBe('warga');
      expect(res.body.isActive).toBe(true);
    });
  });

  describe('POST /api/v1/auth/refresh (Rotasi Refresh Token)', () => {
    let newRefreshToken;

    it('harus berhasil menerbitkan token baru dan mencabut token lama (200)', async () => {
      const res = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: wargaRefreshToken,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.refreshToken).not.toBe(wargaRefreshToken);

      newRefreshToken = res.body.refreshToken;
    });

    it('harus menolak (401) jika token lama yang sudah dicabut digunakan kembali', async () => {
      // Mengirim ulang wargaRefreshToken yang seharusnya sudah dicabut saat rotasi
      const res = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: wargaRefreshToken,
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('harus berhasil melakukan refresh kembali menggunakan token hasil rotasi yang baru', async () => {
      const res = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: newRefreshToken,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
    });
  });

  describe('RBAC Authorization (/api/v1/admin/users)', () => {
    it('harus menolak akses dengan status 403 Forbidden jika pengguna memiliki peran "warga"', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${wargaAccessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('harus mengizinkan akses dengan status 200 OK jika pengguna memiliki peran "admin"', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('page', 1);
      expect(res.body).toHaveProperty('limit');
      expect(res.body).toHaveProperty('total');
      expect(typeof res.body.total).toBe('number');
    });
  });
});
