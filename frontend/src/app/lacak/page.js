'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api';

export default function LacakPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LacakContainer />
    </Suspense>
  );
}

function LacakContainer() {
  const searchParams = useSearchParams();
  const initialTicket = searchParams.get('tiket') || '';

  const [ticketInput, setTicketInput] = useState(initialTicket);
  const [trackResult, setTrackResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleTrack = useCallback(async (ticketToSearch) => {
    const cleanTicket = (ticketToSearch || '').trim();
    if (!cleanTicket) {
      setErrorMessage('Masukkan nomor tiket aduan yang ingin dilacak.');
      setTrackResult(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setTrackResult(null);

    try {
      const data = await apiFetch(`/complaints/track/${encodeURIComponent(cleanTicket)}`);
      setTrackResult(data);
    } catch (err) {
      if (err.status === 404 || err.code === 'NOT_FOUND') {
        setErrorMessage('Nomor tiket tidak ditemukan. Pastikan format nomor tiket benar (contoh: CV-20261115-0001).');
      } else {
        setErrorMessage(err.message || 'Gagal melacak status tiket. Silakan coba beberapa saat lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Jika terdapat query param ?tiket= saat pertama kali membuka halaman, langsung lacak
  useEffect(() => {
    if (initialTicket) {
      handleTrack(initialTicket);
    }
  }, [initialTicket, handleTrack]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleTrack(ticketInput);
  };

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Lacak Status Aduan
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Pantau transparansi progres penanganan aduan masyarakat secara real-time tanpa perlu masuk ke akun
        </p>
      </div>

      {/* Form Input Nomor Tiket */}
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              required
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value.toUpperCase())}
              placeholder="Contoh: CV-20261115-0001"
              className="w-full px-4 py-3 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase tracking-wider"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="py-3 px-6 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Melacak...</span>
              </>
            ) : (
              'Lacak Status'
            )}
          </button>
        </form>
      </div>

      {/* Pesan Error / 404 */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 mb-6 flex items-start gap-3">
          <span className="font-bold text-red-600 mt-0.5">!</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Hasil Pelacakan & Timeline Status */}
      {trackResult && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-200 gap-2">
            <div>
              <span className="text-xs uppercase font-semibold text-gray-500 tracking-wider">
                Nomor Tiket
              </span>
              <h2 className="text-xl sm:text-2xl font-mono font-bold text-emerald-800">
                {trackResult.ticketNo}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Status Terkini:</span>
              <StatusBadge status={trackResult.status} />
            </div>
          </div>

          {/* Linimasa (Timeline) Riwayat Status */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
              Linimasa Penanganan
            </h3>

            {trackResult.history && trackResult.history.length > 0 ? (
              <div className="relative border-l-2 border-emerald-200 ml-3 pl-6 space-y-6">
                {trackResult.history.map((h, idx) => {
                  const dateStr = h.at
                    ? new Date(h.at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-';

                  return (
                    <div key={idx} className="relative">
                      {/* Titik Lingkaran Timeline */}
                      <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white shadow-sm ring-2 ring-emerald-200" />
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <StatusBadge status={h.status} />
                          <span className="text-xs text-gray-500">{dateStr}</span>
                        </div>
                        {h.note && (
                          <p className="text-xs sm:text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-1">
                            {h.note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">Belum ada riwayat pembaruan status.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
