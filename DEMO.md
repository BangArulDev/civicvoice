# Skrip Panduan Demonstrasi MVP CivicVoice (Durasi: 5 Menit)

Dokumen ini memuat panduan langkah demi langkah demonstrasi sistem **CivicVoice** (Platform Pengaduan Publik Berbasis Geotagging Kabupaten Grobogan) di hadapan dosen penguji. Dirancang padat, runtut, dan terstruktur dengan estimasi total waktu tepat **5 menit**.

---

## Ringkasan Alur Waktu (Timeline)

| Waktu | Bagian | Fokus Demonstrasi |
|---|---|---|
| **00:00 - 00:45** | Bagian 1 | Pembukaan & Kesiapan Layanan (Terminal Ubuntu WSL 2) |
| **00:45 - 01:45** | Bagian 2 | Portal Warga: Pembuatan Aduan Geotagging & Foto |
| **01:45 - 02:30** | Bagian 3 | Validasi Spasial Batas Grobogan (Penolakan Titik Luar) |
| **02:30 - 03:15** | Bagian 4 | Transparansi Pelapor: Menu "Aduan Saya" & "Lacak Aduan" |
| **03:15 - 04:15** | Bagian 5 | Portal Operator: Antrean Triase FIFO & Sebaran 8 Kecamatan |
| **04:15 - 05:00** | Bagian 6 | Integritas Rekayasa Perangkat Lunak: Git, Docs, & Testing |

---

## Langkah Demi Langkah Demonstrasi

### Bagian 1: Pembukaan & Kesiapan Layanan (Menit 00:00 - 00:45)

* **Apa yang Dibuka**: Jendela terminal Ubuntu (WSL 2) terbagi dua atau browser yang siap menampilkan server.
* **Apa yang Diklik / Dijalankan**:
  ```bash
  sudo service postgresql status
  ```
  Tunjukkan dua tab terminal yang sedang menjalankan server:
  - Tab 1: Server Backend API di port `3000` (`npm run dev`).
  - Tab 2: Server Frontend Next.js di port `3001` (`npm run dev`).
* **Apa yang Diucapkan**:
  > *"Selamat pagi/siang Bapak/Ibu dosen penguji. Saya Amrully Arun Hadi, mempresentasikan proyek CivicVoice, platform pengaduan publik berbasis geotagging untuk wilayah Kabupaten Grobogan, Jawa Tengah.*
  >
  > *Sistem ini dibangun dengan Node.js Express, basis data spasial PostgreSQL PostGIS, dan Next.js. Seluruh infrastruktur telah aktif di lingkungan WSL 2: PostgreSQL PostGIS berjalan, backend API aktif pada port 3000, dan frontend Next.js pada port 3001."*
* **Hasil yang Harus Terlihat**:
  - Terminal menampilkan PostgreSQL dalam status `online/running`.
  - Backend API Express siap melayani permintaan pada `http://localhost:3000/api/v1`.
  - Frontend Next.js siap diakses pada `http://localhost:3001`.

---

### Bagian 2: Portal Warga & Pembuatan Aduan Geotagging (Menit 00:45 - 01:45)

* **Apa yang Dibuka**: Browser pada alamat `http://localhost:3001`.
* **Apa yang Diklik**:
  1. Klik tombol **"Masuk"** di kanan atas navbar.
  2. Isi email `warga.demo@gmail.com` dan kata sandi `Password123!`, lalu klik **"Masuk"**.
  3. Setelah dialihkan ke beranda, klik menu **"Buat Aduan"** (`/aduan/baru`).
  4. Pilih Kategori: **"Jalan Rusak"**.
  5. Masukkan Judul: *"Aspal Berlubang Parah di Depan Pasar Purwodadi"*.
  6. Masukkan Kronologi: *"Permukaan aspal terkelupas sedalam 15 cm, membahayakan pengendara motor saat malam hari."*
  7. Tunjukkan peta Leaflet: titik GPS otomatis terdeteksi atau geser pin ke pusat Purwodadi (`lat: -7.0881, lng: 110.9167`).
  8. Unggah satu berkas foto bukti aduan (format JPG/PNG).
  9. Klik tombol **"Kirim Aduan"**.
* **Apa yang Diucapkan**:
  > *"Pertama, saya login sebagai warga terdaftar. Pada modul Buat Aduan, warga dapat menyampaikan aspirasi dengan koordinat spasial presisi dan foto bukti.*
  >
  > *Foto yang diunggah otomatis disanitasi dari metadata EXIF sensitif dan dikompresi menjadi ukuran optimal menggunakan pustaka Sharp di sisi backend. Saat formulir dikirim, sistem secara atomik di dalam satu transaksi membuat nomor tiket urut harian unik."*
