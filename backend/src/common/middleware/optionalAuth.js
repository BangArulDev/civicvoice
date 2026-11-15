const jwt = require('jsonwebtoken');
const config = require('../config');
const { unauthorized } = require('../errors');
const pool = require('../../db/pool');

/**
 * Middleware autentikasi opsional:
 * - Jika tidak ada header Authorization, req.user disetel null dan proses dilanjutkan (untuk aduan anonim).
 * - Jika header Authorization disertakan, token wajib valid (jika token rusak/kedaluwarsa, tetap kembalikan 401).
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      req.user = null;
      return next();
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw unauthorized('Token tidak ada, tidak valid, atau kedaluwarsa');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw unauthorized('Token tidak ada, tidak valid, atau kedaluwarsa');
    }

    let payload;
    try {
      payload = jwt.verify(token, config.jwt.accessSecret);
    } catch (jwtErr) {
      throw unauthorized('Token tidak ada, tidak valid, atau kedaluwarsa');
    }

    const query = `
      SELECT u.id, u.email, u.full_name, r.name AS role, u.skpd_id, u.is_active
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1 AND u.is_active = TRUE
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [payload.sub]);
    if (rows.length === 0) {
      throw unauthorized('Pengguna tidak ditemukan atau telah dinonaktifkan');
    }

    const user = rows[0];
    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      skpdId: user.skpd_id,
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = optionalAuth;
