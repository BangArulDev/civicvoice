const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('=== [MIGRATION RUNNER] Memulai Migrasi Basis Data CivicVoice ===');

    // 1. Buat tabel schema_migrations jika belum ada
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 2. Ambil daftar migrasi yang sudah pernah dieksekusi
    const { rows: executedRows } = await client.query(
      'SELECT name FROM schema_migrations ORDER BY id ASC;'
    );
    const executedMigrations = new Set(executedRows.map((r) => r.name));

    // 3. Baca semua berkas .sql di direktori migrations
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('Direktori migrations tidak ditemukan.');
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    let countExecuted = 0;

    // 4. Jalankan migrasi yang belum pernah dieksekusi secara berurutan
    for (const file of files) {
      if (executedMigrations.has(file)) {
        continue;
      }

      console.log(`-> Menjalankan migrasi: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');

      // Jalankan setiap berkas dalam satu transaksi
      await client.query('BEGIN');
      try {
        await client.query(sqlContent);
        await client.query(
          'INSERT INTO schema_migrations (name) VALUES ($1);',
          [file]
        );
        await client.query('COMMIT');
        console.log(`   [BERHASIL] ${file}`);
        countExecuted++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`   [GAGAL] Terjadi kesalahan saat migrasi ${file}. Perubahan di-rollback.`);
        throw err;
      }
    }

    if (countExecuted === 0) {
      console.log('Semua migrasi sudah up-to-date (tidak ada migrasi baru).');
    } else {
      console.log(`Selesai: ${countExecuted} berkas migrasi berhasil dijalankan.`);
    }
  } catch (error) {
    console.error('Fatal error saat migrasi:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;
