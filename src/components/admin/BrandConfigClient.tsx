"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/AppProviders";
import type { BrandConfigSnapshot } from "@/lib/brand-config";

// ─── Upload Widget ───────────────────────────────────────────
function ImageUploader({
  type,
  currentUrl,
  onUploaded,
  previewSize = 48,
  label,
  hint,
  accept,
}: {
  type: "logo" | "favicon";
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  previewSize?: number;
  label: string;
  hint: string;
  accept: string;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const displayUrl = localPreview ?? currentUrl;

  async function handleFile(file: File) {
    if (!file) return;

    // Local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setLocalPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", type);

      const res = await fetch("/api/admin/brand-upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!res.ok) {
        toast(data.error || "Upload gagal", "error");
        setLocalPreview(null);
        return;
      }

      onUploaded(data.url);
      toast(`${label} berhasil diunggah`, "success");
    } catch {
      toast("Kesalahan jaringan saat upload", "error");
      setLocalPreview(null);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <label className="input-label">{label}</label>

      {/* Drop zone + preview */}
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "14px 16px",
          borderRadius: "12px",
          border: `2px dashed hsl(var(--border))`,
          background: "hsl(var(--bg-elevated))",
          cursor: isUploading ? "wait" : "pointer",
          transition: "border-color 0.2s, background 0.2s",
          marginTop: "6px",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(var(--primary))";
          (e.currentTarget as HTMLDivElement).style.background = "hsl(var(--primary) / 0.06)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(var(--border))";
          (e.currentTarget as HTMLDivElement).style.background = "hsl(var(--bg-elevated))";
        }}
      >
        {/* Preview */}
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt={`${label} preview`}
            style={{
              width: `${previewSize}px`,
              height: `${previewSize}px`,
              objectFit: "contain",
              borderRadius: type === "logo" ? "10px" : "6px",
              border: "1px solid hsl(var(--border))",
              background: "#fff",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: `${previewSize}px`,
              height: `${previewSize}px`,
              borderRadius: type === "logo" ? "10px" : "6px",
              background: "hsl(var(--bg-surface))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: previewSize > 40 ? "24px" : "16px",
              flexShrink: 0,
              border: "1px solid hsl(var(--border))",
            }}
          >
            {type === "logo" ? "🖼️" : "🔖"}
          </div>
        )}

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "14px", color: "hsl(var(--text-primary))" }}>
            {isUploading ? "Mengunggah..." : displayUrl ? "Klik atau seret untuk ganti" : "Klik atau seret file ke sini"}
          </div>
          <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "3px" }}>
            {hint}
          </div>
          {displayUrl && !isUploading && (
            <div
              style={{ fontSize: "11px", color: "hsl(var(--primary))", marginTop: "4px", wordBreak: "break-all" }}
            >
              {currentUrl}
            </div>
          )}
        </div>

        {/* Status indicator */}
        <div style={{ flexShrink: 0 }}>
          {isUploading ? (
            <span style={{ fontSize: "20px", animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
          ) : (
            <span style={{ fontSize: "20px", color: "hsl(var(--text-muted))" }}>⬆️</span>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = ""; // reset agar bisa upload file sama lagi
        }}
      />

      {/* Manual URL override */}
      <div style={{ marginTop: "8px", display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          className="input-field"
          value={currentUrl ?? ""}
          onChange={(e) => onUploaded(e.target.value)}
          placeholder="atau tempel URL langsung..."
          style={{ fontSize: "12px", height: "36px" }}
        />
        {currentUrl && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: "6px 10px", fontSize: "12px", color: "hsl(var(--danger))", flexShrink: 0 }}
            onClick={() => { onUploaded(""); setLocalPreview(null); }}
          >
            Hapus
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main BrandConfigClient ───────────────────────────────────
export default function BrandConfigClient({
  initialConfig,
}: {
  initialConfig: BrandConfigSnapshot;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [config, setConfig] = useState<BrandConfigSnapshot>(initialConfig);

  useEffect(() => {
    if (config.primaryColor && /^#[0-9a-fA-F]{6}$/.test(config.primaryColor)) {
      document.documentElement.style.setProperty("--preview-color", config.primaryColor);
    }
  }, [config.primaryColor]);

  function update<K extends keyof BrandConfigSnapshot>(key: K, val: BrandConfigSnapshot[K]) {
    setConfig((c) => ({ ...c, [key]: val }));
  }

  async function save() {
    try {
      const res = await fetch("/api/admin/brand-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Gagal menyimpan", "error");
        return;
      }
      setConfig(data.config);
      router.refresh();
      toast("Identitas platform berhasil disimpan", "success");
    } catch {
      toast("Kesalahan jaringan", "error");
    }
  }

  const previewBg = config.primaryColor ?? "#1e40af";

  return (
    <section className="card" style={{ display: "grid", gap: "28px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: "20px" }}>Identitas Platform</h2>
          <p style={{ marginTop: "6px", fontSize: "14px", color: "hsl(var(--text-secondary))" }}>
            Atur nama aplikasi, deskripsi SEO, logo, favicon, dan warna utama brand.
          </p>
        </div>
        <button
          className="btn btn-primary"
          disabled={isPending}
          onClick={() => startTransition(() => void save())}
        >
          {isPending ? "Menyimpan..." : "Simpan Identitas"}
        </button>
      </div>

      {/* Live Badge Preview */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "18px 22px",
          borderRadius: "16px",
          background: `${previewBg}18`,
          border: `1px solid ${previewBg}40`,
        }}
      >
        {config.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.logoUrl}
            alt="Logo Preview"
            style={{ width: "56px", height: "56px", objectFit: "contain", borderRadius: "12px", background: "#fff", border: "1px solid hsl(var(--border))" }}
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }}
          />
        ) : (
          <div
            style={{
              width: "56px", height: "56px", borderRadius: "12px", background: previewBg,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "22px", fontWeight: 900, color: "white", letterSpacing: "-1px",
            }}
          >
            {config.appName?.slice(0, 2).toUpperCase() || "MK"}
          </div>
        )}
        <div>
          <div style={{ fontWeight: 800, fontSize: "20px", color: previewBg }}>
            {config.appName || "Nama Aplikasi"}
          </div>
          <div style={{ fontSize: "13px", color: "hsl(var(--text-muted))", marginTop: "2px" }}>
            {config.tagline || "Tambahkan tagline..."}
          </div>
        </div>
        {config.faviconUrl && (
          <div style={{ marginLeft: "auto", textAlign: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={config.faviconUrl}
              alt="Favicon"
              style={{ width: "24px", height: "24px", borderRadius: "4px", display: "block" }}
            />
            <div style={{ fontSize: "10px", color: "hsl(var(--text-muted))", marginTop: "2px" }}>favicon</div>
          </div>
        )}
      </div>

      {/* Text fields */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
        <div>
          <label className="input-label" htmlFor="brand-appname">Nama Aplikasi</label>
          <input
            id="brand-appname"
            className="input-field"
            value={config.appName}
            onChange={(e) => update("appName", e.target.value)}
            placeholder="MbaKasir Intelligence Pro"
          />
        </div>

        <div>
          <label className="input-label" htmlFor="brand-tagline">Tagline</label>
          <input
            id="brand-tagline"
            className="input-field"
            value={config.tagline ?? ""}
            onChange={(e) => update("tagline", e.target.value || null)}
            placeholder="Teman UMKM Indonesia"
          />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label className="input-label" htmlFor="brand-meta">Deskripsi Meta (SEO)</label>
          <textarea
            id="brand-meta"
            className="input-field"
            value={config.metaDescription ?? ""}
            onChange={(e) => update("metaDescription", e.target.value || null)}
            rows={3}
            placeholder="Deskripsi singkat aplikasi untuk mesin pencari Google, Bing, dll."
            style={{ resize: "vertical", minHeight: "84px" }}
          />
          <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "4px", display: "block" }}>
            Optimal 120–160 karakter · Saat ini: {(config.metaDescription ?? "").length} karakter
          </span>
        </div>

        <div>
          <label className="input-label" htmlFor="brand-color">Warna Utama</label>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="color"
              value={config.primaryColor ?? "#1e40af"}
              onChange={(e) => update("primaryColor", e.target.value)}
              style={{ width: "44px", height: "44px", padding: "2px", borderRadius: "10px", border: "1px solid hsl(var(--border))", cursor: "pointer", background: "none" }}
            />
            <input
              id="brand-color"
              className="input-field"
              value={config.primaryColor ?? "#1e40af"}
              onChange={(e) => update("primaryColor", e.target.value)}
              placeholder="#1e40af"
              style={{ flex: 1 }}
            />
          </div>
          <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "4px", display: "block" }}>
            Format HEX (#RRGGBB) · digunakan di logo, tombol, dan aksen UI
          </span>
        </div>
      </div>

      {/* Upload widgets */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
        <ImageUploader
          type="logo"
          currentUrl={config.logoUrl}
          onUploaded={(url) => update("logoUrl", url || null)}
          previewSize={56}
          label="Logo Aplikasi"
          hint="PNG/SVG/WebP transparan · maks 2MB · min 200×200px"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
        />

        <ImageUploader
          type="favicon"
          currentUrl={config.faviconUrl}
          onUploaded={(url) => update("faviconUrl", url || null)}
          previewSize={36}
          label="Favicon"
          hint="PNG/ICO/SVG · maks 2MB · ideal 32×32 atau 64×64px"
          accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
        />
      </div>
    </section>
  );
}
