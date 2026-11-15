const path = require('path');
const dotenv = require('dotenv');

// Memuat variabel lingkungan dari .env
// Memeriksa root proyek (~/civicvoice/.env) dan direktori backend (~/civicvoice/backend/.env)
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

// Validasi keberadaan kunci rahasia JWT wajib
if (!accessSecret || !refreshSecret) {
  console.error(
    '\n======================================================================\n' +
    '[FATAL CONFIG ERROR] JWT_ACCESS_SECRET dan JWT_REFRESH_SECRET wajib disetel di .env!\n' +
    'Aplikasi tidak dapat dijalankan tanpa kunci enkripsi token autentikasi.\n' +
    'Pastikan kedua variabel ini terisi pada berkas .env Anda.\n' +
    '======================================================================\n'
  );
  process.exit(1);
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  db: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret,
    refreshSecret,
    accessExpiresIn: '15m',
    refreshExpiresInDays: 7,
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY,
  },
  seed: {
    userPassword: process.env.SEED_USER_PASSWORD,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 menit
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 1000, // Batas umum
    authMax: 10, // Maksimal 10 percobaan per 15 menit untuk register & login
  },
};

module.exports = config;
