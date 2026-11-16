import './globals.css';
import { AuthProvider } from '@/lib/auth';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'CivicVoice - Pengaduan Publik Kabupaten Grobogan',
  description:
    'Platform pengaduan publik dan aspirasi warga berbasis geotagging untuk wilayah Kabupaten Grobogan, Jawa Tengah.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="h-full">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 antialiased font-sans">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-gray-500">
              <p className="font-medium text-gray-700 mb-1">
                CivicVoice &bull; Kabupaten Grobogan, Jawa Tengah
              </p>
              <p>Mata Kuliah Pengembangan Berbasis Platform (GA07309), Universitas An Nuur</p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
