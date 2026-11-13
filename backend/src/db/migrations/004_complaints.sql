-- ==============================================================================
-- 004_complaints.sql
-- Tabel aduan warga (complaints), foto aduan (complaint_photos), dan riwayat status (status_history)
-- ==============================================================================

-- 1. Tabel Aduan Utama (Complaints)
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no VARCHAR(20) UNIQUE NOT NULL,
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reporter_identity_enc BYTEA,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  category_id INT NOT NULL REFERENCES categories(id),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  gps_accuracy_m NUMERIC(6,1),
  location_source VARCHAR(10) NOT NULL DEFAULT 'auto',
  priority SMALLINT NOT NULL DEFAULT 1,
  status VARCHAR(15) NOT NULL DEFAULT 'baru',
  skpd_id INT REFERENCES skpd(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Pembatasan nilai (Check Constraints)
  CONSTRAINT chk_complaints_priority CHECK (priority IN (1, 2, 3)),
  CONSTRAINT chk_complaints_status CHECK (
    status IN ('baru', 'diverifikasi', 'ditolak', 'didisposisi', 'diterima', 'diproses', 'selesai')
  ),
  CONSTRAINT chk_complaints_location_source CHECK (location_source IN ('auto', 'manual'))
);

-- Indeks Spasial GIST untuk pencarian berbasis radius / lokasi
CREATE INDEX IF NOT EXISTS idx_complaints_location ON complaints USING GIST (location);

-- Indeks performa query filter status, kategori, pelapor, dan tanggal
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints (status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints (category_id);
CREATE INDEX IF NOT EXISTS idx_complaints_reporter ON complaints (reporter_id);
CREATE INDEX IF NOT EXISTS idx_complaints_skpd_id ON complaints (skpd_id);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints (created_at DESC);

-- 2. Tabel Foto Aduan (Complaint Photos)
CREATE TABLE IF NOT EXISTS complaint_photos (
  id BIGSERIAL PRIMARY KEY,
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaint_photos_complaint_id ON complaint_photos(complaint_id);

-- 3. Tabel Riwayat Status Aduan (Status History)
CREATE TABLE IF NOT EXISTS status_history (
  id BIGSERIAL PRIMARY KEY,
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  status VARCHAR(15) NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_history_complaint_id ON status_history(complaint_id);
