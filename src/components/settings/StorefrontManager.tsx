"use client";

import { useState } from "react";

interface StorefrontConfig {
  id: string;
  slug: string;
  isActive: boolean;
  description?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankAccountName?: string | null;
  allowShipping: boolean;
  shippingCost: number;
  activeUntil?: string | null;
}

export default function StorefrontManager({ storefront: initial }: { storefront: StorefrontConfig | null }) {
  const [storefront, setStorefront] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [form, setForm] = useState({
    slug: initial?.slug ?? "",
    description: initial?.description ?? "",
    bankName: initial?.bankName ?? "",
    bankAccountNo: initial?.bankAccountNo ?? "",
    bankAccountName: initial?.bankAccountName ?? "",
    allowShipping: initial?.allowShipping ?? true,
    shippingCost: initial?.shippingCost ?? 0,
    isActive: initial?.isActive ?? false,
  });

  if (!storefront) {
    return (
      <div style={{ textAlign: "center", padding: "48px 20px", border: "1px dashed hsl(var(--border))", borderRadius: "16px" }}>
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>🛍️</div>
        <h3 style={{ margin: "0 0 8px", fontSize: "17px", fontWeight: 700 }}>Storefront Belum Aktif</h3>
        <p style={{ color: "hsl(var(--text-secondary))", fontSize: "14px", maxWidth: "360px", margin: "0 auto" }}>
          Hubungi agen Anda untuk mengaktifkan fitur Storefront Online dan mulai berjualan secara online.
        </p>
      </div>
    );
  }

  const isExpired = storefront.activeUntil ? new Date(storefront.activeUntil) < new Date() : true;

  const handleSave = async () => {
    setIsSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/tenant/storefront", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, shippingCost: Number(form.shippingCost) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStorefront(data.storefront);
      setMsg({ type: "success", text: "Pengaturan storefront berhasil disimpan!" });
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const storeUrl = `/store/${form.slug}`;

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {/* Status Card */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px",
        padding: "16px 20px", borderRadius: "12px",
        background: isExpired ? "hsl(var(--error)/0.06)" : "hsl(142 70% 45% / 0.06)",
        border: `1px solid ${isExpired ? "hsl(var(--error)/0.2)" : "hsl(142 70% 45% / 0.2)"}`,
      }}>
        <div>
          <div style={{ fontWeight: 700, color: isExpired ? "hsl(var(--error))" : "hsl(142 70% 45%)" }}>
            {isExpired ? "🔴 Storefront Tidak Aktif / Kadaluarsa" : "🟢 Storefront Aktif"}
          </div>
          {storefront.activeUntil && (
            <div style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", marginTop: "3px" }}>
              Berlaku hingga: {new Date(storefront.activeUntil).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          )}
        </div>
        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-sm"
        >
          🔗 Lihat Toko Online
        </a>
      </div>

      {msg && (
        <div style={{
          padding: "12px 16px", borderRadius: "10px", fontSize: "14px", fontWeight: 600,
          background: msg.type === "success" ? "hsl(142 70% 45% / 0.1)" : "hsl(var(--error)/0.1)",
          color: msg.type === "success" ? "hsl(142 70% 45%)" : "hsl(var(--error))",
          border: `1px solid ${msg.type === "success" ? "hsl(142 70% 45% / 0.3)" : "hsl(var(--error)/0.3)"}`,
        }}>
          {msg.text}
        </div>
      )}

      {/* Form */}
      <div style={{ display: "grid", gap: "16px" }}>
        {/* URL Toko */}
        <div>
          <label className="input-label">🔗 URL Toko Online</label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ color: "hsl(var(--text-muted))", fontSize: "14px", whiteSpace: "nowrap" }}>/store/</span>
            <input
              type="text"
              className="input-field"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
              placeholder="nama-toko-anda"
              style={{ flex: 1 }}
            />
          </div>
          <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "4px" }}>
            Link publik toko Anda: <strong>{typeof window !== "undefined" ? window.location.origin : ""}{storeUrl}</strong>
          </div>
        </div>

        {/* Deskripsi */}
        <div>
          <label className="input-label">📝 Deskripsi Toko (opsional)</label>
          <textarea
            className="input-field"
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Tagline atau deskripsi singkat toko Anda..."
          />
        </div>

        <div style={{ borderTop: "1px solid hsl(var(--border))", paddingTop: "16px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "12px" }}>💳 Info Pembayaran</div>
          <div style={{ display: "grid", gap: "12px" }}>
            <div>
              <label className="input-label">Nama Bank</label>
              <input className="input-field" value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} placeholder="BCA, Mandiri, BRI, dst..." />
            </div>
            <div>
              <label className="input-label">Nomor Rekening</label>
              <input className="input-field" type="text" value={form.bankAccountNo} onChange={(e) => setForm((f) => ({ ...f, bankAccountNo: e.target.value }))} placeholder="1234567890" />
            </div>
            <div>
              <label className="input-label">Nama Pemilik Rekening</label>
              <input className="input-field" value={form.bankAccountName} onChange={(e) => setForm((f) => ({ ...f, bankAccountName: e.target.value }))} placeholder="Nama sesuai rekening..." />
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid hsl(var(--border))", paddingTop: "16px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "12px" }}>🚚 Pengiriman</div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <input
              type="checkbox"
              id="allow-shipping"
              checked={form.allowShipping}
              onChange={(e) => setForm((f) => ({ ...f, allowShipping: e.target.checked }))}
              style={{ width: "18px", height: "18px", cursor: "pointer" }}
            />
            <label htmlFor="allow-shipping" style={{ fontSize: "14px", cursor: "pointer" }}>Kenakan biaya ongkos kirim</label>
          </div>
          {form.allowShipping && (
            <div>
              <label className="input-label">Ongkos Kirim (Flat Rate)</label>
              <input
                className="input-field"
                type="number"
                min={0}
                value={form.shippingCost}
                onChange={(e) => setForm((f) => ({ ...f, shippingCost: Number(e.target.value) }))}
                placeholder="Contoh: 15000"
              />
              <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "4px" }}>
                Biaya pengiriman yang sama untuk semua pesanan.
              </div>
            </div>
          )}
        </div>

        {/* Toggle Aktif */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderRadius: "10px", background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border))" }}>
          <input
            type="checkbox"
            id="storefront-active"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            style={{ width: "18px", height: "18px", cursor: "pointer" }}
          />
          <label htmlFor="storefront-active" style={{ fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
            Aktifkan Storefront (tampilkan ke publik)
          </label>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary"
          style={{ justifySelf: "start" }}
        >
          {isSaving ? "Menyimpan..." : "💾 Simpan Pengaturan"}
        </button>
      </div>
    </div>
  );
}
