import Link from "next/link";
import { getBrandConfig } from "@/lib/brand-config";
import BrandBadge from "@/components/brand/BrandBadge";
import styles from "../landing.module.css";

export default async function TermsPage() {
  const brand = await getBrandConfig();

  return (
    <main className={styles.page} style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── DECORATIVE BG ── */}
      <div className={styles.bgGlow1} aria-hidden="true" />
      <div className={styles.bgGrid} aria-hidden="true" />

      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerShell}>
          <Link href="/" className={styles.brand}>
            <BrandBadge logoUrl={brand.logoUrl} alt={brand.appName} size={44} />
            <div>
              <span className={styles.brandName}>{brand.appName}</span>
              <span className={styles.brandSub}>Syarat & Ketentuan</span>
            </div>
          </Link>
          <div className={styles.headerActions}>
            <Link href="/" className="btn btn-ghost btn-sm">
              Kembali
            </Link>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <section style={{ 
        flex: 1,
        padding: "120px 24px 80px",
        maxWidth: "800px",
        margin: "0 auto",
        width: "100%",
        position: "relative",
        zIndex: 1
      }}>
        <div style={{ 
          background: "hsl(var(--bg-elevated))",
          padding: "40px",
          borderRadius: "24px",
          border: "1px solid hsl(var(--border))",
          boxShadow: "0 20px 40px rgba(0,0,0,0.05)"
        }}>
          <h1 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "16px" }}>Syarat & Ketentuan Layanan</h1>
          <p style={{ color: "var(--text-muted)", marginBottom: "32px" }}>Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

          <div className="prose" style={{ display: "grid", gap: "24px", lineHeight: "1.7", color: "hsl(var(--text-secondary))" }}>
            <section>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "hsl(var(--text-primary))", marginBottom: "12px" }}>1. Penerimaan Ketentuan</h2>
              <p>
                Dengan mengakses dan menggunakan platform <strong>{brand.appName}</strong>, Anda setuju untuk terikat oleh Syarat dan Ketentuan ini. Layanan kami dirancang khusus untuk mendukung operasional UMKM Indonesia melalui sistem kasir (POS) dan manajemen inventaris.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "hsl(var(--text-primary))", marginBottom: "12px" }}>2. Akun dan Keamanan</h2>
              <p>
                Anda bertanggung jawab untuk menjaga kerahasiaan informasi akun dan password Anda. Setiap aktivitas yang terjadi di bawah akun Anda adalah tanggung jawab Anda sepenuhnya. Pastikan nomor WhatsApp yang didaftarkan aktif untuk keperluan verifikasi dan pengiriman struk digital.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "hsl(var(--text-primary))", marginBottom: "12px" }}>3. Lisensi dan Pembayaran</h2>
              <p>
                {brand.appName} menggunakan sistem lisensi berbasis "Token". Satu token biasanya setara dengan durasi penggunaan tertentu (misal: 1 bulan). Pembayaran yang telah dikonfirmasi dan diproses ke dalam bentuk token tidak dapat dibatalkan (non-refundable).
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "hsl(var(--text-primary))", marginBottom: "12px" }}>4. Penggunaan Data</h2>
              <p>
                Kami menghargai privasi data bisnis Anda. Data transaksi, stok, dan pelanggan Anda disimpan secara lokal di perangkat Anda dan disinkronkan ke server kami untuk keperluan backup dan pelaporan multi-perangkat. Kami tidak akan menjual atau membagikan data spesifik transaksi Anda kepada pihak ketiga tanpa izin.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "hsl(var(--text-primary))", marginBottom: "12px" }}>5. Batasan Tanggung Jawab</h2>
              <p>
                Meskipun kami berupaya memberikan layanan terbaik dengan teknologi <i>Offline-First</i>, kami tidak bertanggung jawab atas kerugian finansial yang disebabkan oleh kesalahan input pengguna, kerusakan perangkat keras, atau kehilangan data akibat kelalaian dalam menjaga keamanan akun.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "hsl(var(--text-primary))", marginBottom: "12px" }}>6. Perubahan Ketentuan</h2>
              <p>
                Kami berhak mengubah syarat dan ketentuan ini sewaktu-waktu untuk menyesuaikan dengan perkembangan fitur dan regulasi yang berlaku. Perubahan akan diinformasikan melalui pengumuman di dashboard aplikasi.
              </p>
            </section>
          </div>

          <div style={{ marginTop: "48px", paddingTop: "32px", borderTop: "1px solid hsl(var(--border))", textAlign: "center" }}>
            <p style={{ fontSize: "14px", marginBottom: "20px" }}>Ada pertanyaan mengenai aturan ini?</p>
            <a 
              href={`https://wa.me/${brand.supportPhone || "6281234567890"}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-primary"
            >
              Hubungi CS MbaKasir
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer} style={{ marginTop: "auto" }}>
        <div className={styles.footerShell}>
          <p className={styles.footerCopy}>
            © {new Date().getFullYear()} {brand.appName}. Seluruh hak cipta dilindungi undang-undang.
          </p>
        </div>
      </footer>
    </main>
  );
}
