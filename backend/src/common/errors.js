/**
 * Kelas error khusus aplikasi CivicVoice.
 * Membawa kode error terstandarisasi, pesan pengguna, status HTTP, dan rincian validasi/masalah.
 */
class AppError extends Error {
  constructor(code, message, status = 400, details = []) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Fungsi pembantu untuk membuat AppError yang umum
const badRequest = (message = 'Permintaan tidak valid', details = []) =>
  new AppError('BAD_REQUEST', message, 400, details);

const unauthorized = (
  message = 'Token tidak ada, tidak valid, atau kedaluwarsa',
  details = []
) => new AppError('UNAUTHORIZED', message, 401, details);

const forbidden = (
  message = 'Peran tidak memiliki akses untuk tindakan ini',
  details = []
) => new AppError('FORBIDDEN', message, 403, details);

const notFound = (message = 'Data atau sumber daya tidak ditemukan', details = []) =>
  new AppError('NOT_FOUND', message, 404, details);

const conflict = (message = 'Terjadi konflik data dalam sistem', details = []) =>
  new AppError('CONFLICT', message, 409, details);

const validationError = (message = 'Validasi input gagal', details = []) =>
  new AppError('VALIDATION_ERROR', message, 422, details);

const internal = (
  message = 'Terjadi kesalahan internal pada server',
  details = []
) => new AppError('INTERNAL_SERVER_ERROR', message, 500, details);

const serviceUnavailable = (
  message = 'Layanan basis data atau subsistem tidak tersedia',
  details = []
) => new AppError('SERVICE_UNAVAILABLE', message, 503, details);

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  validationError,
  internal,
  serviceUnavailable,
};
