const { forbidden } = require('../errors');

/**
 * Middleware Otorisasi RBAC (Role-Based Access Control).
 * Memeriksa apakah req.user memiliki salah satu peran yang diizinkan.
 * Contoh pemakaian: authorize('admin'), authorize('operator', 'skpd')
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(
        forbidden(
          `Peran '${req.user ? req.user.role : 'tamu'}' tidak memiliki izin untuk mengakses sumber daya ini`
        )
      );
    }
    next();
  };
}

module.exports = authorize;
