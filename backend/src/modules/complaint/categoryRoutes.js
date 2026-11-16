const express = require('express');
const complaintController = require('./controller');

const router = express.Router();

/**
 * GET /categories
 * Endpoint publik untuk mengambil daftar kategori aduan aktif.
 * Diurutkan berdasarkan nama (ASC) untuk kebutuhan dropdown formulir pelaporan warga.
 */
router.get('/', complaintController.listCategories);

module.exports = router;
