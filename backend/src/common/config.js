const path = require('path');
const dotenv = require('dotenv');

// Memuat variabel lingkungan dari .env
// Memeriksa root proyek (~/civicvoice/.env) dan direktori backend (~/civicvoice/backend/.env)
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  db: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET || 'default_jwt_access_secret_for_development_only',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || 'default_jwt_refresh_secret_for_development_only',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 menit
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 1000, // Batas umum
  },
};

module.exports = config;
