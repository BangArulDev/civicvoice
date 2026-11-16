# CivicVoice

Platform pengaduan publik dan aspirasi warga berbasis *geotagging* untuk wilayah **Kabupaten Grobogan, Jawa Tengah**. Proyek ini dikembangkan untuk mata kuliah **Pengembangan Berbasis Platform (GA07309)** di Universitas An Nuur.

CivicVoice memungkinkan warga menyampaikan aduan dengan koordinat spasial presisi dan foto bukti, menjamin privasi pelapor melalui enkripsi data anonim, serta memfasilitasi proses triase dan pemantauan SLA oleh instansi pemerintah daerah (SKPD).

---

## Arsitektur & Tech Stack

- **Backend**: Node.js (LTS) + Express (CommonJS)
- **Database**: PostgreSQL 14+ dengan ekstensi spasial **PostGIS** (driver native `pg`, tanpa ORM)
- **Validasi**: Zod
- **Autentikasi**: JWT (Access Token 15 menit + Refresh Token) & bcryptjs (cost 12)
- **Keamanan**: Helmet, CORS, Express-rate-limit, enkripsi AES-256-GCM
- **Pengolahan Media**: Multer & Sharp (sanitasi EXIF & kompresi Web/Thumbnail)
- **Penjadwal**: Node-cron (otomatisasi evaluasi SLA)
- **Pengujian**: Jest & Supertest
- **Frontend**: Next.js 16 (React 19, App Router) + Tailwind CSS + Leaflet / OpenStreetMap

---

## Panduan Setup Lengkap dari Nol (Ubuntu / WSL 2)

Seluruh langkah di bawah ini dijalankan di terminal **Ubuntu (WSL 2)**.

### 1. Perbarui Sistem & Pasang Alat Dasar

Pastikan indeks paket Ubuntu diperbarui dan paket Git, curl, serta build-essential terpasang:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential
git --version
```

### 2. Pasang Node.js LTS menggunakan NVM (Node Version Manager)

Gunakan NVM agar versi Node.js terisolasi dengan rapi:

```bash
# Unduh dan pasang NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Muat konfigurasi NVM ke sesi shell aktif
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Pasang dan aktifkan Node.js LTS (versi 20 atau 22)
nvm install --lts
nvm use --lts

# Verifikasi versi node dan npm
node -v
npm -v
```

### 3. Pasang PostgreSQL & Ekstensi Spasial PostGIS

Pasang server basis data PostgreSQL dan paket PostGIS:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib postgis postgresql-*-postgis-*

# Jalankan service PostgreSQL
sudo service postgresql start

# Pastikan status service aktif (running)
sudo service postgresql status
```

### 4. Konfigurasi Pengguna, Basis Data, dan PostGIS

Masuk ke terminal PostgreSQL (`psql`) sebagai user default `postgres`:

```bash
sudo -u postgres psql
```

Jalankan perintah SQL berikut (ganti `password_rahasia_anda` dengan kata sandi lokal Anda):

```sql
-- 1. Buat pengguna civicvoice
CREATE USER civicvoice WITH PASSWORD 'password_rahasia_anda';

-- 2. Buat basis data civicvoice dengan pemilik pengguna tersebut
CREATE DATABASE civicvoice OWNER civicvoice;

-- 3. Berikan hak akses penuh pada database
GRANT ALL PRIVILEGES ON DATABASE civicvoice TO civicvoice;

-- 4. Hubungkan ke basis data civicvoice
\c civicvoice

-- 5. Aktifkan ekstensi spasial PostGIS dan kriptografi pgcrypto
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 6. Verifikasi versi PostGIS yang terpasang
SELECT PostGIS_Version();

-- 7. Keluar dari prompt psql
\q
```

### 5. Konfigurasi Variabel Lingkungan (.env)

Masuk ke direktori repositori CivicVoice:

```bash
cd ~/civicvoice

# Salin berkas konfigurasi template ke root, backend, dan frontend
cp .env.example .env
cp .env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Buka berkas `.env` dan `backend/.env` (misalnya menggunakan `nano .env` dan `nano backend/.env`), lalu sesuaikan nilai `DATABASE_URL` dengan kata sandi yang Anda tentukan pada langkah 4:

```env
PORT=3000
DATABASE_URL=postgresql://civicvoice:password_rahasia_anda@localhost:5432/civicvoice
JWT_ACCESS_SECRET=kunci_rahasia_jwt_access_token_civicvoice_32_karakter_rahasia_123
JWT_REFRESH_SECRET=kunci_rahasia_jwt_refresh_token_civicvoice_32_karakter_rahasia_456
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
SEED_USER_PASSWORD=Password123!
CORS_ORIGIN=http://localhost:3001
UPLOAD_DIR=./uploads
```

Pastikan juga `frontend/.env.local` memuat URL API backend:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

### 6. Pasang Dependensi Backend & Frontend

Pasang dependensi Node.js pada kedua sub-folder proyek:

```bash
# Pasang dependensi backend
cd ~/civicvoice/backend
npm install

# Pasang dependensi frontend
cd ~/civicvoice/frontend
npm install
```

### 7. Jalankan Migrasi Basis Data & Seeding Lengkap

Jalankan skrip migrasi skema spasial dan seeder data awal secara berurutan:

```bash
cd ~/civicvoice/backend

# 1. Menjalankan migrasi skema tabel (roles, users, complaints, ticket_counters, dsb.)
npm run migrate

# 2. Mengisi peran, data SKPD, pemetaan kategori, dan akun pengguna default
npm run seed

# 3. Memuat batas administratif resmi Kabupaten Grobogan dari GeoJSON (OpenStreetMap)
npm run seed:boundary

