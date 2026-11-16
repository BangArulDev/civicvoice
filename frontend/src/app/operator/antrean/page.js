'use client';

import { useState, useEffect, useCallback } from 'react';
import RequireRole from '@/components/RequireRole';
import StatusBadge from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api';

export default function AntreanOperatorPage() {
  return (
    <RequireRole allowedRoles={['operator', 'admin']}>
      <AntreanOperatorList />
    </RequireRole>
  );
}

function AntreanOperatorList() {
  const [queue, setQueue] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Host backend untuk memuat berkas foto statis /uploads
  const backendBase = (
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
  ).replace(/\/api\/v1\/?$/, '');

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await apiFetch(`/triage/queue?page=${page}&limit=${limit}`);
      setQueue(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      setErrorMessage(err.message || 'Gagal memuat antrean triase.');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const totalPages = Math.ceil(total / limit) || 1;

  const priorityLabels = {
    1: { label: 'Rendah', classes: 'text-gray-600 bg-gray-100 border-gray-200' },
    2: { label: 'Sedang', classes: 'text-amber-700 bg-amber-50 border-amber-200' },
    3: { label: 'Tinggi', classes: 'text-red-700 bg-red-50 border-red-200 font-bold' },
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Antrean Triase Operator
            </h1>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
              {total} Masuk
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Daftar aduan baru yang perlu diverifikasi dan didisposisi ke dinas terkait (SKPD)
          </p>
        </div>

        <button
          type="button"
          onClick={fetchQueue}
          disabled={isLoading}
          className="self-start sm:self-auto px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-sm transition disabled:opacity-50"
        >
          {isLoading ? 'Menyegarkan...' : 'Segarkan Data'}
        </button>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Konten Antrean */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs sm:text-sm text-gray-500">Memuat antrean triase...</p>
        </div>
      ) : queue.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl mb-3">
            ✓
          </div>
          <h3 className="text-base font-bold text-gray-800 mb-1">Semua Aduan Telah Diproses!</h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
            Tidak ada aduan berstatus baru dalam antrean triase saat ini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tampilan Desktop: Tabel Responsif */}
          <div className="hidden lg:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Foto</th>
                    <th className="py-3 px-4">Nomor Tiket</th>
                    <th className="py-3 px-4">Judul Aduan</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Prioritas</th>
                    <th className="py-3 px-4">SKPD Usulan</th>
                    <th className="py-3 px-4">Waktu Masuk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {queue.map((item) => {
                    const thumbUrl = item.thumbnailUrl
                      ? item.thumbnailUrl.startsWith('http')
                        ? item.thumbnailUrl
                        : `${backendBase}${item.thumbnailUrl}`
                      : null;

                    const dateStr = item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-';

                    const prio = priorityLabels[item.priority] || {
                      label: item.priority,
                      classes: 'text-gray-600 bg-gray-100',
                    };

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/75 transition">
                        <td className="py-2.5 px-4">
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={item.title}
                              className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 text-[10px]">
                              Tanpa Foto
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-emerald-800 whitespace-nowrap">
                          {item.ticketNo}
                        </td>
                        <td className="py-2.5 px-4 max-w-xs font-semibold text-gray-900 truncate">
                          {item.title}
                        </td>
                        <td className="py-2.5 px-4 text-gray-700 whitespace-nowrap">
                          {item.category}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] border ${prio.classes}`}
                          >
                            {prio.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-gray-700 whitespace-nowrap">
                          {item.suggestedSkpdName || (
                            <span className="text-gray-400 italic">Belum Dipetakan</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-gray-500 whitespace-nowrap">{dateStr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tampilan Mobile/Tablet: Daftar Kartu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-3">
            {queue.map((item) => {
              const thumbUrl = item.thumbnailUrl
                ? item.thumbnailUrl.startsWith('http')
                  ? item.thumbnailUrl
                  : `${backendBase}${item.thumbnailUrl}`
                : null;

              const dateStr = item.createdAt
                ? new Date(item.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '-';

              const prio = priorityLabels[item.priority] || {
                label: item.priority,
                classes: 'text-gray-600 bg-gray-100',
              };

              return (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between gap-3"
                >
                  <div className="flex gap-3">
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={item.title}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 text-[10px] flex-shrink-0">
                        Tanpa Foto
                      </div>
                    )}

                    <div className="space-y-1 min-w-0">
                      <span className="font-mono text-xs font-bold text-emerald-800">
                        {item.ticketNo}
                      </span>
                      <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-500">{item.category}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between text-xs text-gray-500 gap-2">
                    <span className="font-medium text-gray-700 truncate max-w-[150px]">
                      {item.suggestedSkpdName || 'Belum Dipetakan'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${prio.classes}`}>
                        {prio.label}
                      </span>
                      <span>{dateStr}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Kontrol Paginasi */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs text-gray-600">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                &larr; Sebelumnya
              </button>

              <span>
                Halaman <span className="font-bold text-gray-900">{page}</span> dari{' '}
                <span className="font-bold text-gray-900">{totalPages}</span> ({total} aduan baru)
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Selanjutnya &rarr;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
