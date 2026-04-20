import type { CSSProperties } from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getBrandConfig } from "@/lib/brand-config";
import styles from "./page.module.css";

const featureCards = [
  {
    id: "01",
    title: "POS yang langsung terasa siap pakai",
    description:
      "Buka transaksi, layani pelanggan, dan jaga alur kasir tetap cepat dari layar yang fokus ke operasional harian.",
    note: "Cepat untuk kasir",
  },
  {
    id: "02",
    title: "Stok dan pembelian tetap terkendali",
    description:
      "Pantau inventori, kebutuhan restock, dan alur pembelian dari struktur yang rapi dan mudah dipantau tim toko.",
    note: "Rapi untuk gudang",
  },
  {
    id: "03",
    title: "Dashboard dan laporan dalam satu alur",
    description:
      "Pemilik usaha bisa langsung pindah dari transaksi ke insight tanpa perlu lompat ke sistem yang berbeda.",
    note: "Ringkas untuk owner",
  },
  {
    id: "04",
    title: "Sinkronisasi dibuat terasa tenang",
    description:
      "Arsitektur local-first membantu operasional tetap jalan sambil menjaga data tetap siap diselaraskan ke cloud.",
    note: "Siap untuk multi-cabang",
  },
];

const workflowSteps = [
  {
    step: "Langkah 1",
    title: "Masuk sesuai peran",
    description:
      "Agen, pemilik toko, kasir, dan admin memakai pintu masuk yang sama dengan pengalaman yang tetap konsisten.",
  },
  {
    step: "Langkah 2",
    title: "Jalankan operasional harian",
    description:
      "Transaksi, stok, pembelian, dan monitoring toko tersedia dari area kerja yang saling terhubung.",
  },
  {
    step: "Langkah 3",
    title: "Pantau pertumbuhan dari dashboard",
    description:
      "Begitu aktivitas berjalan, owner bisa cek performa toko dan keputusan berikutnya dari pusat kontrol yang ringkas.",
  },
];

const workspaceCards = [
  {
    label: "POS",
    title: "Transaksi lebih fokus",
    description: "Kasir bisa langsung masuk ke penjualan tanpa kebisingan yang tidak perlu.",
    meta: "Siap dipakai",
  },
  {
    label: "Inventory",
    title: "Stok tetap kebaca",
    description: "Pergerakan barang dan kebutuhan restock lebih mudah diikuti tim operasional.",
    meta: "Mudah ditinjau",
  },
  {
    label: "Reports",
    title: "Laporan lebih dekat",
    description: "Owner bisa lihat ringkasan performa tanpa keluar dari ekosistem kerja utama.",
    meta: "Cepat dibaca",
  },
  {
    label: "Sync",
    title: "Data tetap selaras",
    description: "Pantau status sinkronisasi dengan konteks yang jelas dan tidak terasa teknis.",
    meta: "Lebih tenang",
  },
];

function getInitials(appName: string): string {
  const initials = appName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "MK";
}

function getRoleLabel(role: "SUPERADMIN" | "AGENT" | "TENANT" | "CASHIER"): string {
  switch (role) {
    case "SUPERADMIN":
      return "Super Admin";
    case "AGENT":
      return "Agen";
    case "TENANT":
      return "Pemilik Toko";
    case "CASHIER":
      return "Kasir";
    default:
      return "Pengguna";
  }
}

