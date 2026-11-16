const pool = require('../../db/pool');

/**
 * Memeriksa apakah koordinat titik berada di dalam poligon wilayah layanan aktif (Kabupaten Grobogan).
 * Urutan parameter geospasial PostGIS: ST_MakePoint(lng, lat).
 */
async function isInsideServiceArea(lng, lat, client = pool) {
  const query = `
    SELECT EXISTS (
      SELECT 1 FROM service_areas
      WHERE is_active = TRUE
        AND ST_Covers(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)
    ) AS inside;
  `;
  const { rows } = await client.query(query, [lng, lat]);
  return Boolean(rows[0]?.inside);
}

/**
 * Mengambil ID SKPD yang disarankan untuk kategori aduan tertentu.
 */
async function getSuggestedSkpdId(categoryId, client = pool) {
  const query = `
    SELECT skpd_id
    FROM category_skpd
    WHERE category_id = $1
    ORDER BY is_primary DESC, skpd_id ASC
    LIMIT 1;
  `;
  const { rows } = await client.query(query, [categoryId]);
  return rows[0] ? rows[0].skpd_id : null;
}

/**
 * Mengambil semua kategori aduan aktif yang diurutkan menurut nama ASC.
 */
async function findAllActiveCategories() {
  const query = `
    SELECT id, name
    FROM categories
    WHERE is_active = TRUE
    ORDER BY name ASC;
  `;
  const { rows } = await pool.query(query);
  return rows;
}

/**
 * Memeriksa keberadaan kategori aduan.
 */
async function findCategoryById(categoryId, client = pool) {
  const query = `SELECT id, name FROM categories WHERE id = $1 AND is_active = TRUE LIMIT 1;`;
  const { rows } = await client.query(query, [categoryId]);
  return rows[0] || null;
}

/**
 * Menghasilkan nomor tiket berikutnya secara aman dan transaksional.
 * Format: CV-YYYYMMDD-NNNN (urut harian, 4 digit).
 */
async function generateTicketNo(client) {
  const query = `
    INSERT INTO ticket_counters (day, last_no)
    VALUES (CURRENT_DATE, 1)
    ON CONFLICT (day) DO UPDATE
    SET last_no = ticket_counters.last_no + 1
    RETURNING 'CV-' || to_char(day, 'YYYYMMDD') || '-' || LPAD(last_no::text, 4, '0') AS ticket_no;
  `;
  const { rows } = await client.query(query);
  return rows[0].ticket_no;
}

/**
 * Menyimpan data aduan baru ke tabel complaints.
 */
async function insertComplaint(data, client) {
  const query = `
    INSERT INTO complaints (
      ticket_no,
      reporter_id,
      reporter_identity_enc,
      is_anonymous,
      category_id,
      title,
      description,
      location,
      gps_accuracy_m,
      location_source,
      priority,
      status
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      ST_SetSRID(ST_MakePoint($8, $9), 4326)::geography,
      $10,
      $11,
      $12,
      $13
    )
    RETURNING id, ticket_no, status, created_at;
  `;

  const values = [
    data.ticketNo,
    data.reporterId || null,
    data.reporterIdentityEnc || null,
    data.isAnonymous,
    data.categoryId,
    data.title,
    data.description,
    data.lng, // $8
    data.lat, // $9
    data.accuracyM || null,
    data.locationSource || 'auto',
    data.priority || 1,
    data.status || 'baru',
  ];

  const { rows } = await client.query(query, values);
  return rows[0];
}

/**
 * Menyimpan daftar URL foto aduan.
 */
async function insertComplaintPhotos(complaintId, photos, client) {
  const query = `
    INSERT INTO complaint_photos (complaint_id, photo_url, caption)
    VALUES ($1, $2, $3)
    RETURNING id, photo_url;
  `;
  const savedPhotos = [];
  for (const photo of photos) {
    const { rows } = await client.query(query, [complaintId, photo.url, photo.caption || null]);
    savedPhotos.push(rows[0]);
  }
  return savedPhotos;
}

/**
 * Mencatat riwayat status aduan.
 */
