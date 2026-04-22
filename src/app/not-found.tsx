import type { CSSProperties } from "react";
import Link from "next/link";
import BrandBadge from "@/components/brand/BrandBadge";
import { getSession } from "@/lib/auth";
import { getBrandConfig } from "@/lib/brand-config";
import { buildWhatsappUrl } from "@/lib/utils";
import styles from "./not-found.module.css";

function hexToRgba(hex: string | null | undefined, alpha: number): string {
  const normalized = hex?.replace("#", "") ?? "";

  if (!/^[\da-fA-F]{6}$/.test(normalized)) {
    return `rgba(17, 17, 17, ${alpha})`;
  }

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default async function NotFound() {
  const [brand, session] = await Promise.all([getBrandConfig(), getSession()]);

  const dashboardHref = session ? "/dashboard" : "/login";
  const dashboardLabel = session ? "Dashboard" : "Login";
  const supportHref = brand.supportPhone
    ? buildWhatsappUrl(
        brand.supportPhone,
        brand.supportMessage ?? `Halo ${brand.appName}, saya butuh bantuan`
      )
    : null;

  const pageStyle = {
    "--not-found-brand": brand.primaryColor ?? "#111111",
    "--not-found-brand-soft": hexToRgba(brand.primaryColor, 0.12),
    "--not-found-brand-glow": hexToRgba(brand.primaryColor, 0.22),
  } as CSSProperties;

  return (
    <main className={styles.page} style={pageStyle}>
      <div className={styles.glow} aria-hidden="true" />

      <section className={styles.shell}>
        <div className={styles.card}>
          <div className={styles.content}>
            <Link href="/" className={styles.brand}>
              <BrandBadge logoUrl={brand.logoUrl} alt={brand.appName} size={56} />

              <div className={styles.brandText}>
                <span className={styles.brandName}>{brand.appName}</span>
                <span className={styles.brandTagline}>
                  {brand.tagline ?? "Teman UMKM Indonesia"}
                </span>
              </div>
            </Link>

            <div className={styles.badge}>404</div>

            <div className={styles.titleGroup}>
              <p className={styles.eyebrow}>Halaman tidak tersedia</p>
              <h1 className={styles.title}>Rute ini tidak ditemukan.</h1>
            </div>

            <p className={styles.description}>
              Tautan yang Anda buka mungkin sudah berubah, dipindahkan, atau
              memang belum tersedia. Anda bisa lanjut dari halaman utama atau
              kembali ke area dashboard.
            </p>

            <div className={styles.actions}>
              <Link href="/" className={styles.primaryButton}>
                Kembali ke Beranda
              </Link>
              <Link href={dashboardHref} className={styles.secondaryButton}>
                {dashboardLabel}
              </Link>
            </div>

            <div className={styles.inlineLinks}>
              <Link href="/" className={styles.inlineLink}>
                Beranda
              </Link>
              <Link href={dashboardHref} className={styles.inlineLink}>
                {dashboardLabel}
              </Link>
              {supportHref ? (
                <a
                  href={supportHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.inlineLink}
                >
                  WhatsApp Support
                </a>
              ) : null}
            </div>
          </div>

          <aside className={styles.panel}>
            <div className={styles.panelTop}>
              <span className={styles.panelLabel}>Status</span>
              <strong className={styles.panelCode}>404</strong>
            </div>

            <p className={styles.panelTitle}>Halaman tidak ditemukan</p>
            <p className={styles.panelDescription}>
              Sistem tetap aman. Ini hanya rute yang tidak cocok dengan halaman
              yang tersedia.
            </p>

            <div className={styles.panelSteps}>
              <span className={styles.step}>Periksa kembali URL</span>
              <span className={styles.step}>Kembali ke beranda</span>
              <span className={styles.step}>Lanjut ke dashboard</span>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
