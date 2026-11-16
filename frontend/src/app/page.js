import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col justify-center">
      {/* Hero Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Wilayah Layanan Kabupaten Grobogan
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-4">
          Sampaikan Aduan Publik dengan{' '}
          <span className="text-emerald-600">Geotagging Presisi</span>
        </h1>

        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
          CivicVoice memfasilitasi warga Kabupaten Grobogan untuk melaporkan jalan rusak, tumpukan
          sampah, lampu penerangan padam, dan gangguan ketertiban secara transparan, akurat, dan dapat
          dilacak kapan saja.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
          <Link
            href="/aduan/baru"
            className="w-full sm:w-auto px-6 py-3.5 text-base font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            <span>Buat Aduan Sekarang</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </Link>

          <Link
            href="/lacak"
            className="w-full sm:w-auto px-6 py-3.5 text-base font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-sm transition flex items-center justify-center"
          >
            Lacak Status Tiket
          </Link>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="bg-white border-t border-gray-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="p-6 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md transition">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold mb-4">
              📍
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">
              Validasi Lokasi Geospasial
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Titik lokasi aduan divalidasi langsung menggunakan PostGIS untuk memastikan berada di dalam
              batas resmi wilayah Kabupaten Grobogan dengan toleransi akurasi GPS yang presisi.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md transition">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold mb-4">
              🛡️
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">
              Jaminan Privasi Anonim
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Pelapor dapat memilih mode anonim. Identitas akun dienkripsi dengan standar militer AES-256-GCM
              dan tidak pernah dibocorkan pada data maupun respons publik.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md transition">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xl font-bold mb-4">
              ⏱️
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">
              Pelacakan Transparan & SLA
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Setiap aduan mendapatkan nomor tiket unik untuk melacak linimasa penanganan dari verifikasi
              operator, disposisi ke dinas terkait (SKPD), hingga pengunggahan bukti selesai.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
