const express = require('express');
const { authenticate, authorize } = require('../../common/middleware');
const triageController = require('./controller');

const router = express.Router();

/**
 * GET /triage/queue
 * Antrean triase aduan baru untuk petugas Operator dan Administrator.
 * Diproteksi ketat menggunakan RBAC: hanya peran 'operator' dan 'admin' yang diizinkan.
 */
router.get(
  '/queue',
  authenticate,
  authorize('operator', 'admin'),
  triageController.getTriageQueue
);

module.exports = router;
