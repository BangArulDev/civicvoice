# AGENTS.md: Aturan Proyek CivicVoice

Kamu adalah asisten coding untuk proyek tugas kuliah **CivicVoice**, platform pengaduan publik berbasis geotagging untuk wilayah **Kabupaten Grobogan, Jawa Tengah**. Pemilik proyek adalah mahasiswa (Amrully) yang harus memahami dan mempresentasikan semua kode, jadi kode harus sederhana, rapi, dan dijelaskan.

## 1. Sumber kebenaran (WAJIB dibaca sebelum menulis kode)

- `docs/SRS.md` atau PDF: kebutuhan fungsional (FR-*) dan non-fungsional (NFR-*)
- `docs/SAD.md` atau PDF: arsitektur, ERD, dan daftar endpoint
- `docs/openapi.yaml`: kontrak API. Nama endpoint, field, dan kode status HARUS mengikuti file ini.

Jangan mengubah isi folder `docs/`. Jika kode dan dokumen bertentangan, berhenti dan tanyakan, jangan memilih sendiri.

## 2. Lingkungan (penting)

- Proyek dijalankan di **Ubuntu (WSL 2)**. Pemilik yang menjalankan semua perintah di terminal Ubuntu.
- **Jangan menjalankan** `npm`, `node`, `psql`, atau `git` di terminal Windows. Tulis kode dan berkas saja, lalu berikan daftar perintah yang harus dijalankan pemilik di terminal Ubuntu.
- Berkas harus memakai akhir baris **LF** (bukan CRLF).
- Semua dokumentasi perintah harus dalam bentuk perintah terminal Linux.

## 3. Tech stack (jangan mengganti tanpa izin)

| Lapisan | Teknologi |
|---|---|
| Backend | Node.js (LTS) + Express, **CommonJS** (`require`) |
| Database | PostgreSQL + PostGIS (library `pg`, tanpa ORM) |
| Validasi | Zod |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| Keamanan | helmet, cors, express-rate-limit |
| Upload | multer + sharp (mulai langkah M1) |
| Penjadwal | node-cron (mulai M3) |
| Test | Jest + Supertest |
| Frontend | Next.js (React), Leaflet + OpenStreetMap (mulai tahap frontend) |

## 4. Struktur folder

```
civicvoice/
  backend/
    src/
      modules/
        auth/ complaint/ triage/ sla/ public/ notifier/
          (controller.js, service.js, repository.js, routes.js, schema.js)
      common/        (middleware, errors, utils, config)
      db/
        migrations/  (berkas .sql berurutan: 001_..., 002_...)
        seeds/
        migrate.js
        pool.js
      app.js         (membuat aplikasi Express, tanpa listen)
      server.js      (menjalankan listen)
    tests/
    package.json
  frontend/
  docs/
  README.md
  AGENTS.md
```

Pola per modul: `routes` memanggil `controller` (HTTP saja), `controller` memanggil `service` (aturan bisnis), `service` memanggil `repository` (SQL). Modul tidak boleh mengakses tabel modul lain secara langsung; lewat service modul itu.

## 5. Aturan kode

- Semua query SQL **berparameter** (`$1`, `$2`). Dilarang menyambung string dari input pengguna.
- Semua input divalidasi dengan Zod di sisi server.
- Format error seragam:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [{ "field": "…", "issue": "…" }] } }
  ```
- Kata sandi di-hash, JWT access token berlaku maksimal 15 menit.
- Rahasia (kunci JWT, kunci enkripsi, kredensial DB) hanya dari `.env`. Jangan menulis rahasia asli di kode. Sediakan `.env.example`.
- Identitas pelapor anonim dienkripsi (AES-256-GCM) dan tidak pernah muncul di respons publik.
- Operasi yang mengubah beberapa tabel (misalnya membuat aduan + riwayat status) dibungkus **transaksi**.
- Nama file dan variabel dalam bahasa Inggris, komentar penting dalam bahasa Indonesia yang singkat.
- Fungsi kecil dan satu tujuan. Hindari kode "pintar" yang sulit dijelaskan.

## 6. Cara bekerja

1. Kerjakan **satu langkah** sesuai prompt. Jangan menambah fitur di luar langkah itu.
2. Sebelum menulis kode, tulis rencana singkat (daftar berkas yang akan dibuat atau diubah).
3. Setelah selesai, berikan ringkasan dalam bahasa Indonesia sederhana:
   - berkas yang dibuat atau diubah,
   - penjelasan singkat tiap bagian penting (supaya pemilik bisa menjelaskan ke dosen),
   - perintah yang harus dijalankan pemilik di terminal Ubuntu,
   - hasil yang seharusnya terlihat jika berhasil.
4. Jangan melakukan `git commit` sendiri. Usulkan pesan commit saja, format: `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
5. Bila ada hal yang ambigu atau berisiko, tanyakan dulu.

## 7. Dilarang

- Mengubah `docs/`.
- Menjalankan perintah destruktif (`rm -rf`, `DROP DATABASE`, `git reset --hard`, `git push --force`) tanpa persetujuan eksplisit.
- Memasang paket di luar daftar tech stack tanpa menjelaskan alasannya dan meminta izin.
- Mengirim kode, data, atau rahasia ke layanan eksternal.
