const pool = require('../../db/pool');

async function listUsers({ page = 1, limit = 20, role = null }) {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (role) {
    conditions.push(`r.name = $${paramIndex}`);
    params.push(role);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Hitung total baris
  const countQuery = `
    SELECT COUNT(*) AS total
    FROM users u
    JOIN roles r ON u.role_id = r.id
    ${whereClause};
  `;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].total, 10);

  // Ambil data dengan pagination
  const dataQuery = `
    SELECT u.id, u.email, u.full_name, r.name AS role, u.skpd_id, u.is_active, u.created_at
    FROM users u
    JOIN roles r ON u.role_id = r.id
    ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;
  params.push(limit, offset);

  const { rows } = await pool.query(dataQuery, params);

  return {
    rows,
    total,
  };
}

async function listAuditLogs({ page = 1, limit = 20, action = null }) {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (action) {
    conditions.push(`action = $${paramIndex}`);
    params.push(action);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM audit_logs
    ${whereClause};
  `;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].total, 10);

  const dataQuery = `
    SELECT id, user_id, action, entity, entity_id, ip, created_at
    FROM audit_logs
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;
  params.push(limit, offset);

  const { rows } = await pool.query(dataQuery, params);

  return {
    rows,
    total,
  };
}

module.exports = {
  listUsers,
  listAuditLogs,
};
