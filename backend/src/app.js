const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./common/config');
const { errorHandler, notFound } = require('./common/middleware');
const pool = require('./db/pool');

const app = express();

// 1. Keamanan Header HTTP
app.use(helmet());

// 2. Akses Lintas Domain (CORS)
app.use(cors());

// 3. Parsing Request Body (JSON & URL-Encoded) dengan batas ukuran aman (10 MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Pembatasan Laju Permintaan (Rate Limiter)
// Dikecualikan saat mode test agar tidak menghambat pengujian otomatis
if (config.env !== 'test') {
  const generalLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Melebihi batas permintaan, silakan coba lagi beberapa saat lagi',
        details: [],
      },
    },
  });
  app.use(generalLimiter);
}

// 5. Router API dengan Prefix /api/v1
const apiV1Router = express.Router();

/**
 * GET /api/v1/health
 * Memeriksa status kesehatan server dan koneksi PostgreSQL + PostGIS.
 */
apiV1Router.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT PostGIS_Version();');
    const postgisVersion =
      result.rows[0]?.postgis_version || Object.values(result.rows[0] || {})[0] || 'terpasang';

    return res.status(200).json({
      status: 'ok',
      db: true,
      postgis: postgisVersion,
    });
  } catch (error) {
    console.error('[HEALTH CHECK FAILED] Gagal menghubungi database:', error.message);
    return res.status(503).json({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Basis data tidak dapat diakses',
        details: [],
      },
    });
  }
});

// Daftarkan router utama dengan prefix /api/v1
app.use('/api/v1', apiV1Router);

// 6. Penanganan Rute Tidak Ditemukan (404) & Global Error Handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;
