# MbaKasir: Detailed Features List

Daftar fitur lengkap yang tersedia di platform MbaKasir, dikategorikan berdasarkan modul operasional dan level akses.

---

## 🛒 1. Point of Sale (POS) & Transaksi
Fitur utama untuk melayani pelanggan secara cepat dan akurat.
- **Offline-Mode:** Transaksi 100% tetap berjalan tanpa internet.
- **Shift Management:** 
    - Input Modal Awal (Opening Cash).
    - Laporan Penutupan Shift (Closing Summary).
    - Perhitungan Estimasi Saldo Laci (Expected vs Actual).
- **Smart Checkout:**
    - Tombol Nominal Cepat (Suggested Cash).
    - Kalkulasi Kembalian Otomatis.
    - Status Pembayaran (Lunas/Hutang/Pending).
- **Pencarian Produk:** Berdasarkan Nama, SKU, atau Scan Barcode.
- **Dukungan Keranjang (Cart):** Ubah kuantitas, hapus item, dan tambah catatan per item.
- **Diskon & Pajak:** Penerapan diskon per item atau per transaksi.
- **Audio Feedback:** Notifikasi suara untuk scan sukses dan transaksi berhasil.
- **Print Struk:** Cetak nota penjualan ke printer thermal via browser.

---

## 📦 2. Manajemen Inventaris & Produk
Kontrol stok barang untuk mencegah kehilangan dan kekurangan stok.
- **Katalog Produk:** Nama, Kategori, Harga Beli, Harga Jual, SKU/Barcode, dan Foto.
- **Multi-Kategori:** Pengelompokan produk untuk pencarian dan laporan yang lebih baik.
- **Manajemen Stok:** Update stok otomatis dari penjualan dan belanja.
- **Stock Opname:** Fitur penyesuaian stok berkala untuk menyamakan data sistem dengan fisik.
- **Stock Alert:** Notifikasi otomatis saat stok mencapai batas minimum.
- **Asset Management:** Pencatatan aset tetap toko (kursi, meja, mesin kopi, dll).

---

## 💸 3. Manajemen Operasional & Keuangan
Fitur untuk memantau pengeluaran dan kesehatan keuangan toko.
- **Pencatatan Pengeluaran (Expenses):**
    - Kategori Biaya (Gaji, Listrik, Sewa, Bahan Baku).
    - Upload Bukti Nota/Kuitansi.
    - Validasi Saldo: Tidak bisa input biaya melebihi uang kas yang ada.
- **Daftar Belanja (Shopping List):**
    - List barang yang harus dibeli berdasarkan stok rendah.
    - Ubah status belanja dari "Draft" ke "Dibeli".
- **Hutang & Piutang:** Pencatatan transaksi belum lunas (Opsional).

---

## 📊 4. Laporan & Analitik
Informasi berbasis data untuk pengambilan keputusan bisnis.
- **Dashboard Ringkasan:** Statistik penjualan hari ini, bulan ini, dan total transaksi.
- **Laporan Laba Rugi (P&L):** Pendapatan dikurangi biaya operasional secara otomatis.
- **Neraca Keuangan (Balance Sheet):** Pantau total aset, modal, dan laba ditahan.
- **Analisis Produk Terlaris:** Mengetahui produk mana yang memberikan kontribusi terbesar.
- **Riwayat Transaksi:** Filter berdasarkan tanggal, status, atau kasir.

---

## 👥 5. Manajemen SDM & Pelanggan
- **Database Pelanggan:** Simpan data kontak dan riwayat belanja pelanggan setia.
- **Manajemen Karyawan:** Penambahan akun kasir/admin dengan hak akses terbatas.
- **Log Aktivitas:** Pantau siapa yang melakukan transaksi atau perubahan data.

---

## 🌐 6. Fitur Online & Sinkronisasi
- **Cloud Sync:** Sinkronisasi data latar belakang yang aman ke PostgreSQL.
- **Online Storefront:** Website publik otomatis untuk menampilkan katalog produk ke pelanggan di luar toko.
- **Branding Custom:** Upload logo toko dan penyesuaian warna tema (Pro/Chic).

---

## 💼 7. Ekosistem Agent (Reseller)
Dashboard khusus untuk mitra distribusi MbaKasir.
- **Manajemen Toko (Tenants):** Pantau toko-toko yang berada di bawah naungan agent.
- **Beli & Aktivasi Token:** Sistem distribusi lisensi mandiri oleh agent.
- **Profit Calculator:** Alat bantu hitung potensi keuntungan agent dari penjualan token.
- **Laporan Penjualan Agent:** Rekap pendapatan dari hasil referensi toko baru.

---

## 🔑 8. Super Admin Dashboard
Pusat kendali seluruh platform.
- **Manajemen Agent:** Verifikasi dan kelola saldo/token agent.
- **Add-on Marketplace:** Aktivasi fitur tambahan untuk toko tertentu.
- **Announcements:** Kirim pesan siaran ke seluruh dashboard toko atau agent.
- **Platform Analytics:** Pantau total GMV (Gross Merchandise Volume) seluruh platform.

---
*MbaKasir: Fitur Lengkap, Bisnis Mantap.*
