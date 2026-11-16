# CivicVoice

Platform pengaduan publik dan aspirasi warga berbasis *geotagging* untuk wilayah **Kabupaten Grobogan, Jawa Tengah**. Proyek ini dikembangkan untuk mata kuliah **Pengembangan Berbasis Platform (GA07309)** di Universitas An Nuur.

CivicVoice memungkinkan warga menyampaikan aduan dengan koordinat spasial presisi dan foto bukti, menjamin privasi pelapor melalui enkripsi data anonim, serta memfasilitasi proses triase dan pemantauan SLA oleh instansi pemerintah daerah (SKPD).

---

## Arsitektur & Tech Stack

- **Backend**: Node.js (LTS) + Express (CommonJS)
- **Database**: PostgreSQL 14+ dengan ekstensi spasial **PostGIS**
- **Validasi**: Zod
- **Autentikasi**: JWT (Access Token 15 menit + Refresh Token) & bcryptjs
- **Keamanan**: Helmet, CORS, Express-rate-limit, enkripsi AES-256-GCM
- **Pengolahan Media**: Multer & Sharp
- **Penjadwal**: Node-cron (otomatisasi evaluasi SLA)
- **Pengujian**: Jest & Supertest
- **Frontend**: Next.js (React) + Leaflet / OpenStreetMap

---

## Panduan Setup Lingkungan dari Nol (Ubuntu / WSL 2)

Seluruh perintah di bawah ini dijalankan di terminal **Ubuntu (WSL 2)**.

### 1. Perbarui Sistem & Cek/Instal Git

Pastikan indeks paket Ubuntu diperbarui dan Git sudah terpasang:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential
git --version
```

### 2. Pasang Node.js LTS menggunakan NVM (Node Version Manager)

Disarankan menggunakan NVM agar versi Node.js mudah dikelola dan terisolasi dengan rapi:

```bash
# Unduh dan pasang skrip instalasi NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Muat konfigurasi nvm ke sesi shell saat ini
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Pasang dan gunakan Node.js LTS (versi 20 atau 22)
nvm install --lts
nvm use --lts

# Verifikasi versi node dan npm
node -v
npm -v
```

### 3. Pasang PostgreSQL & Ekstensi PostGIS

Pasang server PostgreSQL beserta ekstensi spasial PostGIS:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib postgis postgresql-*-postgis-*

# Jalankan service PostgreSQL
sudo service postgresql start

# Cek status PostgreSQL
sudo service postgresql status
```

### 4. Konfigurasi Pengguna, Database, dan PostGIS

Masuk ke terminal PostgreSQL (`psql`) sebagai user default `postgres`:

```bash
sudo -u postgres psql
```

Jalankan perintah SQL berikut di dalam prompt `psql` (ganti `password_rahasia_anda` dengan kata sandi lokal Anda):

```sql
-- 1. Buat pengguna civicvoice
CREATE USER civicvoice WITH PASSWORD 'password_rahasia_anda';

-- 2. Buat basis data civicvoice dengan pemilik pengguna tersebut
CREATE DATABASE civicvoice OWNER civicvoice;

-- 3. Berikan hak akses penuh pada database
GRANT ALL PRIVILEGES ON DATABASE civicvoice TO civicvoice;

-- 4. Hubungkan ke database civicvoice yang baru dibuat
\c civicvoice

-- 5. Aktifkan ekstensi PostGIS untuk dukungan spasial/koordinat
CREATE EXTENSION IF NOT EXISTS postgis;

-- 6. Verifikasi versi PostGIS yang terpasang
SELECT PostGIS_Version();

-- 7. Keluar dari psql
\q
```

### 5. Konfigurasi Variabel Lingkungan (.env)

Masuk ke direktori proyek CivicVoice:

```bash
cd ~/civicvoice

# Salin berkas konfigurasi contoh
cp .env.example .env
cp .env.example backend/.env
```

Buka berkas `.env` (misal menggunakan `nano .env`) dan sesuaikan `DATABASE_URL` dengan kata sandi yang Anda tentukan pada langkah 4:

```env
PORT=3000
DATABASE_URL=postgresql://civicvoice:password_rahasia_anda@localhost:5432/civicvoice
JWT_ACCESS_SECRET=kunci_rahasia_akses_jwt_anda_yang_sangat_panjang_dan_aman_123
JWT_REFRESH_SECRET=kunci_rahasia_refresh_jwt_anda_yang_sangat_panjang_dan_aman_456
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

> **Catatan**: `ENCRYPTION_KEY` digunakan untuk enkripsi AES-256-GCM identitas pelapor anonim, wajib 64 karakter heksadesimal (32 byte).

### 6. Pasang Dependensi Backend

Masuk ke direktori `backend/` dan pasang dependensi Node.js:

```bash
cd ~/civicvoice/backend
npm install
```

### 7. Jalankan Migrasi Basis Data & Data Awal (Seeds)

Jalankan skrip migrasi untuk membentuk tabel-tabel sesuai spesifikasi ERD:

```bash
# Menjalankan migrasi skema tabel
npm run migrate

# Memasukkan data awal standar (peran, kategori, akun demo, dsb.)
npm run seed

# Memuat batas administratif resmi Kabupaten Grobogan dari berkas GeoJSON
npm run seed:boundary
```

> **Atribusi Data Spasial & Batas Wilayah**:
> Batas wilayah administratif Kabupaten Grobogan bersumber dari **OpenStreetMap** di bawah lisensi **Open Database License (ODbL)**.
> Wajib mencantumkan atribusi resmi: **"© OpenStreetMap contributors"** (informasi hak cipta dan lisensi lengkap: [osm.org/copyright](https://www.openstreetmap.org/copyright)).


### 8. Jalankan Server Backend

Untuk menjalankan server dalam mode pengembangan (*auto-reload* dengan `nodemon`):

```bash
npm run dev
```

Atau untuk menjalankan dalam mode produksi standar:

```bash
npm start
```

Server backend akan berjalan di `http://localhost:3000`.

### 9. Menjalankan Pengujian (Unit & Integration Test)

Untuk menjalankan seluruh rangkaian pengujian otomatis menggunakan Jest:

```bash
npm test
```

---

## Struktur Direktori Proyek

```
civicvoice/
├── backend/
│   ├── src/
│   │   ├── modules/          # Modul fungsional per domain
│   │   │   ├── auth/         # Autentikasi & RBAC
│   │   │   ├── complaint/    # M1: Aduan warga & geotagging
│   │   │   ├── triage/       # M2: Triase & disposisi operator
│   │   │   ├── sla/          # M3: Manajemen SLA & tindak lanjut SKPD
│   │   │   ├── public/       # M4: Portal publik, heatmap, & ekspor CSV
│   │   │   └── notifier/     # Notifikasi internal
│   │   ├── common/           # Middleware, utilitas, handler error, konfigurasi
│   │   ├── db/               # Migrasi SQL berurutan, seeder, koneksi pool pg
│   │   ├── app.js            # Inisialisasi Express & middleware global
│   │   └── server.js         # Entrypoint server (listen port)
│   ├── tests/                # Test suite Jest & Supertest
│   └── package.json          # Konfigurasi dependensi backend
├── frontend/                 # Aplikasi Next.js antarmuka pengguna
├── docs/                     # Dokumentasi SRS, SAD, dan openapi.yaml
├── .env.example              # Template variabel lingkungan
├── .gitattributes            # Konfigurasi eol=lf
├── .gitignore                # Berkas/direktori yang diabaikan git
└── README.md                 # Dokumentasi utama proyek
```
