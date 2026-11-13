const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db/pool');

describe('Health and System Endpoints', () => {
  afterAll(async () => {
    // Melepaskan koneksi pool database agar runner Jest dapat berhenti dengan bersih
    await pool.end();
  });

  describe('GET /api/v1/health', () => {
    it('harus mengembalikan status 200, status "ok", db true, dan versi PostGIS', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('db', true);
      expect(response.body).toHaveProperty('postgis');
      expect(typeof response.body.postgis).toBe('string');
      expect(response.body.postgis.length).toBeGreaterThan(0);
    });
  });

  describe('Route Not Found Handler (404)', () => {
    it('harus mengembalikan status 404 dengan format error seragam untuk rute yang tidak terdaftar', async () => {
      const response = await request(app).get('/api/v1/rute-palsu-yang-tidak-ada');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatchObject({
        code: 'NOT_FOUND',
      });
      expect(typeof response.body.error.message).toBe('string');
      expect(Array.isArray(response.body.error.details)).toBe(true);
    });
  });
});
