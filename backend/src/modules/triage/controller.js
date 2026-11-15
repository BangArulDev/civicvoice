const { getTriageQueueQuerySchema } = require('./schema');
const triageService = require('./service');

async function getTriageQueue(req, res, next) {
  try {
    const validatedQuery = getTriageQueueQuerySchema.parse(req.query);
    const result = await triageService.getTriageQueue(validatedQuery);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTriageQueue,
};
