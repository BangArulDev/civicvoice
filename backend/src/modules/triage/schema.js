const { z } = require('zod');

const getTriageQueueQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Halaman minimal 1').default(1),
  limit: z.coerce.number().int().min(1).max(100, 'Batas maksimal 100 data per halaman').default(20),
});

module.exports = {
  getTriageQueueQuerySchema,
};
