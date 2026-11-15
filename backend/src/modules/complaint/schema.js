const { z } = require('zod');

const createComplaintSchema = z.object({
  title: z
    .string()
    .min(1, 'Judul aduan wajib diisi')
    .max(200, 'Judul aduan maksimal 200 karakter'),
  categoryId: z.coerce
    .number({ invalid_type_error: 'Kategori aduan harus berupa angka' })
    .int()
    .positive('Kategori aduan tidak valid'),
  description: z.string().min(1, 'Kronologi atau deskripsi kejadian wajib diisi'),
  lat: z.coerce
    .number({ invalid_type_error: 'Latitude harus berupa angka' })
    .min(-90, 'Latitude harus berada dalam rentang -90 hingga 90')
    .max(90, 'Latitude harus berada dalam rentang -90 hingga 90'),
  lng: z.coerce
    .number({ invalid_type_error: 'Longitude harus berupa angka' })
    .min(-180, 'Longitude harus berada dalam rentang -180 hingga 180')
    .max(180, 'Longitude harus berada dalam rentang -180 hingga 180'),
  accuracyM: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return null;
    return Number(val);
  }, z.number().nullable().optional()),
  locationSource: z.enum(['auto', 'manual']).default('auto'),
  isAnonymous: z.preprocess((val) => {
    if (val === 'true' || val === true || val === 1 || val === '1') return true;
    return false;
  }, z.boolean()).default(false),
});

const listMyComplaintsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(['baru', 'diverifikasi', 'ditolak', 'didisposisi', 'diterima', 'diproses', 'selesai'])
    .optional(),
});

module.exports = {
  createComplaintSchema,
  listMyComplaintsQuerySchema,
};
