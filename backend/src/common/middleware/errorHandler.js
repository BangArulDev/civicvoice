const { AppError } = require('../errors');

/**
 * Middleware terpusat untuk penanganan error HTTP.
 * Memastikan semua respons error memiliki format seragam sesuai dokumen AGENTS.md:
 * {
 *   "error": {
 *     "code": "...",
 *     "message": "...",
 *     "details": [...]
 *   }
 * }
 */
function errorHandler(err, req, res, next) {
  // 1. Error yang sengaja dibangkitkan oleh logika aplikasi (AppError)
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details || [],
      },
    });
  }

  // 2. Error validasi skema dari Zod
  if (err.name === 'ZodError') {
    const details = (err.errors || []).map((issue) => ({
      field: issue.path.join('.'),
      issue: issue.message,
    }));

    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validasi data input gagal',
        details,
      },
    });
  }

  // 3. Error kesalahan sintaks payload JSON dari klien
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Format payload JSON dalam request body tidak valid',
        details: [],
      },
    });
  }

  // 4. Kesalahan tak terduga (500)
  // Detail internal (stack trace) dicatat ke log server untuk debugging developer,
  // tetapi TIDAK PERNAH dibocorkan ke pengguna/klien demi alasan keamanan sistem.
  console.error('[UNEXPECTED SERVER ERROR]', err);

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Terjadi kesalahan internal pada server',
      details: [],
    },
  });
}

module.exports = errorHandler;
