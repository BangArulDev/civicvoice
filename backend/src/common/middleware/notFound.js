const { notFound } = require('../errors');

/**
 * Middleware untuk menangani rute yang tidak ditemukan (404)
 */
function notFoundHandler(req, res, next) {
  next(notFound(`Rute ${req.method} ${req.originalUrl} tidak ditemukan`));
}

module.exports = notFoundHandler;