async function insertStatusHistory({ complaintId, status, changedBy, note }, client) {
  const query = `
    INSERT INTO status_history (complaint_id, status, changed_by, note)
    VALUES ($1, $2, $3, $4)
    RETURNING id, status, created_at;
  `;
  const { rows } = await client.query(query, [
    complaintId,
    status,
    changedBy || null,
    note || null,
  ]);
  return rows[0];
}

/**
 * Mengambil daftar aduan milik pelapor (warga) tertentu dengan pagination.
 */
async function findComplaintsByReporter(reporterId, { page = 1, limit = 20, status = null }) {
  const offset = (page - 1) * limit;
  const conditions = ['c.reporter_id = $1'];
  const params = [reporterId];
  let paramIdx = 2;

  if (status) {
    conditions.push(`c.status = $${paramIdx}`);
    params.push(status);
    paramIdx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM complaints c
    ${whereClause};
  `;
  const countRes = await pool.query(countQuery, params);
  const total = parseInt(countRes.rows[0].total, 10);

  const dataQuery = `
    SELECT
      c.id,
      c.ticket_no,
      c.title,
      c.description,
      c.category_id,
      c.status,
      c.priority,
      c.is_anonymous,
      c.skpd_id,
      ST_Y(c.location::geometry) AS lat,
      ST_X(c.location::geometry) AS lng,
      c.gps_accuracy_m,
      c.location_source,
      c.created_at,
      c.updated_at,
      COALESCE(
        json_agg(cp.photo_url) FILTER (WHERE cp.photo_url IS NOT NULL),
        '[]'
      ) AS photos
    FROM complaints c
    LEFT JOIN complaint_photos cp ON c.id = cp.complaint_id
    ${whereClause}
    GROUP BY c.id
    ORDER BY c.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
  `;
  params.push(limit, offset);

  const { rows } = await pool.query(dataQuery, params);
  return { rows, total };
}

/**
 * Mencari aduan berdasarkan ID untuk detail lengkap.
 */
async function findComplaintById(id) {
  const query = `
    SELECT
      c.id,
      c.ticket_no,
      c.reporter_id,
      c.title,
      c.description,
      c.category_id,
      c.status,
      c.priority,
      c.is_anonymous,
      c.skpd_id,
      ST_Y(c.location::geometry) AS lat,
      ST_X(c.location::geometry) AS lng,
      c.gps_accuracy_m,
      c.location_source,
      c.created_at,
      c.updated_at,
      COALESCE(
        json_agg(cp.photo_url) FILTER (WHERE cp.photo_url IS NOT NULL),
        '[]'
      ) AS photos
    FROM complaints c
    LEFT JOIN complaint_photos cp ON c.id = cp.complaint_id
    WHERE c.id = $1
    GROUP BY c.id
    LIMIT 1;
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

/**
 * Melacak status aduan berdasarkan nomor tiket (publik).
 * Tidak memuat reporter_id atau data identitas pelapor.
 */
async function findComplaintByTicketNo(ticketNo) {
  const complaintQuery = `
    SELECT id, ticket_no, status
    FROM complaints
    WHERE ticket_no = $1
    LIMIT 1;
  `;
  const { rows } = await pool.query(complaintQuery, [ticketNo]);
  if (rows.length === 0) return null;

  const complaint = rows[0];

  const historyQuery = `
    SELECT status, note, created_at AS at
    FROM status_history
    WHERE complaint_id = $1
    ORDER BY created_at ASC;
  `;
  const { rows: historyRows } = await pool.query(historyQuery, [complaint.id]);

  return {
    ticketNo: complaint.ticket_no,
    status: complaint.status,
    history: historyRows.map((h) => ({
      status: h.status,
      note: h.note || null,
      at: h.at instanceof Date ? h.at.toISOString() : h.at,
    })),
  };
}

module.exports = {
  isInsideServiceArea,
  getSuggestedSkpdId,
  findCategoryById,
  findAllActiveCategories,
  generateTicketNo,
  insertComplaint,
  insertComplaintPhotos,
  insertStatusHistory,
  findComplaintsByReporter,
  findComplaintById,
  findComplaintByTicketNo,
};
