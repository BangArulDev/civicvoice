'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);

  const isActive = (path) => pathname === path;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center">
            <Link
              href="/"
              onClick={closeMenu}
              className="flex items-center gap-2 font-bold text-xl text-emerald-700 tracking-tight"
            >
              <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                CV
              </span>
              <span>CivicVoice</span>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full hidden sm:inline-block">
                Grobogan
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <Link
              href="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                isActive('/')
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-gray-700 hover:text-emerald-600 hover:bg-gray-50'
              }`}
            >
              Beranda
            </Link>

            {/* Menu Warga */}
            {role === 'warga' && (
              <>
                <Link
                  href="/aduan/baru"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    isActive('/aduan/baru')
                      ? 'text-emerald-700 bg-emerald-50'
                      : 'text-gray-700 hover:text-emerald-600 hover:bg-gray-50'
                  }`}
                >
                  Buat Aduan
                </Link>
                <Link
                  href="/aduan-saya"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    isActive('/aduan-saya')
                      ? 'text-emerald-700 bg-emerald-50'
                      : 'text-gray-700 hover:text-emerald-600 hover:bg-gray-50'
                  }`}
                >
                  Aduan Saya
                </Link>
              </>
            )}

            {/* Menu Operator & Admin */}
            {(role === 'operator' || role === 'admin') && (
              <Link
                href="/operator/antrean"
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive('/operator/antrean')
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-gray-700 hover:text-emerald-600 hover:bg-gray-50'
                }`}
              >
                Antrean Operator
              </Link>
            )}

            {/* Menu Publik: Lacak */}
            <Link
              href="/lacak"
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                isActive('/lacak')
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-gray-700 hover:text-emerald-600 hover:bg-gray-50'
              }`}
            >
              Lacak Aduan
            </Link>

            {/* User State */}
            {user ? (
              <div className="flex items-center pl-3 border-l border-gray-200 gap-3">
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-900 leading-tight">
                    {user.fullName || user.email}
                  </p>
                  <span className="text-[10px] text-emerald-700 font-medium capitalize bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    {user.role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition"
                >
                  Keluar
                </button>
              </div>
            ) : (
              <div className="flex items-center pl-3 border-l border-gray-200 gap-2">
                <Link
                  href="/login"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-emerald-600 transition"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="px-3.5 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm transition"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={toggleMenu}
              aria-label="Buka menu navigasi"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
              >
                {isOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-200 px-4 pt-2 pb-4 space-y-1 bg-white shadow-lg">
          <Link
            href="/"
            onClick={closeMenu}
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActive('/')
                ? 'text-emerald-700 bg-emerald-50'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Beranda
          </Link>

          {role === 'warga' && (
            <>
              <Link
                href="/aduan/baru"
                onClick={closeMenu}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/aduan/baru')
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Buat Aduan
              </Link>
              <Link
                href="/aduan-saya"
                onClick={closeMenu}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/aduan-saya')
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Aduan Saya
              </Link>
            </>
          )}

          {(role === 'operator' || role === 'admin') && (
            <Link
              href="/operator/antrean"
              onClick={closeMenu}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/operator/antrean')
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Antrean Operator
            </Link>
          )}

          <Link
            href="/lacak"
            onClick={closeMenu}
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActive('/lacak')
                ? 'text-emerald-700 bg-emerald-50'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Lacak Aduan
          </Link>

          <div className="pt-3 border-t border-gray-200 mt-2">
            {user ? (
              <div className="space-y-2">
                <div className="px-3 py-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {user.fullName || user.email}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">Peran: {user.role}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition"
                >
                  Keluar dari Akun
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="w-full text-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  onClick={closeMenu}
                  className="w-full text-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
