# PRODUCT REQUIREMENT DOCUMENT (PRD)
# PilahFoto by Limz Photography — Client Photo Proofing & Selection Platform

================================================================================
ZONA ATAS: SPESIFIKASI KEBUTUHAN PRODUK (BLUEPRINT AWAL)
================================================================================

## 1. NAMA PROJEK & PROBLEM STATEMENT
* **Nama Projek:** PilahFoto by Limz Photography
* **Problem Statement:**
  Proses seleksi foto pasca-pemotretan (*client proofing*) pada industri fotografi acara/pernikahan seringkali menimbulkan kekacauan komunikasi melalui pesan chat WhatsApp (klien mengetik nama file secara manual, merevisi pilihan berulang kali, dan melebihi kuota paket). Di sisi lain, mengunggah ratusan gigabyte file foto resolusi penuh ke server cloud khusus membebani fotografer dengan biaya sewa server dan konsumsi bandwidth yang tinggi.
* **Solusi Sistem:**
  Aplikasi web seleksi foto modern dengan pendekatan **"Zero Server Upload"** memanfaatkan infrastruktur folder publik Google Drive sebagai Content Delivery Network (CDN) thumbnail foto. Klien memilih foto secara interaktif dan mandiri melalui antarmuka ponsel pintar (*mobile-first*), dilengkapi dengan sistem pembatasan kuota ketat (*strict quota*), penguncian otomatis pasca-pengiriman (*lock-on-submit*), generator rekap pesan WhatsApp, serta alat penemu file RAW lokal (*Web Picker*) berbasis File System Access API di laptop fotografer.

---

## 2. PERAN PENGGUNA (USER ROLES)
1. **Fotografer / Admin Studio (Limz Photography):**
   * Mengakses dashboard admin melalui autentikasi aman.
   * Membuat galeri baru dengan menempelkan tautan folder publik Google Drive.
   * Menentukan batas maksimal kuota seleksi foto dan tanggal tenggat waktu (*deadline*).
   * Memantau progres pemilihan foto klien secara langsung (*realtime monitoring*).
   * Menggunakan Web Picker di browser komputer untuk menyortir dan menyalin file RAW kamera asli secara otomatis.
2. **Klien / Pelanggan (Calon Pengantin / Keluarga):**
   * Mengakses galeri seleksi privat melalui tautan unik tanpa perlu mendaftar atau mengunduh aplikasi (*zero-friction*).
   * Memilih foto favorit melalui tampilan kisi proporsional (*Justified Grid*) atau mode geser layar penuh (*Swipe Mode*).
   * Memantau sisa kuota foto secara visual melalui bilah indikator (*Pill Counter*).
   * Mengunci pilihan final dan mengirimkan rekap daftar foto terpilih langsung ke nomor WhatsApp resmi Limz Photography.

---

## 3. ARSITEKTUR & LINGKUNGAN KERJA
* **Frontend Framework:** Next.js (App Router, React 19) dengan TypeScript.
* **Styling & UI Engine:** Tailwind CSS dengan estetika *Warm Luxury Anti-AI* (palet Slate, Obsidian `#0f0e0d`, dan aksen emas `#c9a96e`).
* **Tipografi:** Cormorant Garamond (Heading editorial pernikahan mewah) dan Inter (Antarmuka data & teks interaktif).
* **Backend & API:** Next.js Route Handlers (Serverless Functions).
* **Database & Auth:** Supabase PostgreSQL & Supabase Auth.
* **Integrasi Penyimpanan:** Google Drive API v3 (Streaming Thumbnail langsung via CDN Google `lh3.googleusercontent.com` tanpa beban server).
* **Integrasi File Lokal Komputer:** Web File System Access API (`window.showDirectoryPicker`) untuk automasi pencarian file RAW di laptop fotografer.
* **Target Lingkungan Hosting:** Vercel (Production Deployment).

---

## 4. ALUR KERJA APLIKASI (USER FLOW)

