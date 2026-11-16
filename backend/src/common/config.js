const path = require('path');
const dotenv = require('dotenv');

// Memuat variabel lingkungan dari .env
// Memeriksa root proyek (~/civicvoice/.env) dan direktori backend (~/civicvoice/backend/.env)
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;
const encryptionKey = process.env.ENCRYPTION_KEY;

// 1. Validasi keberadaan kunci rahasia JWT wajib
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

// 2. Validasi format ENCRYPTION_KEY wajib (64 karakter heksadesimal / 32 byte)
if (!encryptionKey || !/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
  console.error(
    '\n======================================================================\n' +
    '[FATAL CONFIG ERROR] ENCRYPTION_KEY wajib disetel dan harus berupa string 64 karakter heksadesimal!\n' +
    'Kunci ini digunakan untuk enkripsi AES-256-GCM data identitas pelapor anonim.\n' +
    '======================================================================\n'
  );
  process.exit(1);
}

const rawUploadDir = process.env.UPLOAD_DIR || './uploads';
const uploadDir = path.isAbsolute(rawUploadDir)
  ? rawUploadDir
  : path.resolve(__dirname, '../../', rawUploadDir);

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  uploadDir,
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
    key: encryptionKey,
  },
  seed: {
    userPassword: process.env.SEED_USER_PASSWORD,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 menit
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 1000, // Batas umum
    authMax: 10, // Maksimal 10 percobaan per 15 menit untuk register & login
    complaintMax: 5, // Maksimal 5 aduan per jam
  },
};

module.exports = config;
