const pool = require('../src/db/pool');
const seedBoundary = require('../src/db/seeds/seed-boundary');
const { isInsideServiceArea } = require('../src/modules/complaint/repository');

describe('Service Area Boundary & Spatial Verification (Langkah 8A)', () => {
  beforeAll(async () => {
    // Pastikan batas administratif resmi Grobogan dari berkas GeoJSON dimuat ke basis data
    await seedBoundary();
  });

  afterAll(async () => {
    // Melepaskan pool database agar runner Jest selesai dengan bersih
    await pool.end();
  });

  it('harus memuat geometri poligon Kabupaten Grobogan yang valid dan aktif di tabel service_areas', async () => {
    const res = await pool.query(`
      SELECT
        name,
        is_active,
        ST_IsValid(geom::geometry) AS is_valid,
        ROUND((ST_Area(geom) / 1000000.0)::numeric, 2) AS area_km2,
        Box2D(geom::geometry)::text AS bbox
      FROM service_areas
      WHERE name = 'Kabupaten Grobogan' AND is_active = TRUE;
    `);

    expect(res.rows.length).toBe(1);
    const row = res.rows[0];
    expect(row.name).toBe('Kabupaten Grobogan');
    expect(row.is_active).toBe(true);
    expect(row.is_valid).toBe(true);

    // Luas wilayah Kabupaten Grobogan berdasarkan perhitungan PostGIS pada GeoJSON OSM (~2.032,56 km²)
    const area = parseFloat(row.area_km2);
    expect(area).toBeGreaterThan(1800);
    expect(area).toBeLessThan(2300);

    expect(row.bbox).toBeDefined();
    expect(typeof row.bbox).toBe('string');
  });

  it('harus mengonfirmasi titik Purwodadi (lat -7.0881, lng 110.9167) berada di dalam wilayah memakai ST_Covers', async () => {
    const purwodadiLat = -7.0881;
    const purwodadiLng = 110.9167;

    // 1. Pengujian query langsung menggunakan fungsi spasial ST_Covers
    const query = `
      SELECT ST_Covers(
        geom,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      ) AS inside
      FROM service_areas
      WHERE name = 'Kabupaten Grobogan' AND is_active = TRUE;
    `;
    const res = await pool.query(query, [purwodadiLng, purwodadiLat]);

    expect(res.rows.length).toBe(1);
    expect(res.rows[0].inside).toBe(true);

    // 2. Pengujian integrasi modul repository aduan (isInsideServiceArea)
    const insideRepo = await isInsideServiceArea(purwodadiLng, purwodadiLat);
    expect(insideRepo).toBe(true);
  });

  it('harus mengonfirmasi titik Semarang (lat -6.9667, lng 110.4203) berada di luar wilayah memakai ST_Covers', async () => {
    const semarangLat = -6.9667;
    const semarangLng = 110.4203;

    // 1. Pengujian query langsung menggunakan fungsi spasial ST_Covers
    const query = `
      SELECT ST_Covers(
        geom,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      ) AS inside
      FROM service_areas
      WHERE name = 'Kabupaten Grobogan' AND is_active = TRUE;
    `;
    const res = await pool.query(query, [semarangLng, semarangLat]);

    expect(res.rows.length).toBe(1);
    expect(res.rows[0].inside).toBe(false);

    // 2. Pengujian integrasi modul repository aduan (isInsideServiceArea)
    const insideRepo = await isInsideServiceArea(semarangLng, semarangLat);
    expect(insideRepo).toBe(false);
  });
});
