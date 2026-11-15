const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const config = require('../../common/config');
const { authenticate, optionalAuth, authorize } = require('../../common/middleware');
const complaintController = require('./controller');

const router = express.Router();

// 1. Konfigurasi Multer (Penyimpanan memori sementara, batas 5 MB per berkas)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 10, // Izinkan hingga 10 berkas agar service dapat memvalidasi "maks 5 foto" dengan respons 422
  },
});

// 2. Pembatas Laju Permintaan (Rate Limiter Khusus Buat Aduan)
// Maksimal 5 aduan per jam per pengguna (jika login) atau per alamat IP (jika anonim)
const complaintRateLimiter =
  config.env === 'test'
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 60 * 60 * 1000, // 1 jam
        max: config.rateLimit.complaintMax || 5,
        keyGenerator: (req) => {
          return req.user ? `user_${req.user.id}` : req.ip || 'ip_unknown';
        },
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Melebihi batas maksimal 5 aduan per jam',
            details: [],
          },
        },
      });

// Wrapper middleware untuk menangani potensi error multer (misal ukuran berkas > 5 MB)
function handleUpload(req, res, next) {
  upload.array('photos', 10)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Ukuran berkas foto melebihi batas maksimal 5 MB',
            details: [{ field: 'photos', issue: 'file_too_large' }],
          },
        });
      }
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message,
          details: [{ field: 'photos', issue: err.code.toLowerCase() }],
        },
      });
    } else if (err) {
      return next(err);
    }
    next();
  });
}

// -----------------------------------------------------------------------------
// Definisi Rute Aduan (Complaints)
// -----------------------------------------------------------------------------

// POST /complaints: Buat aduan baru (opsional login; anonim jika tanpa token)
router.post(
  '/',
  optionalAuth,
  complaintRateLimiter,
  handleUpload,
  complaintController.createComplaint
);

// GET /complaints/mine: Daftar aduan milik sendiri (khusus warga)
router.get('/mine', authenticate, authorize('warga'), complaintController.listMyComplaints);

// GET /complaints/track/:ticketNo: Lacak status aduan (akses publik tanpa autentikasi)
router.get('/track/:ticketNo', complaintController.trackComplaint);

// GET /complaints/:id: Detail aduan (warga pemilik, operator, atau admin)
router.get('/:id', authenticate, complaintController.getComplaintById);

module.exports = router;
