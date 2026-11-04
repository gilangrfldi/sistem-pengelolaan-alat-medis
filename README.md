# SITA - MED: Sistem Inventarisasi & Tracking Alat Medis
> Platform Terpadu Manajemen Aset, Pemantauan Durasi Real-Time, dan Audit Operan Shift Alat Medis Ruang Perawatan Kritis (HCU).

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E_Tests-2EAD33?style=flat-square&logo=playwright)](https://playwright.dev/)

---

## 📌 Ringkasan Proyek

Pada unit perawatan intensif seperti **High Care Unit (HCU)**, akurasi alokasi inventaris alat medis, ketepatan tracking durasi penggunaan mesin berdurasi, serta kejelasan rekam jejak tindakan berkala perawat merupakan hal kritikal yang berhubungan langsung dengan keselamatan pasien (*patient safety*).

Pengelolaan konvensional berbasis formulir fisik atau spreadsheet rentan menimbulkan berbagai permasalahan:
- Selisih saldo operan serah-terima shift kerja (*shift handover discrepancy*).
- Konflik pemakaian ganda (*double-booking*) nomor unit fisik alat antar bed pasien.
- Hilangnya riwayat rincian waktu (*timestamp*) saat tindakan medis berkala dilakukan berulang kali.
- Keterlambatan isolasi unit fisik yang mengalami kerusakan sebelum masuk penanganan teknisi elektromedis.

**SITA - MED** hadir sebagai solusi sistem informasi modern berbasis web untuk mengotomatisasi pemantauan penggunaan peralatan medis secara *real-time*, memvalidasi ketersediaan unit fisik, mengelola sensus pasien per shift dinas, serta menyediakan audit trail digital yang transparan dan siap diekspor.

---

## 🚀 Fitur Utama

### 1. Dasbor & Denah Bed Interaktif (Bed-Centric Monitoring)
- **Denah 21 Bed HCU**: Visualisasi status okupansi bed (Regular B-01 s/d B-19 dan Isolasi ISO-01 & ISO-02).
- **Indikator Status Dinamis**: Menampilkan ketersediaan bed, identitas pasien aktif (Nama & No. RM), serta jumlah alat medis yang sedang aktif terpasang.
- **Responsif Multi-Device**: Tata letak adaptif yang dioptimalkan untuk perangkat layar sentuh mobile, tablet bangsal, hingga monitor desktop workstation perawat.

### 2. Kategorisasi & Tracking Alat Medis Terstruktur
- **Hitungan Waktu (Mesin Ber-Timer & Alat Berdurasi)**:
  - Pelacakan durasi berjalan (*Live Stopwatch*) untuk mesin seperti Infus Pump, Syringe Pump, Bed Elektrik, Monitor, Blanket Penghangat, Hepafilter, dan Terapi Oksigen.
  - Validasi ketat penomoran unit fisik: mencegah unit alat yang sedang aktif atau berstatus rusak dipilih kembali di bed lain.
  - Dokumentasi lokasi anatomi pemasangan (misal: Tangan Kanan, Tangan Kiri, Femoral).
- **Hitungan Kali (Frekuensi Tindakan Medis)**:
  - Pencatatan counter tindakan berkala (GDS/Cek Gula Darah, Suction, EKG, BVM, Restrain).
  - **Multi-Timestamp Audit Trail**: Merekam jam pelaksanaan dan nama perawat pelaksana di setiap kali penambahan tindakan (misal: Tindakan #1 jam 15:41 WIB sebanyak 2x, Tindakan #2 jam 16:23 WIB sebanyak 1x).
  - Modal rincian audit trail informatif tanpa tombol modifikasi yang tidak diperlukan.

### 3. Sensus Pasien Otomatis & Operan Shift Handover
- Pemantauan otomatis sesuai shift dinas rumah sakit (Shift Pagi: 07.00 - 14.00, Shift Siang: 14.00 - 21.00, Shift Malam: 21.00 - 07.00 WIB).
- Kalkulasi sensus shift: **Saldo Awal + Pasien Masuk - Pasien Keluar (BLPL) = Total Akhir Shift**.
- Mekanisme **Reset Sensus Shift** yang aman: mengarsipkan akumulasi pemakaian shift sebelumnya tanpa menghentikan timer mesin yang sedang aktif di tubuh pasien.

### 4. Manajemen Master Katalog Alat & Pelaporan Kerusakan
- Katalog master inventaris alat medis ruang HCU (tambah baru, edit spesifikasi, pengelolaan rentang penomoran unit).
- Modul pelaporan alat rusak (*rusak ringan* / *rusak berat*): unit yang dilaporkan rusak secara otomatis diisolasi dari daftar pemilihan alat siap pakai.

### 5. Otorisasi Berbasis Peran (RBAC) & Keamanan Akun
- **Dua Tingkatan Hak Akses**:
  - **Pengelola (Super Admin)**: Akses penuh manajemen katalog master alat, persetujuan aktivasi akun perawat baru, mutasi hak akses, dan penghapusan akun.
  - **Staf Perawat**: Operasional pemantauan pasien aktif, pemasangan alat, pencatatan tindakan, dan rekapitulasi data.
- Autentikasi ganda: Kredensial Email/Password dan integrasi Google OAuth.
- Pengaturan profil mandiri, pembaruan kata sandi, pengiriman tautan reset sandi, dan proteksi hapus akun pribadi dengan pengaman *countdown* 5 detik.

### 6. Rekapitulasi & Ekspor Laporan CSV
- Filter data berdasarkan rentang waktu, periode tanggal, dan kategori alat medis.
- Ekspor berkas instan ke format `.csv` terstruktur untuk kebutuhan pelaporan manajerial dan arsip rumah sakit.

---

## 🛠️ Arsitektur & Teknologi

| Komponen | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Framework** | Next.js 15 (App Router) | Server & Client Components, Route Handlers, Turbopack support |
| **Bahasa** | TypeScript | *Strict type safety* di seluruh model data, layanan, dan komponen |
| **Library UI** | React 19 | State handling modern, transisi responsif, dan hooks optimal |
| **Styling** | Tailwind CSS | Utility-first CSS, dukungan Dark Mode, dan layout responsif |
| **Komponen UI** | Radix UI & Lucide Icons | Aksesibilitas standar WAI-ARIA dan icon modern konsisten |
| **Backend & Database** | Supabase (PostgreSQL) | Layanan data relasional, Row Level Security (RLS), dan Supabase Auth |
| **Data Resilience** | Dual-Layer Persistence | Optimistic client updates + sinkronisasi database + isolasi offline cache |
| **Testing** | Playwright | Otomatisasi pengujian menyeluruh (E2E) pada 9 Critical User Journeys |

---

## 🧪 Rangkaian Pengujian Otomatis (E2E Test Suites)

Pengujian end-to-end dibangun menggunakan **Playwright** untuk memverifikasi fungsionalitas aplikasi pada skenario nyata:

| File Spesifikasi | Fokus Pengujian (Critical User Journey) |
| :--- | :--- |
| `01-auth.spec.ts` | Alur autentikasi, guard proteksi sesi, validasi kata sandi, dan mekanisme logout |
| `02-kelola-pasien.spec.ts` | Registrasi pasien bed baru, pencarian, filter klasifikasi perawatan, dan pemulangan (BLPL) |
| `03-kelola-alat-waktu.spec.ts` | Pemasangan alat berdurasi, stopwatch berjalan, isolasi unit terpakai, dan pelepasan alat |
| `04-kelola-alat-kali.spec.ts` | Counter frekuensi tindakan medis, interaksi stepper, log audit timestamp, dan tombol hapus |
| `05-lapor-alat-rusak.spec.ts` | Pelaporan unit alat rusak dari master katalog dan verifikasi penurunan unit siap pakai |
| `06-master-alat.spec.ts` | CRUD inventaris katalog master alat medis dan penomoran unit fisik |
| `07-kelola-perawat-rbac.spec.ts` | Pencegahan akses perawat non-admin ke halaman kelola, toggle aktivasi staf, dan manajemen role |
| `08-rekap-laporan-export.spec.ts` | Navigasi rekapitulasi data pasien/alat, filter shift dinas, dan verifikasi ekspor berkas CSV |
| `09-pengaturan-akun.spec.ts` | Pembaruan nama profil, form ganti kata sandi, kirim reset email, dan countdown hapus akun |

---

## 💻 Panduan Instalasi & Menjalankan Proyek

### Prasyarat
- **Node.js**: Versi `18.18.0` atau yang lebih baru.
- **npm** (atau `pnpm` / `yarn`).

### 1. Kloning Repositori
```bash
git clone https://github.com/username/sistem-pengelolaan-alat-medis.git
cd sistem-pengelolaan-alat-medis
```

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Lingkungan (`.env.local`)
Buat berkas `.env.local` pada direktori utama proyek:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Menjalankan Server Pengembangan
```bash
npm run dev
```
Buka browser dan akses aplikasi melalui [http://localhost:3000](http://localhost:3000).

### 5. Menjalankan Pengujian (E2E Testing)
```bash
# Menjalankan seluruh pengujian Playwright
npx playwright test

# Menjalankan pengujian dalam mode UI interaktif
npx playwright test --ui

# Menjalankan pemeriksaan tipe TypeScript dan linter
npx tsc --noEmit
npm run lint
```

---

## 📁 Struktur Direktori

```text
├── app/
│   ├── (dashboard)/
│   │   ├── beranda/               # Dasbor statistik HCU & ringkasan sensus shift
│   │   ├── kelola-alat/           # Manajemen pemakaian alat waktu, tindakan kali, & riwayat
│   │   │   └── master-alat/       # Katalog master alat inventaris ruang HCU
│   │   ├── kelola-pasien/         # Manajemen pasien aktif, registrasi bed, dan BLPL
│   │   ├── kelola-perawat/        # Modul RBAC & administrasi staf perawat (Pengelola)
│   │   ├── pengaturan-akun/       # Profil perawat, kredensial keamanan, & zona bahaya
│   │   └── rekap/                 # Rekapitulasi laporan audit pasien dan peralatan medis
│   ├── masuk/ & daftar/           # Alur autentikasi email & Google OAuth
│   ├── reset-password/            # Pemulihan kata sandi staf perawat
│   ├── layout.tsx                 # Root layout & konfigurasi metadata identitas aplikasi
│   └── globals.css                # Konfigurasi Tailwind CSS & CSS variables
├── components/                    # Komponen UI modular (Sidebar, Modals, BedSelector, dll.)
├── e2e/                           # Rangkaian pengujian otomatis Playwright (01 s/d 09)
├── lib/
│   ├── constants/                 # Konstanta denah bed HCU dan master referensi
│   ├── services/                  # Layanan API (alat-service, pasien-service, nurse-service)
│   ├── supabase/                  # Supabase client & server instances
│   └── types/                     # Definisi TypeScript interfaces & types
└── public/                        # Aset statis & logo aplikasi (logo.jpeg, favicon)
```

---

## 📄 Lisensi & Hak Cipta

Dikembangkan untuk kebutuhan pemantauan dan pengelolaan alat medis intensif ruang HCU RSUD Welas Asih.  
Hak Cipta © 2026 **SITA - MED**. Seluruh hak cipta dilindungi undang-undang.