```
[1. SETUP GALERI]
Fotografer Upload Foto ke Google Drive ──► Set Akses Publik ──► Tempel Link di Dashboard PilahFoto
                                                                           │
                                                                           ▼
[2. PEMBAGIAN TAUTAN]                                       Sistem Ekstrak File & ID
Fotografer Kirim Link Galeri Klien via WhatsApp ◄───────── Buat Kode Unik GAL-YYYYMM-XXX
       │
       ▼
[3. SELEKSI MANDIRI OLEH KLIEN]
Klien Buka Link di Ponsel (Tanpa Login)
       │
       ├─► Mode Grid (Justified Layout): Menampilkan rasio asli foto tanpa crop
       ├─► Mode Swipe (Ala Tinder): Geser kanan untuk "PILIH", geser kiri untuk "LEWATI"
       └─► Indikator Kuota Realtime: Membatasi agar tidak melebihi kuota paket
       │
       ▼
[4. FINALISASI & PENGUNCIAN]
Klien Klik "Kirim Pilihan" ──► Galeri Terkunci Permanen ──► Redirect ke WhatsApp Limz Photography
                                                                           │
                                                                           ▼
[5. PENGERJAAN FOTOGRAFER]                                  Rekap Tersimpan di Database
Fotografer Buka Menu Picker di Laptop ──► Pilih Folder RAW ──► File RAW Terpilih Disalin Otomatis
```

---

## 5. DESAIN BASIS DATA (SUPABASE POSTGRESQL)

### Tabel: `studios` (Profil Studio Fotografi)
| Nama Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | UUID (PK) | ID unik studio (relasi ke `auth.users`) |
| `name` | VARCHAR(100) | Nama studio ("Limz Photography") |
| `slug` | VARCHAR(50) | Domain/slug studio ("limzphotography") |
| `whatsapp` | VARCHAR(20) | Nomor WhatsApp resmi penerima rekap |
| `created_at` | TIMESTAMPTZ | Waktu pendaftaran |

### Tabel: `galleries` (Galeri Seleksi Klien)
| Nama Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | UUID (PK) | ID unik internal sistem |
| `gallery_code` | VARCHAR(30) | Kode penomoran unik (misal: `GAL-202611-001`) |
| `studio_id` | UUID (FK) | Relasi ke tabel `studios` |
| `title` | VARCHAR(150) | Judul galeri (misal: "The Wedding of Kevin & Vira") |
| `client_name` | VARCHAR(100) | Nama klien/pengantin |
| `drive_folder_url`| TEXT | Tautan folder Google Drive sumber foto |
| `drive_folder_id` | VARCHAR(100) | ID folder Google Drive yang diekstrak |
| `max_selection` | INTEGER | Batas maksimal foto yang boleh dipilih (default: 50) |
| `deadline_date` | DATE | Batas akhir tanggal pemilihan foto |
| `status` | VARCHAR(20) | Status galeri: `draft`, `active`, `submitted` |
| `created_at` | TIMESTAMPTZ | Waktu pembuatan galeri |

### Tabel: `photos` (Metadata Cache Foto dari Google Drive)
| Nama Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | UUID (PK) | ID unik foto |
| `gallery_id` | UUID (FK) | Relasi ke tabel `galleries` |
| `drive_file_id` | VARCHAR(100) | File ID dari Google Drive |
| `file_name` | VARCHAR(255) | Nama file asli kamera (misal: `DSC01234.JPG`) |
| `thumbnail_url` | TEXT | URL direct streaming CDN Google |
| `width` | INTEGER | Lebar asli gambar untuk perhitungan layout |
| `height` | INTEGER | Tinggi asli gambar untuk perhitungan layout |

### Tabel: `selections` (Hasil Pilihan Foto oleh Klien)
| Nama Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | UUID (PK) | ID unik baris seleksi |
| `gallery_id` | UUID (FK) | Relasi ke tabel `galleries` |
| `photo_id` | UUID (FK) | Relasi ke tabel `photos` |
| `notes` | TEXT | Catatan revisi khusus klien pada foto terkait |
| `selected_at` | TIMESTAMPTZ | Waktu foto ditandai |

---

## 6. ATURAN VALIDASI & LOGIKA KHUSUS (BUSINESS RULES)

1. **Format Penomoran Kode Galeri Otomatis:**
   * Pola: `GAL-YYYYMM-XXX` (Contoh: `GAL-202611-001`, `GAL-202611-002`).
   * Dihitung secara aman di backend berbasis nilai tertinggi `MAX(code) + 1` pada bulan berjalan untuk mencegah benturan nomor antar galeri.
2. **Validasi Tautan Google Drive:**
   * Sistem wajib memverifikasi dan mengekstrak ID folder dari format tautan:
     - `https://drive.google.com/drive/folders/{FOLDER_ID}`
     - `https://drive.google.com/open?id={FOLDER_ID}`
   * Jika tautan bukan folder atau folder belum berstatus publik, sistem menampilkan instruksi koreksi yang jelas.
