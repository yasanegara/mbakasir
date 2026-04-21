import type { CSSProperties } from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import styles from "./landing.module.css";
import FaqAccordion from "./landing/FaqAccordion";

// ─── DATA ───────────────────────────────────────────────────────────────────

const problems = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    title: "Duit Kasir Sering Selisih",
    desc: "Tiap tutup toko, selisihnya bikin kepala pusing. Entah siapa salah, entah ke mana uangnya. Bocor halus yang lama-lama menguras omzet.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    title: "Stok Bahan Baku Kacau",
    desc: "Susah ngitung stok beras, telur, & bumbu secara manual—apalagi kalau jualan menu paketan. Salah hitung, margin terkikis tanpa disadari.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    title: "Aplikasi Kasir Lain Mahal Banget",
    desc: "Harga Rp 3 juta/tahun, butuh internet kencang, dan support-nya lambat. Padahal fiturnya belum tentu pas buat UMKM seperti usaha Anda.",
  },
];

const features = [
  {
    emoji: "⚡",
    badge: "Anti-Lemot & Anti-Jebol",
    title: "Jualan Gas Terus, Walau Internet Putus",
    desc: "Teknologi Local-First artinya semua transaksi tersimpan di HP Anda dulu. Data otomatis sync ke cloud saat online kembali. WiFi mati? Bukan masalah.",
    highlight: "Offline-First Technology",
  },
  {
    emoji: "🍳",
    badge: "Resep Pintar (Bill of Material)",
    title: "Jual 1 Porsi, Stok Bahan Otomatis Terpotong",
    desc: "Daftarkan resep menu Anda sekali. Setiap transaksi, stok beras, telur, minyak, dan semua bahan langsung berkurang otomatis. Akurat tanpa hitung manual.",
    highlight: "Smart Recipe Engine",
  },
  {
    emoji: "💬",
    badge: "CRM & Struk WhatsApp",
    title: "Bikin Pelanggan Balik Lagi & Lagi",
    desc: "Kirim struk digital langsung via WhatsApp. Simpan data pelanggan, beri sapaan otomatis di hari spesial. Pelanggan merasa diperhatikan, omzet pun naik.",
    highlight: "Customer Retention System",
  },
  {
    emoji: "📊",
    badge: "Dashboard & Laporan",
    title: "Laba Rugi Kelihatan Setiap Hari",
    desc: "Pantau omzet, biaya pokok, dan laba bersih dari satu layar. Ambil keputusan bisnis berdasarkan data nyata, bukan feeling semata.",
    highlight: "Real-time Analytics",
  },
];


// ─── SERVER PAGE ─────────────────────────────────────────────────────────────

