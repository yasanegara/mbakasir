"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/contexts/AppProviders";
import { formatDateShort } from "@/lib/utils";

interface StoreRegistrationLinkSummary {
  id: string;
  token: string;
  path: string;
  useCount: number;
  createdAt: string;
  lastUsedAt: string | null;
}

export default function StoreRegistrationLinkCard({
  initialLink,
}: {
  initialLink: StoreRegistrationLinkSummary | null;
}) {
  const { toast } = useToast();
  const [link, setLink] = useState(initialLink);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [origin, setOrigin] = useState("");
  const [slug, setSlug] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const fullLink = link ? `${origin}${link.path}` : "";

  async function handleCreateOrRotateLink() {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/agent/store-registration-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: slug ? JSON.stringify({ slug }) : undefined
      });
      const data = await response.json();

      if (!response.ok) {
        toast(data.error || "Gagal membuat link pendaftaran toko", "error");
        return;
      }

      setLink(data.link);
      toast("Link pendaftaran toko siap dibagikan", "success");
    } catch {
      toast("Terjadi kesalahan jaringan saat membuat link", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyLink() {
    if (!link) {
      return;
    }

    try {
      await navigator.clipboard.writeText(fullLink || link.path);
      toast("Link pendaftaran toko berhasil disalin", "success");
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
            Bagikan satu link ini ke calon toko. Saat toko mendaftar, sistem
            otomatis membuat akun owner, tenant baru, dan POS utama bawaan.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {link ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleCopyLink}
            >
              Salin Link
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
      
      <div style={{ marginTop: "16px", maxWidth: "400px" }}>
        <label className="input-label" htmlFor="customSlug">Custom Slug (Opsional)</label>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "hsl(var(--text-muted))", fontSize: "14px", backgroundColor: "hsl(var(--bg-elevated))", padding: "10px", borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--border))" }}>
            /register/store/
          </span>
          <input
            id="customSlug"
            type="text"
            className="input-field"
            placeholder="nama-toko-anda"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, "-"))}
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
            }}
          >
            <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
              URL publik
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
              {fullLink || link.path}
            </div>
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
                Dipakai
              </span>
              <span className="stat-value" style={{ fontSize: "26px" }}>
                {link.useCount}
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
                Dibuat
              </span>
              <span className="stat-value" style={{ fontSize: "26px" }}>
                {formatDateShort(link.createdAt)}
              </span>
              <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                link aktif saat ini
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
                Aktivitas Terakhir
              </span>
              <span className="stat-value" style={{ fontSize: "26px" }}>
                {link.lastUsedAt ? formatDateShort(link.lastUsedAt) : "-"}
              </span>
              <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                registrasi terakhir via link ini
              </span>
            </div>
          </div>

          <p style={{ fontSize: "13px", color: "hsl(var(--text-muted))" }}>
            Jika Anda menekan regenerasi, link aktif sebelumnya akan
            dinonaktifkan dan diganti dengan link baru.
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
