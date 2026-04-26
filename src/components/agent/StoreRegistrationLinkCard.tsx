"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/contexts/AppProviders";
import { formatDateShort } from "@/lib/utils";

type StoreLinkKind = "DIRECT" | "LANDING";

interface StoreRegistrationLinkSummary {
  id: string;
  token: string;
  path: string;
  directPath?: string;
  landingPath?: string;
  defaultLinkType?: StoreLinkKind;
  pixelUrl?: string | null;
  clickCount?: number;
  lastClickedAt?: string | null;
  useCount: number;
  createdAt: string;
  lastUsedAt: string | null;
}

function normalizeLink(link: StoreRegistrationLinkSummary): StoreRegistrationLinkSummary {
  return {
    ...link,
    directPath: link.directPath || `/go/store/${link.token}?kind=direct`,
    landingPath: link.landingPath || `/go/store/${link.token}?kind=landing`,
    defaultLinkType:
      link.defaultLinkType === "LANDING" ? "LANDING" : "DIRECT",
    pixelUrl: link.pixelUrl ?? null,
    clickCount: link.clickCount ?? 0,
    lastClickedAt: link.lastClickedAt ?? null,
  };
}

export default function StoreRegistrationLinkCard({
  initialLink,
}: {
  initialLink: StoreRegistrationLinkSummary | null;
}) {
  const { toast } = useToast();
  const [link, setLink] = useState(
    initialLink ? normalizeLink(initialLink) : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slug, setSlug] = useState("");
  const [linkType, setLinkType] = useState<StoreLinkKind>(
    initialLink?.defaultLinkType === "LANDING" ? "LANDING" : "DIRECT"
  );
  const [pixelUrl, setPixelUrl] = useState(initialLink?.pixelUrl ?? "");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const directLink = useMemo(() => {
    if (!link) return "";
    return `${origin}${link.directPath || `/go/store/${link.token}?kind=direct`}`;
  }, [link, origin]);

  const landingLink = useMemo(() => {
    if (!link) return "";
    return `${origin}${link.landingPath || `/go/store/${link.token}?kind=landing`}`;
  }, [link, origin]);

  const defaultShareLink = useMemo(() => {
    if (!link) return "";
    return link.defaultLinkType === "LANDING" ? landingLink : directLink;
  }, [directLink, landingLink, link]);

  const conversionRate = useMemo(() => {
    if (!link || !link.clickCount || link.clickCount <= 0) return 0;
    return Math.round((link.useCount / link.clickCount) * 100);
  }, [link]);

  async function handleCreateOrRotateLink() {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/agent/store-registration-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug || undefined,
          linkType,
          pixelUrl: pixelUrl.trim() || undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast(data.error || "Gagal membuat link pendaftaran toko", "error");
        return;
      }

      setLink(normalizeLink(data.link));
      setPixelUrl(data.link?.pixelUrl ?? pixelUrl);
      setLinkType(data.link?.defaultLinkType === "LANDING" ? "LANDING" : "DIRECT");
      toast("Link pendaftaran toko siap dibagikan", "success");
    } catch {
      toast("Terjadi kesalahan jaringan saat membuat link", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyToClipboard(value: string, message: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast(message, "success");
    } catch {
      toast("Clipboard tidak tersedia. Salin link secara manual.", "warning");
    }
  }

  return (
    <section className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h2 style={{ fontSize: "20px" }}>Link Pendaftaran Toko</h2>
          <p
            style={{
              marginTop: "6px",
              fontSize: "14px",
              color: "hsl(var(--text-secondary))",
            }}
          >
            Pilih jenis link sesuai campaign: langsung ke form pendaftaran atau
            ke halaman depan dulu. Afiliasi agen tetap tercatat otomatis.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {link ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                copyToClipboard(
                  defaultShareLink,
                  "Link default berhasil disalin"
                )
              }
            >
              Salin Link Default
            </button>
          ) : null}

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreateOrRotateLink}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Menyiapkan..."
              : link
                ? "Regenerasi Link"
                : "Buat Link"}
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: "16px",
          display: "grid",
          gap: "14px",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        <div>
          <label className="input-label" htmlFor="customSlug">
            Custom Slug (Opsional)
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                color: "hsl(var(--text-muted))",
                fontSize: "14px",
                backgroundColor: "hsl(var(--bg-elevated))",
                padding: "10px",
                borderRadius: "var(--radius-md)",
                border: "1px solid hsl(var(--border))",
              }}
            >
              /go/store/
            </span>
            <input
              id="customSlug"
              type="text"
              className="input-field"
              placeholder="nama-toko-anda"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, "-"))
              }
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <label className="input-label" htmlFor="linkType">
            Jenis Link Default
          </label>
          <select
            id="linkType"
            className="input-field"
            value={linkType}
            onChange={(e) =>
              setLinkType(e.target.value === "LANDING" ? "LANDING" : "DIRECT")
            }
            disabled={isSubmitting}
          >
            <option value="DIRECT">Langsung Form Pendaftaran</option>
            <option value="LANDING">Landing Dulu, Baru Daftar</option>
          </select>
        </div>

        <div>
          <label className="input-label" htmlFor="pixelUrl">
            Pixel URL (Opsional)
          </label>
          <input
            id="pixelUrl"
            type="url"
            className="input-field"
            placeholder="https://pixel.example.com/collect"
            value={pixelUrl}
            onChange={(e) => setPixelUrl(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {link ? (
        <div style={{ display: "grid", gap: "16px", marginTop: "20px" }}>
          <div
            style={{
              padding: "16px 18px",
              borderRadius: "16px",
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--bg-surface))",
              display: "grid",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                URL Direkt (klik → form pendaftaran)
              </div>
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "hsl(var(--text-primary))",
                  wordBreak: "break-all",
                }}
              >
                {directLink}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: "8px" }}
                onClick={() =>
                  copyToClipboard(directLink, "Link direct berhasil disalin")
                }
              >
                Salin Link Direct
              </button>
            </div>

            <div>
              <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                URL Landing (klik → halaman depan dulu)
              </div>
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "hsl(var(--text-primary))",
                  wordBreak: "break-all",
                }}
              >
                {landingLink}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: "8px" }}
                onClick={() =>
                  copyToClipboard(landingLink, "Link landing berhasil disalin")
                }
              >
                Salin Link Landing
              </button>
            </div>

            {link.pixelUrl ? (
              <p style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                Pixel aktif: <span style={{ fontWeight: 700 }}>{link.pixelUrl}</span>
              </p>
            ) : (
              <p style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                Pixel belum disetel. Anda bisa isi URL pixel untuk tracking campaign.
              </p>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
            }}
          >
            <div className="stat-card">
              <span
                style={{
                  fontSize: "14px",
                  color: "hsl(var(--text-secondary))",
                  fontWeight: 600,
                }}
              >
                Total Klik Link
              </span>
              <span className="stat-value" style={{ fontSize: "26px" }}>
                {(link.clickCount ?? 0).toLocaleString("id-ID")}
              </span>
              <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                terakhir{" "}
                {link.lastClickedAt ? formatDateShort(link.lastClickedAt) : "-"}
              </span>
            </div>

            <div className="stat-card">
              <span
                style={{
                  fontSize: "14px",
                  color: "hsl(var(--text-secondary))",
                  fontWeight: 600,
                }}
              >
                Registrasi Berhasil
              </span>
              <span className="stat-value" style={{ fontSize: "26px" }}>
                {link.useCount.toLocaleString("id-ID")}
              </span>
              <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                pendaftaran toko
              </span>
            </div>

            <div className="stat-card">
              <span
                style={{
                  fontSize: "14px",
                  color: "hsl(var(--text-secondary))",
                  fontWeight: 600,
                }}
              >
                Konversi Klik
              </span>
              <span className="stat-value" style={{ fontSize: "26px" }}>
                {conversionRate}%
              </span>
              <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                dari klik ke registrasi
              </span>
            </div>

            <div className="stat-card">
              <span
                style={{
                  fontSize: "14px",
                  color: "hsl(var(--text-secondary))",
                  fontWeight: 600,
                }}
              >
                Link Dibuat
              </span>
              <span className="stat-value" style={{ fontSize: "26px" }}>
                {formatDateShort(link.createdAt)}
              </span>
              <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                penggunaan terakhir{" "}
                {link.lastUsedAt ? formatDateShort(link.lastUsedAt) : "-"}
              </span>
            </div>
          </div>

          <p style={{ fontSize: "13px", color: "hsl(var(--text-muted))" }}>
            Link yang dibuat sekarang masuk lewat route tracker otomatis, sehingga
            klik tercatat dan afiliasi tetap tersimpan walau pengunjung melihat
            halaman depan lebih dulu.
          </p>
        </div>
      ) : (
        <div
          style={{
            marginTop: "20px",
            padding: "18px",
            borderRadius: "16px",
            border: "1px dashed hsl(var(--border))",
            color: "hsl(var(--text-secondary))",
            fontSize: "14px",
          }}
        >
          Belum ada link aktif. Buat link pertama untuk mulai onboarding toko.
        </div>
      )}
    </section>
  );
}