export default async function IndexPage() {
  const session = await getSession();
  const isAuthenticated = Boolean(session);
  const dashboardHref = isAuthenticated ? "/dashboard" : "/login";

  const waLink =
    "https://wa.me/6281234567890?text=Halo%20Mba%2C%20saya%20mau%20aktivasi%20MbaKasir%20dengan%20promo%20750rb%2Ftahun%21";

  return (
    <main className={styles.page}>
      {/* ── DECORATIVE BG ── */}
      <div className={styles.bgGlow1} aria-hidden="true" />
      <div className={styles.bgGlow2} aria-hidden="true" />
      <div className={styles.bgGrid} aria-hidden="true" />

      {/* ══════════════════════════════════════════════════════════════════
          HEADER / NAV
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
              <span className={styles.brandSub}>Intelligence Pro</span>
            </div>
          </Link>

          <nav className={styles.nav} aria-label="Menu utama">
            <a href="#masalah" className={styles.navLink}>Masalah</a>
            <a href="#fitur" className={styles.navLink}>Fitur</a>
            <a href="#harga" className={styles.navLink}>Harga</a>
          </nav>

          <div className={styles.headerActions}>
            {isAuthenticated ? (
              <Link href="/dashboard" className="btn btn-ghost btn-sm" id="header-dashboard-btn">
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="btn btn-ghost btn-sm" id="header-login-btn">
                Login
              </Link>
            )}
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn btn-accent btn-sm ${styles.headerCta}`}
              id="header-cta-btn"
            >
              Aktifkan Sekarang
            </a>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          1. HERO SECTION
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.hero}>
        <div className={styles.heroShell}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} aria-hidden="true" />
            Offline-First · Local UMKM · Mulai Hari Ini
          </div>

          <h1 className={styles.heroTitle}>
            <span className={styles.heroTitleAccent}>Sistem Kasir Berkelas,</span>
            <br />
            Harga{" "}
            <span className={styles.heroTitleHighlight}>Cuma Parkir Motor.</span>
          </h1>

          <p className={styles.heroDesc}>
            Bukan sekadar kasir. <strong>MbaKasir</strong> adalah asisten cerdas yang jaga stok bahan baku, hitung laba-rugi otomatis, dan tetap <strong>sat-set jualan walau WiFi mati</strong>.
          </p>

          <div className={styles.heroActions}>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn btn-accent btn-lg ${styles.heroCta}`}
              id="hero-primary-cta"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
              Aktifkan Toko Sekarang (Hanya 750rb/Tahun)
            </a>
            <a href="#fitur" className={`btn btn-ghost btn-lg`} id="hero-secondary-cta">
              Lihat Fitur →
            </a>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <strong>Rp 2.055</strong>
              <span>per hari</span>
            </div>
            <div className={styles.heroStatDivider} aria-hidden="true" />
            <div className={styles.heroStat}>
              <strong>100%</strong>
              <span>Offline-Ready</span>
            </div>
            <div className={styles.heroStatDivider} aria-hidden="true" />
            <div className={styles.heroStat}>
              <strong>∞</strong>
              <span>Transaksi / Bulan</span>
            </div>
          </div>
        </div>

        {/* ── Floating POS mockup card ── */}
        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.mockupCard}>
            <div className={styles.mockupHeader}>
              <div className={styles.mockupDots}>
                <span style={{ background: "#ff5f57" }} />
                <span style={{ background: "#febc2e" }} />
                <span style={{ background: "#28c840" }} />
              </div>
              <span className={styles.mockupTitle}>MbaKasir POS</span>
              <span className={styles.mockupOnline}>
                <span className={styles.onlineDot} />
                Offline Mode
              </span>
            </div>
            <div className={styles.mockupBody}>
              <div className={styles.mockupRow}>
                <span>Nasi Goreng Spesial</span>
                <span>×2</span>
                <span>Rp 30.000</span>
              </div>
              <div className={styles.mockupRow}>
                <span>Es Teh Manis</span>
                <span>×3</span>
                <span>Rp 12.000</span>
              </div>
              <div className={styles.mockupRow}>
                <span>Ayam Geprek</span>
                <span>×1</span>
                <span>Rp 18.000</span>
              </div>
              <div className={styles.mockupDivider} />
              <div className={`${styles.mockupRow} ${styles.mockupTotal}`}>
                <span>Total</span>
                <span />
                <span>Rp 60.000</span>
              </div>
              <div className={styles.mockupBomAlert}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Stok bahan otomatis dipotong
              </div>
            </div>
            <div className={styles.mockupFooter}>
              <button className={styles.mockupPayBtn}>Bayar Tunai</button>
              <button className={styles.mockupWaBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                Struk WA
              </button>
            </div>
          </div>
          <div className={styles.mockupGlow} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          2. PROBLEM SECTION
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.section} id="masalah">
        <div className={styles.sectionShell}>
          <div className={styles.sectionBadge}>😓 Penyakit UMKM yang Familiar</div>
          <h2 className={styles.sectionTitle}>
            Apakah Usaha Anda Juga Mengalami Ini?
          </h2>
          <p className={styles.sectionDesc}>
            Kalau iya, berarti Anda butuh MbaKasir sekarang juga.
          </p>
          <div className={styles.problemGrid}>
            {problems.map((p, i) => (
              <article key={i} className={styles.problemCard}>
                <div className={styles.problemIcon}>{p.icon}</div>
                <h3 className={styles.problemTitle}>{p.title}</h3>
                <p className={styles.problemDesc}>{p.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          3. SOLUTION / FEATURES SECTION
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.section} id="fitur">
        <div className={styles.sectionShell}>
          <div className={styles.sectionBadge}>✅ Kenapa MbaKasir?</div>
          <h2 className={styles.sectionTitle}>
            Asisten Cerdas yang Kerja 24 Jam untuk Toko Anda
          </h2>
          <p className={styles.sectionDesc}>
            Bukan cuma mencatat transaksi. MbaKasir aktif menjaga stok, menghitung margin, dan menjaga hubungan dengan pelanggan Anda.
          </p>
          <div className={styles.featureGrid}>
            {features.map((f, i) => (
              <article key={i} className={styles.featureCard}>
                <div className={styles.featureEmoji}>{f.emoji}</div>
                <span className={styles.featureBadge}>{f.badge}</span>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
                <div className={styles.featureHighlight}>{f.highlight}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          4. PRICING SECTION
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.section} id="harga">
        <div className={styles.sectionShell}>
          <div className={styles.sectionBadge}>🏷️ Harga yang Bikin Senyum</div>
          <h2 className={styles.sectionTitle}>
            Pilih Paket yang Paling Cocok Buat Warungmu
          </h2>
          <p style={{ textAlign: "center", color: "var(--text-muted)", marginBottom: "40px", fontSize: "16px" }}>
            Bayar bulanan atau hemat lebih banyak dengan paket tahunan. Semua fitur sama!
          </p>

          <div className={styles.pricingWrap} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", maxWidth: "900px", margin: "0 auto", gap: "24px" }}>

            {/* BULANAN */}
            <div className={styles.pricingCard} style={{ opacity: 0.92 }}>
              <div className={styles.pricingTop}>
                <div>
                  <p className={styles.pricingLabel}>Paket Bulanan</p>
                  <div className={styles.pricingMain}>
                    <span className={styles.pricingCurrency}>Rp</span>
                    <span className={styles.pricingAmount}>75.000</span>
                    <span className={styles.pricingPeriod}>/bulan</span>
                  </div>
                  <p className={styles.pricingMicro}>
                    💡 <strong>Rp 2.500/hari.</strong> Coba dulu, bayar bulanan, bisa berhenti kapan saja.
                  </p>
                </div>
              </div>

              <ul className={styles.pricingFeatureList}>
                <li><span className={styles.checkmark}>✔</span> POS Kasir (Unlimited Transaksi)</li>
                <li><span className={styles.checkmark}>✔</span> Manajemen Stok & Bahan Baku</li>
                <li><span className={styles.checkmark}>✔</span> Resep Pintar / Bill of Material (BoM)</li>
                <li><span className={styles.checkmark}>✔</span> Laporan Laba-Rugi Otomatis</li>
                <li><span className={styles.checkmark}>✔</span> Struk Digital via WhatsApp</li>
                <li><span className={styles.checkmark}>✔</span> Arsitektur Offline-First</li>
              </ul>

              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`btn btn-ghost btn-xl ${styles.pricingCta}`}
                id="pricing-monthly-btn"
                style={{ border: "1px solid hsl(var(--primary)/0.4)" }}
              >
                Mulai Paket Bulanan →
              </a>
            </div>

            {/* TAHUNAN — RECOMMENDED */}
            <div className={styles.pricingCard} style={{ border: "2px solid hsl(var(--primary))", position: "relative" }}>
              <div className={styles.pricingBadgePro}>⭐ Paling Hemat — Hemat Rp 151.000</div>

              <div className={styles.pricingTop}>
                <div>
                  <p className={styles.pricingLabel}>Paket Tahunan</p>
                  <div className={styles.pricingPriceRow}>
                    <span className={styles.pricingStrike}>Rp 900.000</span>
                    <span className={styles.pricingSlash}>/tahun</span>
                  </div>
                  <div className={styles.pricingMain}>
                    <span className={styles.pricingCurrency}>Rp</span>
                    <span className={styles.pricingAmount}>749.000</span>
                    <span className={styles.pricingPeriod}>/tahun</span>
                  </div>
                  <p className={styles.pricingMicro}>
                    💡 <strong>Cuma Rp 2.052 perak sehari.</strong> Lebih murah dari secangkir kopi!
                  </p>
                </div>
              </div>

              <ul className={styles.pricingFeatureList}>
                <li><span className={styles.checkmark}>✔</span> Semua fitur Paket Bulanan</li>
                <li><span className={styles.checkmark}>✔</span> Hemat 17% vs bayar bulanan</li>
                <li><span className={styles.checkmark}>✔</span> Prioritas support dari Agen</li>
                <li><span className={styles.checkmark}>✔</span> Update fitur sepanjang tahun</li>
                <li><span className={styles.checkmark}>✔</span> Multi-Device (HP, Tablet, Laptop)</li>
                <li><span className={styles.checkmark}>✔</span> Manajemen Karyawan & PIN Kasir</li>
              </ul>

              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`btn btn-accent btn-xl ${styles.pricingCta}`}
                id="pricing-yearly-btn"
              >
                Ambil Paket Tahunan 749rb →
              </a>
              <p className={styles.pricingNote}>
                Hubungi Mba via WhatsApp untuk aktivasi. Proses cepat, tanpa ribet.
              </p>
            </div>

          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════════
          5b. FAQ SECTION
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.section} id="faq">
        <div className={styles.sectionShell}>
          <div className={styles.sectionBadge}>🙋 Ada Pertanyaan?</div>
          <h2 className={styles.sectionTitle}>
            Pertanyaan yang Sering Ditanyakan
          </h2>
          <FaqAccordion />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          6. FINAL CTA BANNER
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.ctaBanner}>
        <div className={styles.ctaBannerGlow} aria-hidden="true" />
        <div className={styles.ctaBannerContent}>
          <h2 className={styles.ctaBannerTitle}>
            Toko Anda Layak Dapat Sistem yang Lebih Baik.
          </h2>
          <p className={styles.ctaBannerDesc}>
            Bergabung dengan ratusan UMKM yang sudah sat-set jualan bersama MbaKasir. Mulai dari <strong>Rp 75.000/bulan</strong> atau hemat dengan paket <strong>Rp 749.000/tahun</strong> — mulai hari ini.
          </p>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn btn-accent btn-xl ${styles.ctaBannerBtn}`}
            id="final-cta-btn"
          >
            Aktifkan Toko Saya Sekarang 🚀
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
              <p className={styles.footerBrandName}>MbaKasir Intelligence Pro</p>
              <p className={styles.footerTagline}>Dibuat dengan dedikasi untuk kemajuan UMKM Lokal. 🧡</p>
            </div>
          </div>

          <div className={styles.footerLinks}>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerLink}
            >
              Kontak Bantuan
            </a>
            <span className={styles.footerDot} aria-hidden="true">·</span>
            <Link href="/register" className={styles.footerLink}>
              Daftar
            </Link>
          </div>

          <p className={styles.footerCopy}>
            © {new Date().getFullYear()} MbaKasir Intelligence Pro. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
