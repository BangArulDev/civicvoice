const adminService = require('./service');

async function listUsers(req, res, next) {
  try {
    let page = parseInt(req.query.page, 10);
    if (isNaN(page) || page < 1) page = 1;

    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    const role = req.query.role || null;

    const result = await adminService.listUsers({ page, limit, role });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function listAuditLogs(req, res, next) {
  try {
    let page = parseInt(req.query.page, 10);
    if (isNaN(page) || page < 1) page = 1;

    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    const action = req.query.action || null;

    const result = await adminService.listAuditLogs({ page, limit, action });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
  listAuditLogs,
};
