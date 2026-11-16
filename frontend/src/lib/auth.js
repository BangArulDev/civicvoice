'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from './api';

const AuthContext = createContext(null);

/**
 * CATATAN KEAMANAN (ARCHITECTURAL DECISION):
 * Penyimpanan token JWT (accessToken dan refreshToken) di `localStorage` adalah pendekatan
 * yang paling sederhana dan mandiri untuk kebutuhan MVP/tugas kuliah.
 *
 * RISIKO:
 * Penyimpanan di `localStorage` rentan terhadap pencurian token melalui serangan Cross-Site
 * Scripting (XSS) apabila aplikasi memuat skrip berbahaya atau injeksi HTML.
 * Untuk lingkungan produksi tingkat lanjut, pendekatan yang lebih aman adalah menggunakan
 * cookie `HttpOnly` dengan atribut `SameSite=Strict` dan flag `Secure`.
 */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fungsi memuat profil pengguna aktif dari backend
  const loadUser = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = await apiFetch('/auth/me');
      setUser(userData);
    } catch (err) {
      console.warn('[AUTH] Gagal memuat profil pengguna:', err.message);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Fungsi Login
  const login = async ({ email, password }) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    if (data.accessToken && data.refreshToken) {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      const userData = await apiFetch('/auth/me');
      setUser(userData);
      return userData;
    }
    throw new Error('Gagal mendapatkan token autentikasi');
  };

  // Fungsi Registrasi Warga
  const register = async ({ email, password, fullName }) => {
    return apiFetch('/auth/register', {
      method: 'POST',
      body: { email, password, fullName },
    });
  };

  // Fungsi Logout
  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const role = user?.role || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoading,
        login,
        register,
        logout,
        reloadUser: loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam komponen AuthProvider');
  }
  return context;
}
