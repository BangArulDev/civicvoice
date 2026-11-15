const bcrypt = require('bcryptjs');
const pool = require('../pool');
const config = require('../../common/config');

async function runSeed() {
  const client = await pool.connect();

  try {
    console.log('=== [SEED RUNNER] Memulai Pengisian Data Awal (Seeds) ===');
    await client.query('BEGIN');

    // -------------------------------------------------------------------------
    // 1. Roles (Peran Pengguna: warga, operator, skpd, admin)
    // -------------------------------------------------------------------------
    console.log('-> Mengisi tabel roles...');
    const rolesData = [
      { name: 'warga', description: 'Warga masyarakat pelapor aduan' },
      { name: 'operator', description: 'Petugas triase dan disposisi aduan' },
      { name: 'skpd', description: 'Petugas dinas / SKPD penindaklanjut' },
      { name: 'admin', description: 'Administrator pengelola sistem CivicVoice' },
    ];

    const rolesMap = {};
    for (const role of rolesData) {
      const { rows } = await client.query(
        `INSERT INTO roles (name, description)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
         RETURNING id, name;`,
        [role.name, role.description]
      );
      rolesMap[role.name] = rows[0].id;
    }

    // -------------------------------------------------------------------------
    // 2. SKPD (4 Instansi Simulasi)
    // -------------------------------------------------------------------------
    console.log('-> Mengisi tabel skpd...');
    const skpdData = [
      {
        name: 'Dinas Pekerjaan Umum',
        code: 'DPU',
        description: 'Penanganan infrastruktur jalan, jembatan, drainase, dan fasilitas umum',
      },
      {
        name: 'Dinas Lingkungan Hidup (Kebersihan)',
        code: 'DLH',
        description: 'Pengelolaan persampahan, kebersihan lingkungan, dan ruang terbuka hijau',
      },
      {
        name: 'Dinas Perhubungan',
        code: 'DISHUB',
        description: 'Penerangan jalan umum (LPJU), rambu lalu lintas, dan transportasi',
      },
      {
        name: 'Satpol PP',
        code: 'SATPOLPP',
        description: 'Penegakan peraturan daerah, ketertiban umum, dan penertiban parkir liar',
      },
    ];

    const skpdMap = {};
    for (const item of skpdData) {
      const { rows } = await client.query(
        `INSERT INTO skpd (name, code, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code, description = EXCLUDED.description
         RETURNING id, name;`,
        [item.name, item.code, item.description]
      );
      skpdMap[item.name] = rows[0].id;
    }

    // -------------------------------------------------------------------------
    // 3. Kategori Aduan & Pemetaan ke SKPD (category_skpd)
    // -------------------------------------------------------------------------
    console.log('-> Mengisi tabel categories & category_skpd...');
    const categoriesData = [
      {
        name: 'Jalan Rusak',
        description: 'Laporan jalan berlubang, aspal amblas, atau jembatan rusak',
        skpdName: 'Dinas Pekerjaan Umum',
      },
      {
        name: 'Sampah Menumpuk',
        description: 'Laporan tempat pembuangan sampah liar atau tumpukan sampah tidak terangkut',
        skpdName: 'Dinas Lingkungan Hidup (Kebersihan)',
      },
      {
        name: 'Lampu Penerangan Mati',
        description: 'Laporan lampu penerangan jalan umum (LPJU) padam atau rusak',
        skpdName: 'Dinas Perhubungan',
      },
      {
        name: 'Ketertiban/Parkir Liar',
        description: 'Laporan gangguan ketertiban umum, PKL liar di trotoar, atau parkir liar',
        skpdName: 'Satpol PP',
      },
    ];

    for (const cat of categoriesData) {
      const { rows } = await client.query(
        `INSERT INTO categories (name, description)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
         RETURNING id;`,
        [cat.name, cat.description]
      );

      const categoryId = rows[0].id;
      const skpdId = skpdMap[cat.skpdName];

      if (skpdId) {
        await client.query(
          `INSERT INTO category_skpd (category_id, skpd_id, is_primary)
           VALUES ($1, $2, TRUE)
           ON CONFLICT (category_id, skpd_id) DO NOTHING;`,
          [categoryId, skpdId]
        );
      }
    }

    // -------------------------------------------------------------------------
    // 4. Pengguna Awal / Demo Users (admin, operator, petugas SKPD, warga)
    // -------------------------------------------------------------------------
    console.log('-> Mengisi tabel users dengan akun pengujian...');
    const demoPassword =
      config.seed.userPassword ||
      process.env.SEED_USER_PASSWORD ||
      'password_demo_civicvoice_rahasia_123';

    // Hash kata sandi dengan bcrypt (cost 12 sesuai SRS NFR-S-01)
    const passwordHash = await bcrypt.hash(demoPassword, 12);

    const demoUsers = [
      {
        email: 'admin@civicvoice.grobo.go.id',
        fullName: 'Administrator CivicVoice',
        roleName: 'admin',
        skpdId: null,
      },
      {
        email: 'operator@civicvoice.grobo.go.id',
        fullName: 'Operator Triase Grobogan',
        roleName: 'operator',
        skpdId: null,
      },
      {
        email: 'petugas.dpu@civicvoice.grobo.go.id',
        fullName: 'Petugas Dinas PU',
        roleName: 'skpd',
        skpdId: skpdMap['Dinas Pekerjaan Umum'] || null,
      },
      {
        email: 'warga.demo@gmail.com',
        fullName: 'Warga Demo Grobogan',
        roleName: 'warga',
        skpdId: null,
      },
    ];

    for (const u of demoUsers) {
      const roleId = rolesMap[u.roleName];
      await client.query(
        `INSERT INTO users (email, password_hash, full_name, role_id, skpd_id, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         ON CONFLICT (email) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           full_name = EXCLUDED.full_name,
           role_id = EXCLUDED.role_id,
           skpd_id = EXCLUDED.skpd_id,
           is_active = TRUE;`,
        [u.email, passwordHash, u.fullName, roleId, u.skpdId]
      );
    }

    // -------------------------------------------------------------------------
    // 5. Service Areas (Wilayah Layanan Kabupaten Grobogan)
    // -------------------------------------------------------------------------
    console.log('-> Mengisi tabel service_areas (Kabupaten Grobogan)...');
    /*
     * CATATAN PENTING (PLACEHOLDER):
     * Koordinat poligon di bawah ini adalah perkiraan bounding box kasar Kabupaten Grobogan:
     * Bujur (Longitude): 110.55 s.d. 111.15
     * Lintang (Latitude): -7.45 s.d. -6.95
     * Ini digunakan sebagai simulasi untuk validasi titik aduan berada dalam wilayah layanan.
     * Poligon ini akan diganti dengan batas administratif resmi dari berkas GeoJSON Grobogan.
     */
    const groboganPolygonWKT =
      'SRID=4326;MULTIPOLYGON(((110.55 -7.45, 111.15 -7.45, 111.15 -6.95, 110.55 -6.95, 110.55 -7.45)))';

    const existingArea = await client.query(
      `SELECT id FROM service_areas WHERE name = $1 LIMIT 1;`,
      ['Kabupaten Grobogan']
    );

    if (existingArea.rows.length === 0) {
      await client.query(
        `INSERT INTO service_areas (name, geom, is_active)
         VALUES ('Kabupaten Grobogan', ST_GeogFromText($1), TRUE);`,
        [groboganPolygonWKT]
      );
    } else {
      await client.query(
        `UPDATE service_areas
         SET geom = ST_GeogFromText($1), is_active = TRUE
         WHERE id = $2;`,
        [groboganPolygonWKT, existingArea.rows[0].id]
      );
    }

    await client.query('COMMIT');
    console.log('=== [SEED RUNNER] Pengisian data awal selesai dengan sukses! ===');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Fatal error saat seeding:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runSeed();
}

module.exports = runSeed;