3. **Aturan Pembatasan Kuota Ketat (Strict Limit Validation):**
   * Sistem di sisi klien dan API backend menolak penambahan seleksi jika jumlah foto terpilih telah mencapai `max_selection`.
   * Tombol pilih pada foto yang belum dipilih otomatis terkunci/nonaktif ketika kuota penuh.
4. **Logika Penguncian Permanen (Lock on Submit):**
   * Saat klien menekan tombol "Kirim Pilihan", status galeri diubah menjadi `submitted`.
   * Setelah `submitted`, seluruh aksi centang/hapus centang di galeri dinonaktifkan permanen untuk menghindari sengketa pilihan.
5. **Format Teks WhatsApp Otomatis:**
   * Pesan WhatsApp di-encode rapi berisi: Judul Galeri, Nama Klien, Total Foto Terpilih, dan Daftar Nama File Kamera secara berurutan.

---

## 7. RENCANA ANTARMUKA (USER INTERFACE)

1. **Dashboard Fotografer (`/dashboard`):**
   * Header studio dengan identitas Limz Photography.
   * Ringkasan metrik (Total Galeri, Galeri Aktif, Selesai Dipilih).
   * Tabel daftar galeri dengan tombol aksi: Buka Galeri Klien, Salin Link WA, dan Buka Web Picker.
2. **Modal / Formulir Buat Galeri Baru:**
   * Input Nama Klien & Judul Acara.
   * Input Tautan Google Drive publik.
   * Input Kuota Maksimal Foto (misal: 50) & Tanggal Batas Waktu.
3. **Halaman Galeri Klien (`/g/[code]`):**
   * *Sticky Header:* Logo studio, judul acara, dan *Pill Counter* (Contoh: `15 / 50 Foto Terpilih`).
   * *Bilah Tab:* Tab "Semua Foto", Tab "Terpilih", dan Kotak Pencarian Nama File.
   * *Tampilan Justified Grid:* Tata letak foto proporsional tanpa crop dengan indikator badge centang emas pada foto terpilih.
   * *Mode Swipe Modal:* Pratinjau layar penuh dengan tombol sentuh jempol (Hijau = Pilih, Abu-abu = Lewati).
   * *Floating Action Bar Bawah:* Menampilkan persentase kuota dan tombol "Kirim Pilihan ke WhatsApp".
4. **Halaman Web Picker Lokal (`/dashboard/picker/[code]`):**
   * Tombol "Pilih Folder RAW di Laptop".
   * Daftar nama file pilihan klien yang diekstrak dari database.
   * Kotak proses pencocokan nama file otomatis (misal: `DSC01234.JPG` -> `DSC01234.ARW`).
   * Tombol "Salin File RAW Terpilih ke Folder Baru" dan tombol "Salin Kata Kunci Lightroom".

---

## 8. KRITERIA PENGUJIAN (ACCEPTANCE CRITERIA)
* [ ] Fotografer berhasil membuat galeri baru dengan menempelkan tautan Google Drive publik.
* [ ] Thumbnail foto muncul cepat di galeri klien tanpa membebani penyimpanan server web.
* [ ] Klien dapat memilih foto secara lancar di ponsel pada mode Justified Grid dan mode Swipe.
* [ ] Indikator kuota bertambah secara realtime dan menolak pilihan jika kuota telah terpenuhi.
* [ ] Setelah tombol kirim ditekan, galeri terkunci dan membuka WhatsApp dengan pesan rekap terformat rapi.
* [ ] Web Picker di laptop fotografer mampu membaca folder lokal dan menyalin file RAW terpilih ke folder tujuan.

================================================================================
ZONA BAWAH: MASTER CONTEXT & LOGIKA SISTEM TERKINI (LIVING CONTEXT)
================================================================================

## STATUS ARSITEKTUR & LINGKUNGAN AKTIF
* **Arsitektur:** Next.js (App Router) + Tailwind CSS + Supabase (PostgreSQL).
* **Environment:** Node.js (v20+), Next.js 15/14, TypeScript.
* **Integrasi Aktif:** Google Drive API v3 (Direct Thumbnail Streaming via `lh3.googleusercontent.com`), Web File System Access API.
* **Tema Visual:** *Warm Luxury Anti-AI* (Cormorant Garamond + Inter, Obsidian Dark Mode `#0f0e0d`, Muted Gold `#c9a96e`, Surface `#1a1916`).

