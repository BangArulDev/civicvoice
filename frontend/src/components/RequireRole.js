'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function RequireRole({ allowedRoles = [], children }) {
  const { user, role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[300px]">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-600 font-medium">Memeriksa izin akses sesi...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Akan diarahkan oleh useEffect
  }

  const isAllowed = allowedRoles.length === 0 || allowedRoles.includes(role);

  if (!isAllowed) {
    return (
      <div className="flex-1 max-w-lg mx-auto w-full p-6 flex flex-col items-center justify-center text-center my-12">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl font-bold mb-4">
          !
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h2>
        <p className="text-sm text-gray-600 mb-6">
          Akun Anda memiliki peran <span className="font-semibold text-gray-800">'{role}'</span>,
          yang tidak memiliki hak akses untuk membuka halaman ini.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition"
        >
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return children;
}
