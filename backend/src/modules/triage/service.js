const triageRepository = require('./repository');

function formatTriageItem(row) {
  // Derivasikan URL thumbnail dari berkas foto pertama yang tersimpan
  const thumbnailUrl = row.first_photo_url
    ? row.first_photo_url.replace(/\.jpg$/, '_thumb.jpg')
    : null;

  return {
    id: row.id,
    ticketNo: row.ticket_no,
    title: row.title,
    category: row.category_name,
    categoryId: row.category_id,
    priority: row.priority,
    status: row.status,
    location: {
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
    },
    thumbnailUrl,
    suggestedSkpdId: row.suggested_skpd_id || null,
    suggestedSkpdName: row.suggested_skpd_name || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

async function getTriageQueue({ page = 1, limit = 20 }) {
  const result = await triageRepository.getTriageQueue({ page, limit });

  return {
    data: result.rows.map(formatTriageItem),
    page,
    limit,
    total: result.total,
  };
}

module.exports = {
  getTriageQueue,
};