## SKEMA DATABASE AKTIF
* `studios`: ID, Name, Slug, WhatsApp, CreatedAt.
* `galleries`: ID, GalleryCode, StudioId, Title, ClientName, DriveFolderUrl, DriveFolderId, MaxSelection, DeadlineDate, PinCode, ExtraPhotoPrice, AllowExtraSelection, Status, CreatedAt.
* `photos`: ID, GalleryId, DriveFileId, FileName, ThumbnailUrl, Width, Height.
* `selections`: ID, GalleryId, PhotoId, Notes, SelectedAt.

## LOGIKA BISNIS AKTIF
* Penomoran: `GAL-YYYYMM-XXX` (Incremental per bulan).
* Autentikasi Fotografer: Mendukung Google OAuth via Supabase Auth serta sesi lokal Studio Limz Photography yang reaktif dengan avatar profil dan dropdown menu.
* Batasan Kuota & Ekstra Kuota: Jika `extra_photo_price > 0`, sistem mengizinkan pemilihan melebihi kuota paket dasar dengan penghitungan tagihan otomatis (`extraCount * extra_photo_price`).
* Keamanan PIN: Galeri dengan `pin_code` mewajibkan otentikasi PIN di browser klien sebelum foto dapat diakses.
* Catatan Retouch: Klien dapat menambahkan catatan instruksi khusus per foto yang disimpan ke database dan diteruskan ke rekap WhatsApp serta tabel Web Picker.
* Ekspor Media: Story 9:16 (1080x1920) dirender langsung via HTML5 Canvas; Unduh arsip ZIP seluruh foto pilihan via JSZip di browser klien.
* Generator QR Code: QR Code resolusi tinggi untuk dicetak di meja acara atau dibagikan ke tamu via modal pop-up.
* Siklus Status Galeri: `active` -> `submitted` (Read-only lock).
* Pengalihan WhatsApp: `https://api.whatsapp.com/send?phone={NO_WA}&text={REKAP_TEXT}`.

## LOG PEMBARUAN RESMI
* **v2.2.0 (Google OAuth Authentication & Full Photographer Dashboard per Pilihin.app):**
  - [x] **Autentikasi Akun Google (`src/lib/auth.ts`):** Integrasi Google OAuth via Supabase dengan fallback cerdas sesi studio lokal.
  - [x] **Halaman Khusus Login Fotografer (`src/app/login/page.tsx`):** Desain mewah Obsidian & Gold dengan tombol resmi Google Sign-In dan indikator keamanan.
  - [x] **Navbar Reaktif (`src/components/Navbar.tsx`):** Menampilkan tombol "Masuk dengan Google" bagi tamu, serta avatar foto profil Google dan dropdown menu studio bagi fotografer yang login.
  - [x] **Dashboard Fotografer Terintegrasi Penuh (`src/app/dashboard/page.tsx`):**
    * Sub-navigasi studio: Galeri, Portofolio Studio, Web Picker RAW, Sortir Otomatis.
    * Bilah cepat alat studio: Web Picker RAW, Studio Job & POS, Domain Portofolio Limz, Kamera Tamu Live QR.
    * Formulir tersemat "Buat Galeri Baru" langsung di dashboard dengan auto-scan preview Google Drive, dropdown batas waktu (7/14/30 hari), tanggal acara, WhatsApp klien, izin download, dan kuota foto.
    * Kartu galeri dinamis dengan progres bar, tombol WhatsApp 1-klik, dan modal pop-up QR Code interaktif.
    * 4 Tombol aksi kreatif di tiap kartu galeri: Bikin Wedding Book, Konten Story 9:16, Konten Reels, dan Web Picker RAW.
  - [x] **Hub Web Picker RAW (`src/app/dashboard/picker/page.tsx`):** Antarmuka pemilihan galeri untuk sinkronisasi file RAW kamera asli ke laptop fotografer.
  - [x] Verifikasi mandiri: Production build `next build` 100% sukses tanpa error (11/11 routes).
