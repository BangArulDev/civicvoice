const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

/**
 * Terjemahan kamus kode masalah (issue) dari backend ke bahasa Indonesia ramah pengguna.
 */
export const ISSUE_TRANSLATIONS = {
  out_of_service_area:
    'Lokasi berada di luar wilayah layanan Kabupaten Grobogan',
  gps_accuracy_too_low:
    'Akurasi GPS terlalu rendah, coba di tempat terbuka atau geser pin secara manual',
  invalid_image_type:
    'Format berkas foto tidak valid. Gunakan format JPEG atau PNG',
  photos_required:
    'Foto bukti aduan wajib disertakan (minimal 1 foto)',
  too_many_photos:
    'Maksimal 5 berkas foto bukti aduan yang diperbolehkan',
  file_too_large:
    'Ukuran berkas melebihi batas maksimal 5 MB per foto',
  email_already_registered:
    'Alamat email ini sudah terdaftar dalam sistem',
};

export function translateIssue(issue, fallbackMessage) {
  if (!issue) return fallbackMessage || 'Terjadi kesalahan validasi data';
  return ISSUE_TRANSLATIONS[issue] || fallbackMessage || issue;
}

/**
 * Helper pembungkus fetch HTTP terpusat dengan:
 * 1. Otomatisasi penambahan header Authorization Bearer token
 * 2. Parsing respons JSON dan format error seragam
 * 3. Mekanisme rotasi refresh token otomatis saat menerima status HTTP 401
 */
let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(newToken) {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback) {
  refreshSubscribers.push(callback);
}

export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = { ...options.headers };

  // Tambahkan token autentikasi jika tersedia di localStorage
  let accessToken = null;
  if (typeof window !== 'undefined') {
    accessToken = localStorage.getItem('accessToken');
  }
  if (accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  // Jika body bukan FormData, tambahkan header Content-Type application/json
  let body = options.body;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (!isFormData && body && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      body,
    });

    // Tangani respons 401 Unauthorized (mencoba refresh token satu kali)
    if (res.status === 401 && !options._isRetry && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      if (typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          throw new Error('Sesi telah berakhir. Silakan masuk kembali.');
        }

        if (!isRefreshing) {
          isRefreshing = true;

          try {
            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });

            if (!refreshRes.ok) {
              throw new Error('Refresh token gagal atau kedaluwarsa');
            }

            const refreshData = await refreshRes.json();
            localStorage.setItem('accessToken', refreshData.accessToken);
            localStorage.setItem('refreshToken', refreshData.refreshToken);
            isRefreshing = false;
            onRefreshed(refreshData.accessToken);

            // Ulangi permintaan awal dengan token baru
            return apiFetch(endpoint, {
              ...options,
              _isRetry: true,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${refreshData.accessToken}`,
              },
            });
          } catch (refreshErr) {
            isRefreshing = false;
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            throw new Error('Sesi autentikasi telah kedaluwarsa. Silakan masuk kembali.');
          }
        }

        // Jika proses refresh sedang berlangsung, antrekan permintaan ini
        return new Promise((resolve, reject) => {
          addRefreshSubscriber((newToken) => {
            apiFetch(endpoint, {
              ...options,
              _isRetry: true,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${newToken}`,
              },
            })
              .then(resolve)
              .catch(reject);
          });
        });
      }
    }

    // Parsing payload respons
    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      // Bentuk objek Error terstruktur sesuai kontrak backend
      const errorObj = data && data.error ? data.error : { message: data || 'Terjadi kesalahan pada server' };
      const err = new Error(errorObj.message || 'Permintaan gagal diproses');
      err.status = res.status;
      err.code = errorObj.code || 'UNKNOWN_ERROR';
      err.details = errorObj.details || [];
      throw err;
    }

    return data;
  } catch (err) {
    throw err;
  }
}
