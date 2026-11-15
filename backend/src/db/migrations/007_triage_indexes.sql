-- ==============================================================================
-- 007_triage_indexes.sql
-- Indeks komposit untuk mengoptimalkan query antrean triase operator (FIFO)
-- Menghilangkan keharusan sort in-memory dengan memanfaatkan urutan indeks
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_complaints_status_created_at
ON complaints (status, created_at ASC);