* **Hasil yang Harus Terlihat**:
  - Muncul notifikasi sukses warna hijau: *"Aduan Berhasil Dikirim"*.
  - Tertera nomor tiket resmi berformat `CV-YYYYMMDD-NNNN` (misal `CV-20261116-0001`).

---

### Bagian 3: Validasi Spasial Batas Grobogan (Menit 01:45 - 02:30)

* **Apa yang Dibuka**: Tetap di halaman **"Buat Aduan"** (`http://localhost:3001/aduan/baru`).
* **Apa yang Diklik**:
  1. Isi formulir secara cepat: Kategori *"Sampah Menumpuk"*, Judul *"Uji Coba Titik Luar Wilayah"*, Deskripsi *"Pengujian koordinat luar"*.
  2. Pada peta Leaflet, geser pin lokasi jauh ke arah barat ke wilayah Kota Semarang (misalnya titik koordinat `lat: -6.9667, lng: 110.4203`).
  3. Lampirkan berkas foto sembarang.
  4. Klik tombol **"Kirim Aduan"**.
* **Apa yang Diucapkan**:
  > *"Keunggulan utama CivicVoice adalah validasi batas wilayah administratif spasial secara native di tingkat basis data.*
  >
  > *Jika pelapor menggeser pin ke luar batas Kabupaten Grobogan—misalnya ke Kota Semarang—sistem backend langsung menolaknya dengan kode status HTTP 422 Unprocessable Entity. Validasi ini memanfaatkan fungsi spasial PostGIS `ST_Covers` terhadap poligon batas administratif resmi dari OpenStreetMap yang telah disanitasi menggunakan `ST_MakeValid`."*
* **Hasil yang Harus Terlihat**:
  - Formulir menolak pengiriman dan menampilkan kotak pesan error merah:
    `"VALIDATION_ERROR: Koordinat berada di luar wilayah layanan Kabupaten Grobogan (issue: out_of_service_area)"`.

---

### Bagian 4: Transparansi Pelapor: Menu "Aduan Saya" & "Lacak Aduan" (Menit 02:30 - 03:15)

* **Apa yang Dibuka**: Navbar aplikasi.
* **Apa yang Diklik**:
  1. Klik menu **"Aduan Saya"** (`/aduan-saya`): perlihatkan daftar aduan milik akun warga yang baru saja dibuat.
  2. Buka menu **"Lacak Aduan"** (`/lacak`).
  3. Masukkan nomor tiket yang baru dibuat (atau nomor tiket demo simulasi seperti `CVD-0001`), lalu klik tombol **"Cari Aduan"**.
* **Apa yang Diucapkan**:
  > *"Warga dapat memantau aduan pribadinya secara langsung melalui menu 'Aduan Saya'.*
  >
  > *Selain itu, untuk menjamin akuntabilitas publik, tersedia fitur 'Lacak Aduan' berbasis nomor tiket tanpa mewajibkan login. Masyarakat dapat melihat rincian progres penanganan, foto bukti lapangan, serta riwayat tahapan status yang transparan mulai dari baru, diverifikasi, diproses, hingga selesai."*
* **Hasil yang Harus Terlihat**:
  - Halaman menampilkan kartu detail aduan lengkap: badge status, instansi pembidang, koordinat titik pada peta, dan urutan kronologi waktu (*timeline*) pada tabel riwayat status.

---

### Bagian 5: Portal Operator: Antrean Triase FIFO & Sebaran 8 Kecamatan (Menit 03:15 - 04:15)

* **Apa yang Dibuka**: Menu autentikasi navbar.
* **Apa yang Diklik**:
  1. Klik tombol **"Keluar"** (Logout) dari akun warga.
  2. Klik **"Masuk"**, masukkan akun operator: `operator.demo@gmail.com` dan kata sandi `Password123!`.
  3. Klik menu **"Antrean Operator"** (`/operator/antrean`).
  4. Gulir daftar antrean triase yang menampilkan data aduan hasil seeder demo.
