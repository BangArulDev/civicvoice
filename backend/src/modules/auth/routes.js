const express = require('express');
const rateLimit = require('express-rate-limit');
const config = require('../../common/config');
const { authenticate } = require('../../common/middleware');
const authController = require('./controller');

const router = express.Router();

// Rate limiter khusus endpoint autentikasi (login & register)
// Maksimal 10 percobaan per 15 menit per IP (dikecualikan saat mode testing)
const authLimiter =
  config.env === 'test'
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: config.rateLimit.windowMs,
        max: config.rateLimit.authMax,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Terlalu banyak percobaan autentikasi dari IP ini. Silakan coba lagi setelah 15 menit.',
            details: [],
          },
        },
      });

// Rute Autentikasi Publik
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);

// Rute Terproteksi (Wajib Login)
router.get('/me', authenticate, authController.getMe);

module.exports = router;
