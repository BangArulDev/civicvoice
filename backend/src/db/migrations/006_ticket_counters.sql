-- ==============================================================================
-- 006_ticket_counters.sql
-- Tabel penghitung nomor tiket aduan harian (concurrency-safe generator)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS ticket_counters (
  day DATE PRIMARY KEY,
  last_no INT NOT NULL DEFAULT 0
);