* **Apa yang Diucapkan**:
  > *"Sekarang saya beralih peran (RBAC) sebagai Operator. Di portal operator, terdapat antrean triase berprinsip First-In First-Out (FIFO) yang memprioritaskan aduan terlama.*
  >
  > *Untuk keperluan demo MVP ini, telah disiapkan 60 data aduan simulasi yang tersebar di 8 kecamatan utama Grobogan: Purwodadi, Godong, Gubug, Toroh, Wirosari, Pulokulon, Geyer, dan Tawangharjo.*
  >
  > *Setiap item antrean telah dilengkapi thumbnail foto instan, usulan dinas (SKPD) terkait secara otomatis, serta perlindungan privasi di mana identitas pelapor anonim sama sekali tidak diekspos ke antarmuka triase."*
* **Hasil yang Harus Terlihat**:
  - Daftar antrean aduan `CVD-XXXX` dengan thumbnail foto Sharp yang jernih.
  - Kolom nama SKPD usulan (misal: *Dinas Pekerjaan Umum*, *Dinas Lingkungan Hidup*).
  - Paginasi antrean berjalan rapi.

---

### Bagian 6: Kerapian Rekayasa Perangkat Lunak, Git, & Dokumen Arsitektur (Menit 04:15 - 05:00)

* **Apa yang Dibuka**: Terminal Ubuntu & teks editor / folder proyek.
* **Apa yang Diklik / Dijalankan**:
  1. Tampilkan riwayat commit Git di terminal:
     ```bash
     git log --oneline -n 6
     ```
  2. Tampilkan isi folder `docs/`:
     ```bash
     ls -l docs/
     ```
     (Tunjukkan berkas `SRS.docx`, `SAD.docx`, dan kontrak API `openapi.yaml`).
  3. Jalankan pengujian unit/integrasi otomatis:
     ```bash
     npm test
     ```
* **Apa yang Diucapkan**:
  > *"Sebagai penutup, pengembangan CivicVoice mematuhi standar rekayasa perangkat lunak yang ketat:*
  >
  > *1. Seluruh kode backend mengikuti pola modular Routes - Controller - Service - Repository.*
  > *2. Riwayat Git menggunakan Conventional Commits secara konsisten (feat, fix, docs, test).*
  > *3. Seluruh endpoint mematuhi kontrak API pada openapi.yaml dan dokumen SRS/SAD.*
  > *4. Rangkaian uji otomatis Jest dan Supertest mencakup pengujian Health, Autentikasi, Pelaporan Geotagging, Triase, hingga Verifikasi Batas Spasial dengan status 100% lulus (PASS).*
  >
  > *Demikian presentasi demo MVP CivicVoice. Terima kasih atas perhatian Bapak/Ibu dosen penguji, saya siap menerima masukan dan tanya jawab."*
* **Hasil yang Harus Terlihat**:
  - Output `git log` rapi dan deskriptif.
  - Seluruh test suites Jest berstatus **PASS** (warna hijau).

---

## Rencana Cadangan (Contingency Plan jika Terjadi Kendala Teknis)

Jika saat pelaksanaan demo langsung di hadapan dosen terjadi kendala teknis tak terduga, lakukan tindakan cadangan berikut:

### Skenario 1: Basis Data atau Server Backend Tidak Merespons
* **Gejala**: Tampil error `500 Internal Server Error` atau `Network Error` saat membuat aduan.
* **Tindakan Pemulihan Cepat (< 10 detik)**:
  Buka tab terminal Ubuntu, jalankan satu baris perintah pemulihan:
  ```bash
  sudo service postgresql restart && fuser -k 3000/tcp && cd ~/civicvoice/backend && npm run dev
  ```
  Segarkan browser dan ulangi langkah demo.

### Skenario 2: Koneksi Internet Kampus Mati / Sangat Lambat (Peta Abu-Abu)
* **Gejala**: Peta Leaflet tidak memuat gambar ubin OpenStreetMap.
* **Solusi & Narasi**:
  Jelaskan kepada dosen bahwa ubin peta OpenStreetMap memerlukan akses internet publik:
  > *"Peta Leaflet memanfaatkan tile server OpenStreetMap secara langsung. Walaupun koneksi internet publik lambat, logika koordinat geotagging PostGIS tetap berjalan 100% presisi melalui koordinat latitude dan longitude yang tercatat."*
  Warga tetap dapat menginput koordinat melalui formulir atau simulasi aduan.

### Skenario 3: Perangkat Keras / Laptop Bermasalah Total
* **Solusi Cadangan**:
  Siapkan video rekaman layar (*screen recording*) MP4 berdurasi 5 menit yang mendemokan ke-6 langkah di atas dalam sebuah flashdisk atau Google Drive yang siap diputar sewaktu-waktu di laptop lain.
