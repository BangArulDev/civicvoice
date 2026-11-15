const { createComplaintSchema, listMyComplaintsQuerySchema } = require('./schema');
const complaintService = require('./service');

async function createComplaint(req, res, next) {
  try {
    const validatedData = createComplaintSchema.parse(req.body);
    const files = req.files || [];

    const result = await complaintService.createComplaint({
      data: validatedData,
      files,
      currentUser: req.user || null,
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function listMyComplaints(req, res, next) {
  try {
    const validatedQuery = listMyComplaintsQuerySchema.parse(req.query);
    const result = await complaintService.listMyComplaints(req.user, validatedQuery);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function trackComplaint(req, res, next) {
  try {
    const { ticketNo } = req.params;
    const result = await complaintService.trackComplaint(ticketNo);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function getComplaintById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await complaintService.getComplaintById(id, req.user);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createComplaint,
  listMyComplaints,
  trackComplaint,
  getComplaintById,
};
