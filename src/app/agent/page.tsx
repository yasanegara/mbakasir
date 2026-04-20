import type { Metadata } from "next";
import Link from "next/link";
import styles from "../landing.module.css"; // Reuse general marketing styles
import agentStyles from "./agent.module.css";
import AgentCalculator from "./calculator";

export const metadata: Metadata = {
  title: "Program Kemitraan Agen | MbaKasir",
  description: "Jadilah Agen MbaKasir di kota Anda. Nikmati recurring income dengan margin profit hingga 90% dari UMKM yang Anda kelola.",
};

const waLink =
  "https://wa.me/6281234567890?text=Halo%20Mba%2C%20saya%20tertarik%20bergabung%20menjadi%20Agen%20MbaKasir%21";

export default function AgentLandingPage() {
  return (
    <main className={styles.page}>
      {/* ── DECORATIVE BG ── */}
      <div className={styles.bgGlow1} aria-hidden="true" />
      <div className={styles.bgGlow2} aria-hidden="true" />
      <div className={styles.bgGrid} aria-hidden="true" />

      {/* ══════════════════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════════════════ */}
      <header className={styles.header}>
        <div className={styles.headerShell}>
          <Link href="/" className={styles.brand}>
            <div className={styles.brandMark} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <div>
              <span className={styles.brandName}>MbaKasir</span>
              <span className={styles.brandSub}>Partner Kemitraan</span>
            </div>
          </Link>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          1. HERO SECTION
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.hero} style={{ gridTemplateColumns: "1fr", textAlign: "center", justifyItems: "center" }}>
        <div className={styles.heroShell} style={{ alignItems: "center" }}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} aria-hidden="true" />
            B2B Partner Program
          </div>

          <h1 className={styles.heroTitle}>
            <span className={styles.heroTitleAccent}>Bantu UMKM Naik Kelas,</span>
            <br />
            Raih Profit{" "}
            <span className={styles.heroTitleHighlight}>Hingga 90%.</span>
          </h1>

          <p className={styles.heroDesc} style={{ margin: "0 auto" }}>
            Jadilah Agen <strong>MbaKasir</strong> di kota Anda. Beli modal token harga dasar, jual dengan harga wajar. Dapatkan <strong>Passive Income</strong> selama toko terus beroperasi.
          </p>

          <div className={styles.heroActions} style={{ justifyContent: "center" }}>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn btn-accent btn-lg ${styles.heroCta}`}
            >
              Daftar Jadi Agen Sekarang
            </a>
            <a href="#kalkulator" className="btn btn-ghost btn-lg">
              Simulasi Keuntungan ↓
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          2. CALCULATOR SECTION
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.section} id="kalkulator">
        <div className={styles.sectionShell}>
          <div className={styles.sectionBadge}>💸 Kalkulator Keuntungan</div>
          <h2 className={styles.sectionTitle}>
            Simulasi Margin Profit Anda
          </h2>
          <p className={styles.sectionDesc}>
            Cukup atur jumlah toko (tenant) yang Anda tangani dan durasi berlangganan. Hitung sendiri berapa besar potensi pendapatan Anda.
          </p>
          
          <div className={agentStyles.calculatorContainer}>
            <AgentCalculator />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          3. BENEFIT SECTION
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.section}>
        <div className={styles.sectionShell}>
          <div className={styles.sectionBadge}>🤝 Kenapa Bergabung?</div>
          <h2 className={styles.sectionTitle}>
            Bukan Cuma Jualan, Tapi Membangun Bisnis
          </h2>
          
          <div className={styles.featureGrid}>
            <article className={styles.featureCard}>
              <div className={styles.featureEmoji}>📈</div>
              <h3 className={styles.featureTitle}>Modal Kecil, Untung Besar</h3>
              <p className={styles.featureDesc}>Hanya Rp 6.250 per bulan/toko. Anda bebas markup (SRP Rp 62.500/bln). Selisih marginnya murni masuk ke dompet Anda.</p>
            </article>
            <article className={styles.featureCard}>
              <div className={styles.featureEmoji}>♻️</div>
              <h3 className={styles.featureTitle}>Recurring Income</h3>
              <p className={styles.featureDesc}>Bisnis software bukan jual putus. Sekali UMKM menggunakan MbaKasir, mereka akan terus memperpanjang karena data mereka ada di dalamnya.</p>
            </article>
            <article className={styles.featureCard}>
              <div className={styles.featureEmoji}>🤝</div>
              <h3 className={styles.featureTitle}>Aplikasi Tahan Banting</h3>
              <p className={styles.featureDesc}>Berkat teknologi Offline-First, minim keluhan "Aplikasi Lemot" / "Server Down". Anda tenang, pelanggan pun senang.</p>
            </article>
            <article className={styles.featureCard}>
              <div className={styles.featureEmoji}>🚀</div>
              <h3 className={styles.featureTitle}>White-Glove Support</h3>
              <p className={styles.featureDesc}>Tim pusat selalu siap membantu Anda menangani kendala teknis (Tier 2/3). Anda fokus mencari dan membina klien UMKM lokal.</p>
            </article>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          6. FINAL CTA BANNER
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.ctaBanner}>
        <div className={styles.ctaBannerGlow} aria-hidden="true" />
        <div className={styles.ctaBannerContent}>
          <h2 className={styles.ctaBannerTitle}>
            Siap Menguasai Pasar UMKM di Kota Anda?
          </h2>
          <p className={styles.ctaBannerDesc}>
            Amankan area Anda sekarang sebelum direbut agen lain. Hubungi kami untuk kesepakatan dan akses <strong>Dashboard Agen Spesial</strong>.
          </p>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn btn-accent btn-xl ${styles.ctaBannerBtn}`}
          >
            Hubungi Mba Sekarang 🚀
          </a>
        </div>
      </section>
      
      {/* ══════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════ */}
      <footer className={styles.footer}>
        <div className={styles.footerShell}>
          <div className={styles.footerBrand}>
            <div className={styles.footerMark} aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <div>
              <p className={styles.footerBrandName}>MbaKasir Partner</p>
              <p className={styles.footerTagline}>Menyediakan solusi digital untuk memanusiakan UMKM.</p>
            </div>
          </div>
          <p className={styles.footerCopy}>
            © {new Date().getFullYear()} MbaKasir Partner Program. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
