const { Pool } = require('pg');
const config = require('../common/config');

const connectionString = config.db.url;

if (!connectionString) {
  console.error(
    '\n======================================================================\n' +
    '[ERROR] DATABASE_URL tidak ditemukan!\n' +
    'Aplikasi tidak dapat terhubung ke basis data karena variabel lingkungan belum disetel.\n\n' +
    'Langkah penyelesaian:\n' +
    '1. Pastikan Anda sudah membuat berkas .env dari template .env.example:\n' +
    '   cp .env.example .env\n' +
    '   (atau di dalam folder backend: cp .env.example backend/.env)\n\n' +
    '2. Buka berkas .env dan sesuaikan nilai DATABASE_URL dengan kata sandi Anda:\n' +
    '   DATABASE_URL=postgresql://civicvoice:PASSWORD_ANDA@localhost:5432/civicvoice\n' +
    '======================================================================\n'
  );
  process.exit(1);
}

// Inisialisasi pool koneksi PostgreSQL
const pool = new Pool({
  connectionString,
});

// Tangani error koneksi pada client idle
pool.on('error', (err) => {
  console.error('[DATABASE ERROR] Terjadi kesalahan tak terduga pada client idle PostgreSQL:', err);
  process.exit(-1);
});

module.exports = pool;
