# MbaKasir (Teman UMKM Indonesia) - Project Documentation

## 🚀 Overview
**MbaKasir** adalah sistem SaaS Point of Sale (POS) & ERP Mikro yang dirancang dengan filosofi **Local-First**. Aplikasi ini memungkinkan toko untuk tetap melayani pelanggan secara offline 100%, dengan sinkronisasi otomatis ke cloud (PostgreSQL) saat internet kembali tersedia.

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
- **Suggested Cash Buttons:** Memberikan saran nominal uang tunai yang sering digunakan (Uang pas, Rp50.000, Rp100.000, dll) untuk mematikan kebutuhan mengetik manual.
- **Auto-Change Calculation:** Kalkulasi kembalian real-time dengan indikator warna sukses (hijau).

### 4. Rekapitulasi & Cetak
- **Popup Ringkasan Shift:** Menampilkan Total Penjualan, Modal Awal, dan Estimasi Uang di Laci.
- **Optional Inventory Summary:** Fitur untuk melampirkan sisa stok produk pada lembar rekap (Bisa diaktifkan/dimatikan untuk menghemat kertas).
- **Print Mechanics:** CSS khusus yang memastikan hanya area struk rekap yang tercetak, menyembunyikan navigasi dashboard.

---

## 🛠️ Tech Stack
-   **Framework:** Next.js (App Router)
-   **Database Server:** PostgreSQL (Prisma ORM)
-   **Database Client:** IndexedDB (Dexie.js)
-   **Styling:** Vanilla CSS (CSS Variables for Theming)
-   **Authentication:** Custom Server-side Session Management

---

## 📂 File Penting
-   `src/app/pos/page.tsx`: Pusat logika sistem Kasir.
-   `src/app/globals.css`: Definisi variabel warna dan print styles.
-   `src/lib/db.ts`: Konfigurasi schema IndexedDB lokal.
-   `src/contexts/AppProviders.tsx`: Manajemen Tema dan State Global (Theme/Mode).

---
*Dokumentasi ini dibuat otomatis oleh Antigravity AI Assistant.*
