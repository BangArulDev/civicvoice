-- ==============================================================================
-- 002_core_tables.sql
-- Tabel-tabel inti: roles, skpd, categories, category_skpd, users
-- ==============================================================================

-- 1. Tabel Peran (Roles: warga, operator, skpd, admin)
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabel Satuan Kerja Perangkat Daerah (SKPD / Dinas Terkait)
CREATE TABLE IF NOT EXISTS skpd (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  code VARCHAR(50) UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabel Kategori Aduan
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabel Pemetaan Kategori ke SKPD (Relasi N-ke-N)
CREATE TABLE IF NOT EXISTS category_skpd (
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  skpd_id INT NOT NULL REFERENCES skpd(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (category_id, skpd_id)
);

-- 5. Tabel Pengguna (Users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  role_id INT NOT NULL REFERENCES roles(id),
  skpd_id INT REFERENCES skpd(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indeks performa pencarian akun pengguna
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_skpd_id ON users(skpd_id);
