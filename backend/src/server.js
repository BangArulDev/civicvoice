const app = require('./app');
const config = require('./common/config');
const pool = require('./db/pool');

const PORT = config.port;

// Menjalankan server HTTP
const server = app.listen(PORT, () => {
  console.log(`=== CivicVoice Backend API Service ===`);
  console.log(`Lingkungan: ${config.env}`);
  console.log(`Server aktif dan mendengarkan pada port: ${PORT}`);
  console.log(`Endpoint Health Check: http://localhost:${PORT}/api/v1/health`);
});

// Penanganan penghentian server secara rapi (Graceful Shutdown)
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[SHUTDOWN] Menerima sinyal ${signal}. Menutup koneksi server secara aman...`);

  // Berhenti menerima koneksi HTTP baru
  server.close(async () => {
    console.log('[SHUTDOWN] Server HTTP telah ditutup.');

    try {
      // Tutup pool koneksi basis data PostgreSQL
      await pool.end();
      console.log('[SHUTDOWN] Pool koneksi PostgreSQL telah dilepaskan.');
      process.exit(0);
    } catch (err) {
      console.error('[SHUTDOWN ERROR] Kesalahan saat menutup koneksi PostgreSQL:', err);
      process.exit(1);
    }
  });

  // Batas waktu pemaksaan penghentian (10 detik) jika ada koneksi yang menggantung
  setTimeout(() => {
    console.error('[SHUTDOWN TIMEOUT] Menutup paksa aplikasi setelah batas waktu tunggu.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