export default async function IndexPage() {
  const [session, brand] = await Promise.all([getSession(), getBrandConfig()]);

  const isAuthenticated = Boolean(session);
  const tagline = brand.tagline ?? "Teman UMKM Indonesia";
  const description =
    brand.metaDescription ??
    "POS & ERP mikro dengan arsitektur local-first untuk bantu operasional toko tetap rapi dari kasir sampai laporan.";
  const primaryHref = isAuthenticated ? "/dashboard" : "/login";
  const primaryLabel = isAuthenticated ? "Buka Dashboard" : "Masuk ke Aplikasi";
  const secondaryHref = isAuthenticated ? "/pos" : "#fitur";
  const secondaryLabel = isAuthenticated ? "Mulai Transaksi" : "Lihat Fitur";
  const pageStyle: CSSProperties = {
    ["--landing-brand" as string]: brand.primaryColor ?? "#1e40af",
  };

  return (
    <main className={styles.page} style={pageStyle}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link className={styles.brandLink} href="/">
            <div className={styles.brandMark} aria-hidden="true">
              {brand.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brand.logoUrl}
                  alt=""
                  className={styles.brandImage}
                />
              ) : (
                <span>{getInitials(brand.appName)}</span>
              )}
            </div>
            <div className={styles.brandText}>
              <span className={styles.brandName}>{brand.appName}</span>
              <span className={styles.brandTagline}>{tagline}</span>
            </div>
          </Link>

          <nav className={styles.nav}>
            <a href="#fitur">Fitur</a>
            <a href="#alur">Alur</a>
            <a href="#mulai">Mulai</a>
          </nav>

          <Link className={`btn btn-ghost btn-sm ${styles.headerButton}`} href={primaryHref}>
            {isAuthenticated ? "Dashboard" : "Login"}
          </Link>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroEyebrow}>Local-first POS & ERP untuk UMKM</div>
            <h1 className={styles.heroTitle}>
              Tampilan awal yang langsung mengarahkan tim toko ke pekerjaan penting.
            </h1>
            <p className={styles.heroDescription}>{description}</p>

            <div className={styles.heroNotice}>
              {session ? (
                <span>
                  Masuk sebagai <strong>{getRoleLabel(session.role)}</strong> atas nama{" "}
                  <strong>{session.name}</strong>.
                </span>
              ) : (
                <span>
                  Cocok untuk alur kasir, owner, agen, dan admin dalam satu pengalaman yang terasa
                  satu produk.
                </span>
              )}
            </div>

            <div className={styles.heroActions}>
              <Link className={`btn btn-primary btn-lg ${styles.primaryAction}`} href={primaryHref}>
                {primaryLabel}
              </Link>
              {isAuthenticated ? (
                <Link className={`btn btn-ghost btn-lg ${styles.secondaryAction}`} href={secondaryHref}>
                  {secondaryLabel}
                </Link>
              ) : (
                <a className={`btn btn-ghost btn-lg ${styles.secondaryAction}`} href={secondaryHref}>
                  {secondaryLabel}
                </a>
              )}
            </div>

            <div className={styles.proofGrid}>
              <article className={styles.proofCard}>
                <span className={styles.proofLabel}>Pengalaman</span>
                <strong className={styles.proofValue}>Satu layar pembuka</strong>
                <p className={styles.proofText}>
                  Pengguna langsung paham harus mulai dari mana, tanpa dibebani detail teknis.
                </p>
              </article>

              <article className={styles.proofCard}>
                <span className={styles.proofLabel}>Brand</span>
                <strong className={styles.proofValue}>Siap ikut identitas bisnis</strong>
                <p className={styles.proofText}>
                  Nama aplikasi, logo, dan warna utama tetap mengikuti konfigurasi brand yang ada.
                </p>
              </article>

              <article className={styles.proofCard}>
                <span className={styles.proofLabel}>Operasional</span>
                <strong className={styles.proofValue}>Kasir ke laporan</strong>
                <p className={styles.proofText}>
                  Transaksi, stok, pembelian, dan monitoring terasa terhubung dalam satu alur.
                </p>
              </article>
            </div>
          </div>

          <div className={styles.previewWrap}>
            <div className={styles.previewCard}>
              <div className={styles.previewTop}>
                <span className={styles.previewBadge}>Landing workspace</span>
                <span className={styles.previewStatus}>
                  {isAuthenticated ? "Akses aktif" : "Publik siap login"}
                </span>
              </div>

              <div className={styles.previewIntro}>
                <div>
                  <p className={styles.previewLabel}>Ringkasan produk</p>
                  <h2 className={styles.previewTitle}>
                    Halaman pertama yang menjual rasa percaya sebelum masuk dashboard.
                  </h2>
                </div>

                <div className={styles.previewMetric}>
                  <span>Tagline</span>
                  <strong>{tagline}</strong>
                </div>
              </div>

              <div className={styles.workspaceGrid}>
                {workspaceCards.map((card) => (
                  <article key={card.label} className={styles.workspaceCard}>
                    <span className={styles.workspaceLabel}>{card.label}</span>
                    <h3 className={styles.workspaceTitle}>{card.title}</h3>
                    <p className={styles.workspaceDescription}>{card.description}</p>
                    <div className={styles.workspaceMeta}>
                      <span>{card.meta}</span>
                      <span className={styles.workspaceAccent}>Live</span>
                    </div>
                  </article>
                ))}
              </div>

              <div className={styles.previewFooter}>
                <div>
                  <span className={styles.previewFooterLabel}>Arah utama</span>
                  <strong className={styles.previewFooterValue}>
                    {isAuthenticated ? "Lanjutkan pekerjaan toko sekarang" : "Lihat dulu, lalu masuk saat siap"}
                  </strong>
                </div>

                <Link className={styles.inlineLink} href={primaryHref}>
                  {isAuthenticated ? "Ke dashboard" : "Ke login"}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section} id="fitur">
          <div className={styles.sectionIntro}>
            <span className={styles.sectionKicker}>Fitur Utama</span>
            <h2 className={styles.sectionTitle}>Landing page yang menjelaskan produk tanpa terasa penuh.</h2>
            <p className={styles.sectionText}>
              Struktur konten ini dirancang supaya calon pengguna atau tim internal langsung menangkap
              nilai produknya: cepat dipakai di depan, rapi dikelola di belakang.
            </p>
          </div>

          <div className={styles.featureGrid}>
            {featureCards.map((feature) => (
              <article key={feature.id} className={styles.featureCard}>
                <div className={styles.featureNumber}>{feature.id}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <div className={styles.featureNote}>{feature.note}</div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} id="alur">
          <div className={styles.sectionIntro}>
            <span className={styles.sectionKicker}>Alur Pengguna</span>
            <h2 className={styles.sectionTitle}>Dari halaman awal ke aktivitas inti tanpa friksi.</h2>
            <p className={styles.sectionText}>
              Alur ini membantu pengguna memahami perjalanan mereka sejak pertama datang sampai
              benar-benar memakai sistem di toko.
            </p>
          </div>

          <div className={styles.flowGrid}>
            {workflowSteps.map((item) => (
              <article key={item.step} className={styles.flowCard}>
                <div className={styles.flowGlow} aria-hidden="true" />
                <span className={styles.flowStep}>{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.ctaPanel} id="mulai">
          <div>
            <span className={styles.sectionKicker}>Mulai Sekarang</span>
            <h2 className={styles.ctaTitle}>Halaman awal ini sudah siap dipakai sebagai wajah depan aplikasi.</h2>
            <p className={styles.ctaText}>
              Dari sini user bisa langsung lanjut ke login atau kembali ke dashboard, sementara brand tetap
              terasa konsisten dengan konfigurasi yang ada.
            </p>
            <p className={styles.ctaNote}>
              Cocok saat aplikasi dibuka oleh tenant, agen, atau calon user internal yang butuh kesan
              pertama lebih rapi.
            </p>
          </div>

          <div className={styles.ctaActions}>
            <Link className={`btn btn-primary btn-lg ${styles.primaryAction}`} href={primaryHref}>
              {primaryLabel}
            </Link>
            <a className={`btn btn-ghost btn-lg ${styles.secondaryAction}`} href="#fitur">
              Jelajahi Fitur
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
