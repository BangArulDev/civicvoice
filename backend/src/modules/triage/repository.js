const pool = require('../../db/pool');

/**
 * Mengambil antrean aduan baru ('baru') secara FIFO (created_at ASC) dengan pagination.
 * Menggunakan JOIN dan LATERAL JOIN dalam 1 query SQL tunggal untuk mencegah masalah N+1 query.
 * Kolom reporter_id dan reporter_identity_enc sengaja tidak dimasukkan dalam SELECT demi privasi pelapor.
 */
async function getTriageQueue({ page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;

  // 1. Hitung total aduan yang masih berstatus 'baru'
  const countQuery = `
    SELECT COUNT(*) AS total
    FROM complaints
    WHERE status = 'baru';
  `;
  const countRes = await pool.query(countQuery);
  const total = parseInt(countRes.rows[0].total, 10);

  // 2. Query data utama: menggabungkan kategori, dinas usulan, dan foto pertama sekaligus
  const dataQuery = `
    SELECT
      c.id,
      c.ticket_no,
      c.title,
      c.category_id,
      cat.name AS category_name,
      c.priority,
      c.status,
      ST_Y(c.location::geometry) AS lat,
      ST_X(c.location::geometry) AS lng,
      cp.photo_url AS first_photo_url,
      cskpd.skpd_id AS suggested_skpd_id,
      s.name AS suggested_skpd_name,
      c.created_at
    FROM complaints c
    JOIN categories cat ON c.category_id = cat.id
    LEFT JOIN LATERAL (
      SELECT skpd_id
      FROM category_skpd
      WHERE category_id = c.category_id
      ORDER BY is_primary DESC, skpd_id ASC
      LIMIT 1
    ) cskpd ON TRUE
    LEFT JOIN skpd s ON cskpd.skpd_id = s.id
    LEFT JOIN LATERAL (
      SELECT photo_url
      FROM complaint_photos
      WHERE complaint_id = c.id
      ORDER BY id ASC
      LIMIT 1
    ) cp ON TRUE
    WHERE c.status = 'baru'
    ORDER BY c.created_at ASC
    LIMIT $1 OFFSET $2;
  `;

  const { rows } = await pool.query(dataQuery, [limit, offset]);

  return {
    rows,
    total,
  };
}

module.exports = {
  getTriageQueue,
};
