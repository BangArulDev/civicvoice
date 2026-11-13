-- ==============================================================================
-- 003_service_areas.sql
-- Tabel wilayah layanan berbasis spasial (Kabupaten Grobogan)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS service_areas (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  geom GEOGRAPHY(MultiPolygon, 4326) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indeks GIST (Generalized Search Tree) untuk evaluasi fungsi spasial (ST_Covers, ST_Contains) yang cepat
CREATE INDEX IF NOT EXISTS idx_service_areas_geom ON service_areas USING GIST (geom);
