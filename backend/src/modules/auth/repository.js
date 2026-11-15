const pool = require('../../db/pool');

async function findUserByEmail(email) {
  const query = `
    SELECT u.id, u.email, u.password_hash, u.full_name, u.role_id, r.name AS role, u.skpd_id, u.is_active, u.created_at
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE LOWER(u.email) = LOWER($1)
    LIMIT 1;
  `;
  const { rows } = await pool.query(query, [email]);
  return rows[0] || null;
}

async function findUserById(id) {
  const query = `
    SELECT u.id, u.email, u.full_name, u.role_id, r.name AS role, u.skpd_id, u.is_active, u.created_at
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = $1
    LIMIT 1;
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function findRoleIdByName(name) {
  const query = `SELECT id FROM roles WHERE name = $1 LIMIT 1;`;
  const { rows } = await pool.query(query, [name]);
  return rows[0] ? rows[0].id : null;
}

async function createUser({ email, passwordHash, fullName, roleId }) {
  const query = `
    INSERT INTO users (email, password_hash, full_name, role_id, is_active)
    VALUES ($1, $2, $3, $4, TRUE)
    RETURNING id, email, full_name, role_id, skpd_id, is_active, created_at;
  `;
  const { rows } = await pool.query(query, [email, passwordHash, fullName, roleId]);
  return rows[0];
}

async function createRefreshToken({ userId, tokenHash, expiresAt }) {
  const query = `
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES ($1, $2, $3)
    RETURNING id, user_id, token_hash, expires_at, created_at;
  `;
  const { rows } = await pool.query(query, [userId, tokenHash, expiresAt]);
  return rows[0];
}

async function findRefreshTokenByHash(tokenHash) {
  const query = `
    SELECT id, user_id, token_hash, expires_at, revoked_at, created_at
    FROM refresh_tokens
    WHERE token_hash = $1
    LIMIT 1;
  `;
  const { rows } = await pool.query(query, [tokenHash]);
  return rows[0] || null;
}

async function revokeRefreshToken(id) {
  const query = `
    UPDATE refresh_tokens
    SET revoked_at = now()
    WHERE id = $1
    RETURNING id, revoked_at;
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function createAuditLog({ userId, action, entity, entityId, ip }) {
  const query = `
    INSERT INTO audit_logs (user_id, action, entity, entity_id, ip)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, created_at;
  `;
  const { rows } = await pool.query(query, [
    userId || null,
    action,
    entity || null,
    entityId || null,
    ip || null,
  ]);
  return rows[0];
}

module.exports = {
  findUserByEmail,
  findUserById,
  findRoleIdByName,
  createUser,
  createRefreshToken,
  findRefreshTokenByHash,
  revokeRefreshToken,
  createAuditLog,
};