* **v2.1.0 (Zero Broken Images, Dedicated Memories Album, & Fullscreen Slider Navigation):**
  - [x] **Zero Broken Image Engine:** Penyempurnaan `/api/image-proxy` dengan 4-tier engine fallback dan server-side in-memory cache, serta perbaikan render thumbnail di `/dashboard/new`.
  - [x] **Halaman Dedicated Mode Kenangan (`/memories/[code]`):** Halaman album kenangan fullscreen 100vh ala `pilihin.app/demo-memories` dengan cover dramatis romantis, tipografi serif mewah, smooth-scroll, dan toolbar eksklusif keluarga/tamu.
  - [x] **Fullscreen Lightbox Slider Navigation:** Penambahan tombol geser melayang `◀` dan `▶`, touch swipe layar sentuh HP, keyboard arrow (`←` / `→`), nomor urut foto, dan aksi pilih/catatan langsung dari dalam modal zoom tanpa perlu bolak-balik keluar.
  - [x] **Integrasi Dashboard Studio:** Tombol shortcut `✨ Mode Kenangan ↗` pada daftar galeri studio untuk membagikan tautan album ke pengantin & keluarga.
  - [x] Verifikasi mandiri: Production build `next build` 100% sukses tanpa error.
* **v2.0.0 (Adopsi Penuh 6 Fitur Unggulan Pilihin.app):**
  - [x] **Catatan Retouch per Foto (Photo Notes):** Klien bisa menulis permintaan edit khusus per foto; tersimpan di DB, tampil di Web Picker, dan masuk ke Rekap WhatsApp.
  - [x] **Ekstra Kuota Berbayar (Upsell):** Input biaya per foto ekstra di `/dashboard/new`, kalkulator biaya real-time di floating bar, dan rincian tagihan di WhatsApp.
  - [x] **PIN 4-Digit Pengaman Galeri:** Proteksi akses galeri privat dengan layar input PIN eksklusif.
  - [x] **Pembuat Konten Story 9:16:** Generator kanvas HTML5 rasio 9:16 dengan layout elegan Limz Photography siap posting ke Instagram/WhatsApp Story.
  - [x] **Mode Album Kenangan:** Tab navigasi editorial bergaya majalah pernikahan digital (*magazine spreads*).
  - [x] **Download ZIP Foto Terpilih:** Fitur ekspor 1-klik seluruh foto pilihan menjadi file `.zip` via JSZip.
  - [x] Verifikasi mandiri: Production build lolos 100% tanpa error (`next build` 9/9 routes).
* **v1.1.0 (Peningkatan UX Tombol Seleksi "Pilih" & "Batal Pilih"):**
  - [x] Kartu Foto Grid: Mengganti simbol `+` kecil menjadi badge pill jelas bertuliskan `+ Pilih` dan `✓ Terpilih` di pojok atas foto.
  - [x] Metadata Bar: Menambahkan tombol aksi langsung `Pilih` / `Batal Pilih` di bilah info bawah kartu foto.
  - [x] Mode Swipe: Menyematkan label teks eksplisit `+ Pilih Foto` (emas/merah toggle) dan `✕ Lewati`.
  - [x] Modal Layar Penuh (Zoom): Tombol toggle jelas `+ Pilih Foto Ini` vs `✕ Batal Pilih Foto Ini` dengan warna pembeda.
  - [x] Verifikasi mandiri: Production build `next build` 100% sukses tanpa error (9/9 routes).
* **v1.0.0 (Implementasi Penuh Selesai):**
  - [x] Inisialisasi Next.js 15 App Router + Tailwind CSS + TypeScript.
  - [x] Integrasi Google Drive Zero-Upload (`/api/drive/parse` & `src/lib/drive.ts`).
  - [x] Dual-Mode Storage Engine (Supabase PostgreSQL + Persistent Local DB Fallback).
  - [x] Penomoran otomatis sekuensial anti-tabrakan `GAL-YYYYMM-XXX`.
  - [x] Dashboard Studio Fotografer (`/dashboard`) dengan metrik grid 3 kolom.
  - [x] Formulir Inisialisasi Galeri Baru (`/dashboard/new`) dengan preview scan Google Drive.
  - [x] Galeri Klien Mobile-First (`/g/[code]`) dengan Justified Grid, Mode Swipe ala Tinder, Pill Counter, Strict Quota limit, dan Generator WhatsApp Rekap.
  - [x] Modul Web Picker Lokal (`/dashboard/picker/[code]`) memanfaatkan File System Access API untuk menyalin file RAW kamera asli ke laptop dan filter Lightroom Classic.
  - [x] Verifikasi mandiri: Production build `next build` lolos 100% tanpa error.

