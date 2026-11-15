const jwt = require('jsonwebtoken');
const config = require('../config');
const { unauthorized } = require('../errors');
const pool = require('../../db/pool');

/**
 * Middleware untuk memvalidasi JWT Access Token di header Authorization.
 * Format header yang diharapkan: Authorization: Bearer <token>
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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

    // Pastikan user masih ada dan aktif di basis data
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

module.exports = authenticate;
