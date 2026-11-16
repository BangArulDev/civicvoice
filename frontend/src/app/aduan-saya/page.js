'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import RequireRole from '@/components/RequireRole';
import StatusBadge from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api';

export default function AduanSayaPage() {
  return (
    <RequireRole allowedRoles={['warga']}>
      <AduanSayaList />
    </RequireRole>
  );
}

function AduanSayaList() {
  const [complaints, setComplaints] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchMyComplaints = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      let query = `/complaints/mine?page=${page}&limit=${limit}`;
      if (statusFilter) {
        query += `&status=${statusFilter}`;
      }

      const res = await apiFetch(query);
      setComplaints(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      setErrorMessage(err.message || 'Gagal memuat daftar aduan Anda.');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter]);

  useEffect(() => {
    fetchMyComplaints();
  }, [fetchMyComplaints]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Aduan Saya
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Riwayat seluruh aspirasi dan laporan publik yang telah Anda kirimkan
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-700 whitespace-nowrap">
            Filter Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1); // Reset ke halaman pertama saat filter berubah
            }}
            className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Status</option>
            <option value="baru">Baru</option>
            <option value="diverifikasi">Diverifikasi</option>
            <option value="ditolak">Ditolak</option>
            <option value="didisposisi">Didisposisi</option>
            <option value="diterima">Diterima</option>
            <option value="diproses">Diproses</option>
            <option value="selesai">Selesai</option>
          </select>

          <Link
            href="/aduan/baru"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition whitespace-nowrap"
          >
            <span>+</span>
            <span>Aduan Baru</span>
          </Link>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Konten Daftar / Tabel */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs sm:text-sm text-gray-500">Memuat riwayat aduan Anda...</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto text-xl mb-3">
            📋
          </div>
          <h3 className="text-base font-bold text-gray-800 mb-1">Belum Ada Aduan</h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto mb-4">
            {statusFilter
              ? `Tidak ditemukan aduan dengan status '${statusFilter}'.`
              : 'Anda belum pernah menyampaikan aduan publik.'}
          </p>
          <Link
            href="/aduan/baru"
            className="inline-block px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
          >
            Buat Aduan Sekarang
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((item) => {
            const dateStr = item.createdAt
              ? new Date(item.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '-';

            return (
              <div
                key={item.id}
                className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm hover:border-emerald-300 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {item.ticketNo}
                    </span>
                    <StatusBadge status={item.status} />
                    {item.isAnonymous && (
                      <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        Anonim
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center gap-2">
                    <span>{dateStr}</span>
                    {item.location && (
                      <>
                        <span>&bull;</span>
                        <span className="font-mono">
                          {item.location.lat.toFixed(4)}, {item.location.lng.toFixed(4)}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  <Link
                    href={`/lacak?tiket=${item.ticketNo}`}
                    className="w-full sm:w-auto text-center px-3.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                  >
                    Lacak Status &rarr;
                  </Link>
                </div>
              </div>
            );
          })}

          {/* Kontrol Paginasi */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-xs text-gray-600">
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
                <span className="font-bold text-gray-900">{totalPages}</span> ({total} aduan)
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
