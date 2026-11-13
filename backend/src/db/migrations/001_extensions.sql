-- ==============================================================================
-- 001_extensions.sql
-- Inisialisasi ekstensi PostGIS (geospasial) dan pgcrypto (UUID & kriptografi)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
