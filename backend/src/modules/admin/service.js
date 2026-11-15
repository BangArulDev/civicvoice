const adminRepository = require('./repository');

function formatUser(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    skpdId: row.skpd_id || null,
    isActive: row.is_active,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function formatAuditLog(row) {
  return {
    id: parseInt(row.id, 10),
    userId: row.user_id || null,
    action: row.action,
    entity: row.entity || null,
    entityId: row.entity_id || null,
    ip: row.ip || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

async function listUsers({ page = 1, limit = 20, role = null }) {
  const result = await adminRepository.listUsers({ page, limit, role });
  return {
    data: result.rows.map(formatUser),
    page,
    limit,
    total: result.total,
  };
}

async function listAuditLogs({ page = 1, limit = 20, action = null }) {
  const result = await adminRepository.listAuditLogs({ page, limit, action });
  return {
    data: result.rows.map(formatAuditLog),
    page,
    limit,
    total: result.total,
  };
}

module.exports = {
  listUsers,
  listAuditLogs,
};
