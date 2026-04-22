import type { Metadata } from "next";
import Link from "next/link";
import BrandBadge from "@/components/brand/BrandBadge";
import { getBrandConfig } from "@/lib/brand-config";
import styles from "../../landing.module.css"; // Reuse general marketing styles
import agentStyles from "../agent.module.css";
import AgentCalculator from "../calculator";

export const metadata: Metadata = {
  title: "Program Kemitraan Agen | MbaKasir",
  description: "Jadilah Agen MbaKasir di kota Anda. Nikmati recurring income dengan margin profit hingga 90% dari UMKM yang Anda kelola.",
};

type Props = {
  params: Promise<{ token: string }>;
};

export default async function AgentLandingPage({ params }: Props) {
  const [{ token }, brand] = await Promise.all([params, getBrandConfig()]);
  const registerLink = `/register/agent/${token}`;

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
            <BrandBadge logoUrl={brand.logoUrl} alt={brand.appName} size={44} />
            <div>
              <span className={styles.brandName}>{brand.appName}</span>
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
            <Link
              href={registerLink}
              className={`btn btn-accent btn-lg ${styles.heroCta}`}
            >
              Daftar Jadi Agen Sekarang
            </Link>
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
              <p className={styles.featureDesc}>Berkat teknologi Offline-First, minim keluhan &quot;Aplikasi Lemot&quot; / &quot;Server Down&quot;. Anda tenang, pelanggan pun senang.</p>
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
          <Link
            href={registerLink}
            className={`btn btn-accent btn-xl ${styles.ctaBannerBtn}`}
          >
            Daftar Menjadi Mitra 🚀
          </Link>
        </div>
      </section>
      
      {/* ══════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════ */}
      <footer className={styles.footer}>
        <div className={styles.footerShell}>
          <div className={styles.footerBrand}>
            <BrandBadge logoUrl={brand.logoUrl} alt={brand.appName} size={40} />
            <div>
              <p className={styles.footerBrandName}>{brand.appName} Partner</p>
              <p className={styles.footerTagline}>Menyediakan solusi digital untuk memanusiakan UMKM.</p>
            </div>
          </div>
          <p className={styles.footerCopy}>
            © {new Date().getFullYear()} {brand.appName} Partner Program. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
