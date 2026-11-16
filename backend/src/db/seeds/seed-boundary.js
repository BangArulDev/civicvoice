const fs = require('fs');
const path = require('path');
const pool = require('../pool');

/**
 * Memuat batas administratif resmi Kabupaten Grobogan dari berkas GeoJSON
 * ke tabel service_areas menggunakan PostGIS.
 * Sumber data: OpenStreetMap (Lisensi ODbL).
 */
async function seedBoundary(customClient = null) {
  const isExternalClient = Boolean(customClient);
  const client = customClient || (await pool.connect());

  try {
    console.log('=== [BOUNDARY SEEDER] Memuat Batas Administratif Resmi Kabupaten Grobogan ===');

    // 1. Baca berkas grobogan.geojson
    const geoJsonPath = path.join(__dirname, 'grobogan.geojson');
    if (!fs.existsSync(geoJsonPath)) {
      throw new Error(`Berkas GeoJSON tidak ditemukan pada path: ${geoJsonPath}`);
    }

    const rawData = fs.readFileSync(geoJsonPath, 'utf-8');
    let geojson;
    try {
      geojson = JSON.parse(rawData);
    } catch (parseErr) {
      throw new Error(`Gagal mem-parsing berkas GeoJSON: ${parseErr.message}`);
    }

    // 2. Ambil fitur pertama dan validasi tipe Polygon / MultiPolygon
    if (!geojson || !Array.isArray(geojson.features) || geojson.features.length === 0) {
      throw new Error('Struktur GeoJSON tidak valid atau tidak memiliki daftar features.');
    }

    const firstFeature = geojson.features[0];
    const geomType = firstFeature?.geometry?.type;

    if (!firstFeature?.geometry || (geomType !== 'Polygon' && geomType !== 'MultiPolygon')) {
      throw new Error(
        `Fitur pertama bukan bertipe Polygon atau MultiPolygon (tipe ditemukan: ${geomType || 'tidak ada geometri'}).`
      );
    }

    console.log(`-> Fitur geometri valid ditemukan: ${geomType}`);
    const geometryJson = JSON.stringify(firstFeature.geometry);

    // 3. Simpan ke database dalam satu transaksi utuh (idempoten: UPDATE jika ada, INSERT jika belum)
    await client.query('BEGIN');

    const areaName = 'Kabupaten Grobogan';
    const checkRes = await client.query(
      `SELECT id FROM service_areas WHERE name = $1 ORDER BY id ASC;`,
      [areaName]
    );

    if (checkRes.rows.length > 0) {
      const primaryId = checkRes.rows[0].id;
      console.log(`-> Memperbarui data poligon ${areaName} (ID: ${primaryId})...`);
      await client.query(
        `UPDATE service_areas
         SET geom = ST_Multi(ST_MakeValid(ST_GeomFromGeoJSON($1)))::geography,
             is_active = TRUE
         WHERE id = $2;`,
        [geometryJson, primaryId]
      );

      // Bersihkan baris duplikat jika sebelumnya ada akibat pengujian berulang
      if (checkRes.rows.length > 1) {
        console.log(`-> Membersihkan ${checkRes.rows.length - 1} data duplikat ${areaName}...`);
        await client.query(
          `DELETE FROM service_areas WHERE name = $1 AND id != $2;`,
          [areaName, primaryId]
        );
      }
    } else {
      console.log(`-> Menyisipkan data poligon baru ${areaName} (INSERT)...`);
      await client.query(
        `INSERT INTO service_areas (name, geom, is_active)
         VALUES ($1, ST_Multi(ST_MakeValid(ST_GeomFromGeoJSON($2)))::geography, TRUE);`,
        [areaName, geometryJson]
      );
    }

    // 4. Periksa dan ambil statistik geometri yang tersimpan
    const statsRes = await client.query(
      `SELECT
         ST_IsValid(geom::geometry) AS is_valid,
         ROUND((ST_Area(geom) / 1000000.0)::numeric, 2) AS area_km2,
         Box2D(geom::geometry)::text AS bbox
       FROM service_areas
       WHERE name = $1;`,
      [areaName]
    );

    const stats = statsRes.rows[0];
    console.log('-> Statistik batas wilayah Kabupaten Grobogan yang tersimpan:');
    console.log(`   - Geometri Valid : ${stats.is_valid}`);
    console.log(`   - Luas Wilayah   : ${stats.area_km2} km²`);
    console.log(`   - Bounding Box   : ${stats.bbox}`);

    await client.query('COMMIT');
    console.log('=== [BOUNDARY SEEDER] Selesai dengan sukses! ===');
    return stats;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Fatal error saat seeding batas wilayah:', error.message);
    throw error;
  } finally {
    if (!isExternalClient) {
      client.release();
    }
  }
}

if (require.main === module) {
  seedBoundary()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}

module.exports = seedBoundary;
