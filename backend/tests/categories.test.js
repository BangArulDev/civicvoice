const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db/pool');

describe('Categories & Frontend Preparation Integration Tests', () => {
  beforeAll(async () => {
    // Pastikan minimal 4 kategori hasil seed tersedia di basis data
    await pool.query(`
      INSERT INTO categories (name, description, is_active)
      VALUES
        ('Jalan Rusak', 'Laporan jalan berlubang', TRUE),
        ('Sampah Menumpuk', 'Laporan tempat pembuangan sampah liar', TRUE),
        ('Lampu Penerangan Mati', 'Laporan LPJU mati', TRUE),
        ('Ketertiban/Parkir Liar', 'Laporan pelanggaran ketertiban', TRUE)
      ON CONFLICT (name) DO UPDATE SET is_active = TRUE;
    `);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('GET /api/v1/categories', () => {
    it('harus mengembalikan status 200 dengan format {"data": [...]} dan minimal 4 kategori', async () => {
      const res = await request(app).get('/api/v1/categories');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);

      // Setiap item wajib memiliki properti 'id' dan 'name'
      res.body.data.forEach((item) => {
        expect(item).toHaveProperty('id');
        expect(typeof item.id).toBe('number');
        expect(item).toHaveProperty('name');
        expect(typeof item.name).toBe('string');
        expect(item.name.length).toBeGreaterThan(0);
      });
    });

    it('harus mengembalikan daftar kategori yang diurutkan menurut nama secara ascending', async () => {
      const res = await request(app).get('/api/v1/categories');

      expect(res.status).toBe(200);
      const data = res.body.data;

      for (let i = 0; i < data.length - 1; i++) {
        const currentName = data[i].name;
        const nextName = data[i + 1].name;
        expect(currentName.localeCompare(nextName)).toBeLessThanOrEqual(0);
      }
    });

    it('harus mengizinkan akses CORS dari origin yang dikonfigurasi (http://localhost:3001)', async () => {
      const res = await request(app)
        .get('/api/v1/categories')
        .set('Origin', 'http://localhost:3001');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3001');
    });
  });

  describe('CORS & Cross-Origin-Resource-Policy Headers', () => {
    it('harus menyertakan header Cross-Origin-Resource-Policy: cross-origin KHUSUS pada route /uploads', async () => {
      const res = await request(app).get('/uploads/test-cors-check.jpg');

      // Meskipun file tidak ditemukan (404), header CORP tetap harus cross-origin
      expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('harus tetap menjaga header default same-origin dari helmet pada route API biasa', async () => {
      const res = await request(app).get('/api/v1/categories');

      // Pada route selain /uploads, CORP default helmet tetap same-origin demi keamanan
      expect(res.headers['cross-origin-resource-policy']).toBe('same-origin');
    });
  });
});