# 4. Mengisi 60 data aduan simulasi demo MVP yang tersebar di 8 kecamatan
npm run seed:demo
```

> **Atribusi Data Spasial**:
> Batas wilayah administratif Kabupaten Grobogan bersumber dari **OpenStreetMap** di bawah lisensi **Open Database License (ODbL)**.
> Wajib mencantumkan atribusi resmi: **"© OpenStreetMap contributors"** ([osm.org/copyright](https://www.openstreetmap.org/copyright)).

### 8. Menjalankan Aplikasi (Backend & Frontend)

Buka **dua jendela/tab terminal Ubuntu** yang berbeda:

* **Terminal 1 — Server Backend API (Port 3000)**:
  ```bash
  cd ~/civicvoice/backend
  npm run dev
  ```
  Backend berjalan pada `http://localhost:3000`.

* **Terminal 2 — Aplikasi Frontend Next.js (Port 3001)**:
  ```bash
  cd ~/civicvoice/frontend
  npm run dev
  ```
  Aplikasi frontend dapat diakses melalui browser pada `http://localhost:3001`.

---

## Akun Pengguna Demo untuk Uji Coba

Seluruh akun demo telah di-seed dengan kata sandi yang merujuk pada nilai `SEED_USER_PASSWORD` di berkas `.env` (default: `Password123!`):

| Peran | Email Demo | Deskripsi & Hak Akses |
|---|---|---|
| **Warga** | `warga.demo@gmail.com` | Melaporkan aduan geotagging, melihat riwayat di "Aduan Saya", lacak aduan. |
| **Operator** | `operator.demo@gmail.com` | Mengakses "Antrean Operator" (`/operator/antrean`), verifikasi dan triase aduan. |
| **Petugas SKPD** | `skpd.demo@gmail.com` | Petugas teknis Dinas Pekerjaan Umum penindaklanjut laporan lapangan. |
| **Administrator** | `admin.demo@gmail.com` | Pengelolaan sistem dan audit log operasional. |

---

## Menjalankan Pengujian Otomatis (Testing)

Pengujian backend menggunakan Jest dan Supertest:

```bash
cd ~/civicvoice/backend

# Menjalankan seluruh rangkaian tes integrasi (Health, Auth, Complaint, Triage, Categories, Boundary)
npm test

# Menjalankan tes dengan ringkasan cakupan kode (Code Coverage Report)
npm run test:coverage
```

---

## Struktur Direktori Proyek

```
civicvoice/
├── backend/                  # REST API Express (CommonJS)
│   ├── src/
│   │   ├── modules/          # auth, complaint, triage, sla, public, notifier
│   │   ├── common/           # config, errors, middleware, crypto
│   │   ├── db/               # migrations, seeds (grobogan.geojson, seed-demo.js), pool
│   │   ├── app.js            # Inisialisasi Express & routing
│   │   └── server.js         # Entrypoint server (listen port 3000)
│   ├── tests/                # Test suite Jest & Supertest
│   └── uploads/              # Berkas foto aduan tersimpan lokal (sanitasi Sharp)
├── frontend/                 # Aplikasi Next.js (Port 3001)
│   ├── src/
│   │   ├── app/              # App Router: login, register, aduan, lacak, operator
│   │   ├── components/       # MapPicker, MapWrapper, Navbar, dsb.
│   │   └── lib/              # Client API wrapper (fetch + refresh token) & AuthContext
├── docs/                     # SRS.docx, SAD.docx, openapi.yaml (Sumber Kebenaran)
├── DEMO.md                   # Panduan skrip presentasi dan demonstrasi MVP 5 menit
├── .env.example              # Template variabel lingkungan proyek
└── README.md                 # Dokumentasi panduan instalasi & penggunaan
```

---

## Pemecahan Masalah (Troubleshooting)

### 1. PostgreSQL Belum Menyala (`ECONNREFUSED` atau `connect ENOENT`)
Jika backend gagal terhubung ke basis data:
```bash
# Periksa status PostgreSQL
sudo service postgresql status

# Jika belum aktif (stopped), jalankan service:
sudo service postgresql start
```

### 2. Port Sudah Terpakai (`EADDRINUSE: address already in use :::3000` atau `:::3001`)
Jika port 3000 atau 3001 sedang diduduki oleh proses lain di latar belakang:
```bash
# Periksa proses yang menduduki port 3000 atau 3001
lsof -i :3000
lsof -i :3001

# Matikan proses tersebut secara langsung:
fuser -k 3000/tcp
fuser -k 3001/tcp
```
Setelah proses lama dihentikan, jalankan kembali perintah `npm run dev`.

### 3. Foto Bukti Aduan atau Peta Leaflet Tidak Tampil di Browser
* **Foto Aduan Tidak Tampil**:
  1. Pastikan server backend pada port 3000 sedang berjalan.
  2. Rute statis `/uploads` pada backend telah dikonfigurasi dengan header `Cross-Origin-Resource-Policy: cross-origin` agar port 3001 dapat memuat berkas gambar secara lintas-origin.
* **Peta Leaflet Tidak Memuat Tile (Kotak Abu-Abu)**:
  1. Leaflet mengunduh ubin peta secara daring dari OpenStreetMap (`https://{s}.tile.openstreetmap.org/...`). Pastikan koneksi internet aktif.
  2. Verifikasi koneksi dari dalam terminal WSL:
     ```bash
     curl -I https://tile.openstreetmap.org
     ```
     Jika curl mengembalikan status `200 OK`, segarkan (*hard refresh*) browser menggunakan `Ctrl + F5`.
