'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import RequireRole from '@/components/RequireRole';
import MapWrapper from '@/components/MapWrapper';
import { apiFetch, translateIssue } from '@/lib/api';

export default function BuatAduanPage() {
  return (
    <RequireRole allowedRoles={['warga']}>
      <BuatAduanForm />
    </RequireRole>
  );
}

function BuatAduanForm() {
  // Form State
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Kategori State
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Lokasi State (Default: Purwodadi)
  const [location, setLocation] = useState({
    lat: -7.0881,
    lng: 110.9167,
    accuracyM: null,
    source: 'manual', // 'auto' | 'manual'
  });
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Foto State (Array of { file, previewUrl })
  const [photos, setPhotos] = useState([]);

  // UI & Submit State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successResult, setSuccessResult] = useState(null);

  // Ambil daftar kategori aktif saat mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await apiFetch('/categories');
        setCategories(res.data || []);
      } catch (err) {
        console.error('Gagal memuat kategori:', err);
      } finally {
        setIsLoadingCategories(false);
      }
    }
    fetchCategories();
  }, []);

  // Handler "Ambil Lokasi Saya" via Geolocation API
  const handleGetCurrentLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Perangkat atau browser Anda tidak mendukung fitur geolokasi.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        setLocation({
          lat: latitude,
          lng: longitude,
          accuracyM: Math.round(accuracy * 10) / 10,
          source: 'auto',
        });
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError(
            'Izin akses lokasi ditolak oleh browser. Anda dapat mengklik atau menggeser pin pada peta secara manual.'
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationError('Informasi lokasi tidak tersedia. Silakan pilih lokasi secara manual di peta.');
        } else if (err.code === err.TIMEOUT) {
          setLocationError('Waktu permintaan lokasi habis. Coba lagi di tempat terbuka atau tentukan manual.');
        } else {
          setLocationError('Gagal mendeteksi lokasi otomatis. Silakan tentukan manual di peta.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Handler saat pin digeser atau peta diklik manual
  const handleMapLocationChange = ({ lat, lng, source }) => {
    setLocation({
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      accuracyM: null, // Dikosongkan jika dipilih manual
      source: 'manual',
    });
  };

  // Handler Berkas Foto
  const handlePhotoSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    if (photos.length + selectedFiles.length > 5) {
      alert('Maksimal 5 berkas foto yang diperbolehkan.');
      return;
    }

    const newPhotos = selectedFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPhotos((prev) => [...prev, ...newPhotos]);
    // Reset input
    e.target.value = '';
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => {
      const removed = prev[index];
      if (removed && removed.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Handler Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setFieldErrors({});

    // Validasi Sisi Klien
    const errors = {};
    if (!title.trim()) errors.title = 'Judul aduan wajib diisi';
    if (!categoryId) errors.categoryId = 'Kategori aduan wajib dipilih';
    if (!description.trim()) errors.description = 'Kronologi kejadian wajib diisi';
    if (photos.length === 0) errors.photos = 'Wajib menyertakan minimal 1 foto bukti aduan';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('categoryId', categoryId);
      formData.append('description', description.trim());
      formData.append('lat', location.lat);
      formData.append('lng', location.lng);
      formData.append('locationSource', location.source);
      formData.append('isAnonymous', isAnonymous ? 'true' : 'false');

      if (location.source === 'auto' && location.accuracyM !== null) {
        formData.append('accuracyM', location.accuracyM);
      }

      photos.forEach((item) => {
        formData.append('photos', item.file);
      });

      const res = await apiFetch('/complaints', {
        method: 'POST',
        body: formData,
      });

      setSuccessResult(res);
    } catch (err) {
      if (err.details && Array.isArray(err.details) && err.details.length > 0) {
        const errorsMap = {};
        err.details.forEach((d) => {
          const translated = translateIssue(d.issue, d.message);
          if (d.field) {
            errorsMap[d.field] = translated;
          }
          // Jika terkait lokasi, tampilkan juga di dekat peta
          if (d.field === 'location' || d.field === 'accuracyM') {
            setLocationError(translated);
          }
        });
        setFieldErrors(errorsMap);
      }
      setSubmitError(err.message || 'Gagal mengirimkan aduan. Silakan periksa kembali formulir.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tampilan Kartu Berhasil Setelah Aduan Diterbitkan
  if (successResult) {
    return (
      <div className="flex-1 max-w-xl mx-auto w-full p-4 sm:p-6 my-8">
        <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-6 sm:p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-black mb-4">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Aduan Berhasil Terkirim!</h2>
          <p className="text-sm text-gray-600 mb-6">
            Laporan Anda telah tercatat ke dalam sistem CivicVoice dan masuk antrean verifikasi operator.
          </p>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 inline-block w-full text-left sm:text-center">
            <span className="block text-xs uppercase tracking-wider font-semibold text-gray-500 mb-1">
              Nomor Tiket Anda
            </span>
            <span className="text-xl sm:text-2xl font-mono font-bold text-emerald-700 tracking-wider">
              {successResult.ticketNo}
            </span>
            <p className="text-[11px] text-gray-500 mt-1">
              Simpan nomor tiket ini untuk memantau status tindak lanjut aduan Anda.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/lacak?tiket=${successResult.ticketNo}`}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition"
            >
              Lacak Aduan Ini
            </Link>
            <button
              type="button"
              onClick={() => {
                setSuccessResult(null);
                setTitle('');
                setDescription('');
                setPhotos([]);
                setFieldErrors({});
              }}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Buat Aduan Lainnya
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Formulir Pengaduan Publik
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Lengkapi data aduan dengan titik koordinat presisi dan foto bukti kejadian di Kabupaten Grobogan.
        </p>
      </div>

      {submitError && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-3">
          <span className="font-bold text-red-600 text-base leading-none">!</span>
          <div>
            <p className="font-semibold">Pengiriman Aduan Gagal</p>
            <p className="text-xs mt-0.5">{submitError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-5 sm:p-7 rounded-xl border border-gray-200 shadow-sm">
        {/* Judul Aduan */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Judul Aduan <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Aspal Amblas di Jalan Danyang - Kuwu"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {fieldErrors.title && <p className="text-xs text-red-600 mt-1">{fieldErrors.title}</p>}
        </div>

        {/* Kategori Aduan */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Kategori Permasalahan <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={isLoadingCategories}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">-- Pilih Kategori Permasalahan --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {fieldErrors.categoryId && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.categoryId}</p>
          )}
        </div>

        {/* Kronologi / Deskripsi */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Deskripsi / Kronologi Kejadian <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan detail masalah, perkiraan panjang kerusakan jalan, atau waktu kejadian secara runtut..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {fieldErrors.description && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.description}</p>
          )}
        </div>

        {/* Peta Lokasi & Geotagging */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Titik Lokasi Geotagging <span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] text-gray-500">
                Klik peta atau geser pin marker ke lokasi kejadian di Kabupaten Grobogan.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={isLocating}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-md hover:bg-emerald-100 transition disabled:opacity-60"
            >
              {isLocating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span>Mendeteksi GPS...</span>
                </>
              ) : (
                <>
                  <span>📍</span>
                  <span>Ambil Lokasi Saya</span>
                </>
              )}
            </button>
          </div>

          {locationError && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
              {locationError}
            </div>
          )}

          {/* Komponen Peta Leaflet Dinamis */}
          <MapWrapper
            position={[location.lat, location.lng]}
            onLocationChange={handleMapLocationChange}
          />

          <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 px-1 pt-1 gap-2">
            <span>
              Koordinat: <span className="font-mono text-gray-700">{location.lat}, {location.lng}</span>
            </span>
            <span>
              Metode:{' '}
              <span className="font-semibold text-gray-700 uppercase">
                {location.source === 'auto' ? 'GPS Otomatis' : 'Manual Pin'}
              </span>
              {location.accuracyM !== null && (
                <span className="text-emerald-600 ml-1 font-mono">(&plusmn;{location.accuracyM} m)</span>
              )}
            </span>
          </div>
          {fieldErrors.location && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.location}</p>
          )}
          {fieldErrors.accuracyM && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.accuracyM}</p>
          )}
        </div>

        {/* Unggah Foto Bukti */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Foto Bukti Kejadian (1 s.d. 5 Foto) <span className="text-red-500">*</span>
          </label>
          <p className="text-[11px] text-gray-500">
            Unggah foto berformat JPEG atau PNG (maksimal 5 MB per foto). Foto akan otomatis dikompresi dan dibersihkan dari metadata EXIF.
          </p>

          {/* Pratinjau Foto */}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
              {photos.map((item, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-100">
                  <img
                    src={item.previewUrl}
                    alt={`Bukti ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md transition"
                    title="Hapus foto"
                  >
                    &times;
                  </button>
                  <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                    Foto {idx + 1}
                  </span>
                </div>
              ))}
            </div>
          )}

          {photos.length < 5 && (
            <label className="mt-2 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-lg p-6 cursor-pointer bg-gray-50/50 hover:bg-white transition">
              <svg
                className="w-8 h-8 text-gray-400 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-xs font-semibold text-gray-700">
                Pilih Foto dari Perangkat
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5">
                Tersisa {5 - photos.length} slot foto
              </span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </label>
          )}
          {fieldErrors.photos && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.photos}</p>
          )}
        </div>

        {/* Opsi Kirim Anonim */}
        <div className="pt-2 border-t border-gray-100">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
            />
            <div>
              <span className="text-sm font-semibold text-gray-800">
                Kirim sebagai pelapor anonim
              </span>
              <p className="text-xs text-gray-500">
                Nama dan email Anda tidak akan pernah muncul pada data publik. Identitas Anda dienkripsi secara aman (AES-256-GCM) untuk kebutuhan audit internal.
              </p>
            </div>
          </label>
        </div>

        {/* Tombol Kirim */}
        <div className="pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Mengirimkan Aduan ke Server...</span>
              </>
            ) : (
              'Kirimkan Aduan Sekarang'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
