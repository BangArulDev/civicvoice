const express = require('express');
const { authenticate, authorize } = require('../../common/middleware');
const adminController = require('./controller');

const router = express.Router();

// Seluruh endpoint di bawah ini diproteksi ketat: wajib login dan memiliki peran 'admin'
router.use(authenticate, authorize('admin'));

router.get('/users', adminController.listUsers);
router.get('/audit-logs', adminController.listAuditLogs);

module.exports = router;
