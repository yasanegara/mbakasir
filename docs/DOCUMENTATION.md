# MbaKasir (Teman UMKM Indonesia) - Project Documentation

## 🚀 Overview
**MbaKasir** adalah sistem SaaS Point of Sale (POS) & Manajemen Toko yang dirancang dengan filosofi **Local-First**. Aplikasi ini memungkinkan toko untuk tetap melayani pelanggan secara offline 100%, dengan sinkronisasi otomatis ke cloud (PostgreSQL) saat internet kembali tersedia. MbaKasir tidak hanya sekadar kasir, tetapi solusi manajemen operasional lengkap (Inventory, Expenses, Financial Reports).

---

## 🎨 Branding & Design System
### Branding
- **Nama Utama:** MbaKasir
- **Slogan:** Teman UMKM Indonesia
- **Logo:** 💳 (Ikon Kartu Kredit/Digital)

### Design Themes (Dual-Axis)
Sistem tema MbaKasir terdiri dari dua dimensi yang bisa dikombinasikan secara bebas:
1.  **Aksen Warna (Theme):**
    -   **Pro (Biru/Oranye):** Nuansa korporat, bersih, dan profesional.
    -   **Chic (Rose/Gold):** Nuansa anggun, mewah, dan hangat (Cocok untuk kafe/boutique).
2.  **Mode Cahaya (Mode):**
    -   **Dark Mode:** Latar belakang navy/hitam pekat (Default).
    -   **Light Mode:** Latar belakang putih bersih.

---

## 🛒 Fitur Utama POS (Kasir)
### 1. Offline-First Performance
Menggunakan **IndexedDB (via Dexie.js)** sebagai database utama di browser. Kecepatan transaksi instan tanpa hambatan jaringan.

### 2. Manajemen Shift (Sesi Kasir)
- Mewajibkan input **Modal Awal** sebelum mulai berjualan.
- Melabeli setiap transaksi dengan ID Shift untuk audit yang akurat.
- Tombol "Tutup Shift" untuk mengakhiri sesi dan melihat ringkasan.

### 3. Smart Checkout
- **Suggested Cash Buttons:** Saran nominal uang tunai (Uang pas, Rp50.000, Rp100.000, dll).
- **Auto-Change Calculation:** Kalkulasi kembalian real-time dengan indikator visual.
- **Audio Feedback:** Bunyi "Beep" pada scan barcode dan nada sukses pada transaksi berhasil.

### 4. Rekapitulasi & Cetak
- **Popup Ringkasan Shift:** Menampilkan Total Penjualan, Modal Awal, dan Estimasi Uang di Laci.
- **Optional Inventory Summary:** Fitur untuk melampirkan sisa stok produk pada lembar rekap (Bisa diaktifkan/dimatikan untuk menghemat kertas).
- **Print Mechanics:** CSS khusus yang memastikan hanya area struk rekap yang tercetak, menyembunyikan navigasi dashboard.

---

## 📦 Modul Manajemen Operasional
### 1. Inventaris & Produk
- Manajemen stok real-time dengan alert stok rendah.
- Dukungan kategori produk dan manajemen aset toko.
- Sinkronisasi otomatis antara stok POS dan gudang.

### 2. Pengeluaran (Expenses)
- Pencatatan biaya operasional (listrik, gaji, sewa).
- Validasi saldo kas: Pengeluaran tidak boleh melebihi kas yang tersedia di laci/toko.

### 3. Daftar Belanja (Shopping List)
- Perencanaan pengadaan barang berdasarkan stok yang menipis.
- Integrasi langsung ke pencatatan stok setelah barang diterima.

---

## 📊 Laporan & Validasi Keuangan
### 1. Laporan Real-time
- **Balance Sheet:** Neraca keuangan otomatis yang melacak Modal, Aset, dan Laba.
- **Sales Report:** Analisis penjualan harian, mingguan, dan bulanan.
- **Profit & Loss:** Perhitungan keuntungan bersih setelah dikurangi pengeluaran.

### 2. Validasi Integritas Data
- **Cash Flow Validation:** Mencegah saldo kas negatif di modul POS dan Expenses.
- **Initial Capital Tracking:** Sinkronisasi modal awal dari wizard setup ke dalam laporan neraca.

---

## 🌐 Ekosistem SaaS (Admin & Agent)
MbaKasir memiliki dashboard khusus untuk pengelolaan platform:
- **Super Admin:** Mengelola seluruh agent, memantau total revenue platform, dan mengontrol token lisensi.
- **Agent Dashboard:** Tempat bagi reseller/agent untuk membeli token dan mendaftarkan toko baru.
- **Storefront Online:** Setiap toko mendapatkan halaman etalase online otomatis untuk menerima pesanan dari pelanggan.

---

## 🛠️ Tech Stack
-   **Framework:** Next.js (App Router)
-   **Database Server:** PostgreSQL (Prisma ORM)
-   **Database Client:** IndexedDB (Dexie.js)
-   **Styling:** Vanilla CSS & Tailwind (untuk komponen dashboard tertentu)
-   **State Management:** React Context & Dexie Hooks

---

## 📂 File & Direktori Penting
-   `src/app/pos/`: Logika utama Point of Sale.
-   `src/app/expenses/` & `src/app/shopping-list/`: Modul manajemen operasional.
-   `src/app/reports/`: Mesin pelaporan keuangan.
-   `src/app/admin/` & `src/app/agent/`: Dashboard manajemen SaaS.
-   `src/lib/db.ts`: Schema IndexedDB lokal.
-   `src/lib/sounds.ts`: Utilitas feedback suara (Beeps/Tones).

---
*Dokumentasi ini diperbarui secara berkala oleh Antigravity AI Assistant.*
