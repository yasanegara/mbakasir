"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/contexts/AppProviders";
import { useStoreProfile, DEFAULT_WA_RECEIPT_TEMPLATE, DEFAULT_WA_ORDER_TEMPLATE } from "@/hooks/useStoreProfile";
import { LocalStoreProfile } from "@/lib/db";

interface StoreProfileClientProps {
  tenantId: string;
  initialStoreName?: string; // dari server (DB Postgres) sebagai seed awal
}

type TabKey = "info" | "qris" | "wa";

export default function StoreProfileClient({ tenantId, initialStoreName }: StoreProfileClientProps) {
  const { toast } = useToast();
  const { profile, saveProfile } = useStoreProfile(tenantId);
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [storeName, setStoreName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [qrisImageUrl, setQrisImageUrl] = useState("");
  const [footerNote, setFooterNote] = useState("Terima kasih atas kunjungan Anda!");
  const [waReceiptTemplate, setWaReceiptTemplate] = useState(DEFAULT_WA_RECEIPT_TEMPLATE);
  const [waOrderTemplate, setWaOrderTemplate] = useState(DEFAULT_WA_ORDER_TEMPLATE);
  const [waPreviewMode, setWaPreviewMode] = useState<"receipt" | "order">("receipt");

  // Sync dari IndexedDB ke form
  useEffect(() => {
    if (profile) {
      setStoreName(profile.storeName || initialStoreName || "");
      setAddress(profile.address || "");
      setPhone(profile.phone || "");
      setQrisImageUrl(profile.qrisImageUrl || "");
      setFooterNote(profile.footerNote || "Terima kasih atas kunjungan Anda!");
      setWaReceiptTemplate(profile.waReceiptTemplate || DEFAULT_WA_RECEIPT_TEMPLATE);
      setWaOrderTemplate(profile.waOrderTemplate || DEFAULT_WA_ORDER_TEMPLATE);
    } else if (initialStoreName) {
      setStoreName(initialStoreName);
    }
  }, [profile, initialStoreName]);

  const handleSaveInfo = async () => {
    if (!storeName.trim()) {
      toast("Nama toko wajib diisi", "warning");
      return;
    }
    setIsSaving(true);
    try {
      await saveProfile({ storeName: storeName.trim(), address, phone, footerNote });
      toast("✅ Data toko disimpan", "success");
    } catch {
      toast("Gagal menyimpan data toko", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveQris = async () => {
    setIsSaving(true);
    try {
      await saveProfile({ qrisImageUrl });
      toast("✅ QRIS statis disimpan", "success");
    } catch {
      toast("Gagal menyimpan QRIS", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWaTemplates = async () => {
    setIsSaving(true);
    try {
      await saveProfile({ waReceiptTemplate, waOrderTemplate });
      toast("✅ Template WA disimpan", "success");
    } catch {
      toast("Gagal menyimpan template WA", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // QRIS upload: convert ke base64
  const handleQrisFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Hanya file gambar yang diperbolehkan", "warning");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("Ukuran gambar maksimal 2 MB", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setQrisImageUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const resetWaTemplate = (type: "receipt" | "order") => {
    if (type === "receipt") setWaReceiptTemplate(DEFAULT_WA_RECEIPT_TEMPLATE);
    else setWaOrderTemplate(DEFAULT_WA_ORDER_TEMPLATE);
    toast("Template direset ke default", "info");
  };

  // Preview WA (render variabel contoh)
  const previewTemplate = (tpl: string) =>
    tpl
      .replace(/\{\{storeName\}\}/g, storeName || "Toko Contoh")
      .replace(/\{\{#address\}\}([\s\S]*?)\{\{\/address\}\}/g, address ? "$1" : "")
      .replace(/\{\{address\}\}/g, address || "Jl. Contoh No. 1")
      .replace(/\{\{#phone\}\}([\s\S]*?)\{\{\/phone\}\}/g, phone ? "$1" : "")
      .replace(/\{\{phone\}\}/g, phone || "08xxxxxxxxxx")
      .replace(/\{\{#discount\}\}([\s\S]*?)\{\{\/discount\}\}/g, "")
      .replace(/\{\{#footerNote\}\}([\s\S]*?)\{\{\/footerNote\}\}/g, footerNote ? "$1" : "")
      .replace(/\{\{footerNote\}\}/g, footerNote)
      .replace(/\{\{items\}\}/g, "• Kopi Susu ×2     Rp20.000\n• Roti Bakar ×1    Rp15.000")
      .replace(/\{\{subtotal\}\}/g, "35.000")
      .replace(/\{\{discount\}\}/g, "0")
      .replace(/\{\{total\}\}/g, "35.000")
      .replace(/\{\{paid\}\}/g, "50.000")
      .replace(/\{\{change\}\}/g, "15.000")
      .replace(/\{\{paymentMethod\}\}/g, "Tunai")
      .replace(/\{\{invoiceNo\}\}/g, "INV-20240421-001");

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: "info", label: "Info Toko", icon: "🏪" },
    { key: "qris", label: "QRIS Statis", icon: "📲" },
    { key: "wa", label: "Template WA", icon: "💬" },
  ];

  return (
    <section className="card" style={{ display: "grid", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700 }}>🏪 Profil & Pengaturan Toko</h2>
          <p style={{ marginTop: "6px", fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
            Data ini tampil di struk cetak, struk WhatsApp, dan halaman kasir. Tersimpan lokal — siap diintegrasikan ke server.
          </p>
        </div>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: "99px",
            background: "hsl(var(--warning)/0.12)",
            color: "hsl(var(--warning))",
            border: "1px solid hsl(var(--warning)/0.3)",
          }}
        >
          💾 Tersimpan Lokal
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid hsl(var(--border))", paddingBottom: "0" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className="btn btn-ghost btn-sm"
            style={{
              borderBottom: activeTab === tab.key ? "3px solid hsl(var(--primary))" : "3px solid transparent",
              borderRadius: 0,
              paddingBottom: "10px",
              color: activeTab === tab.key ? "hsl(var(--primary))" : "hsl(var(--text-secondary))",
              fontWeight: activeTab === tab.key ? 700 : 400,
              gap: "6px",
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: INFO TOKO ─────────────────────────────────────── */}
      {activeTab === "info" && (
        <div style={{ display: "grid", gap: "18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <div>
              <label className="input-label" htmlFor="storeName">Nama Toko *</label>
              <input
                id="storeName"
                className="input-field"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Warung Kopi Bu Sari"
              />
            </div>
            <div>
              <label className="input-label" htmlFor="storePhone">Nomor Telepon / WA</label>
              <input
                id="storePhone"
                className="input-field"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812xxxxxxxx"
                type="tel"
              />
            </div>
          </div>

          <div>
            <label className="input-label" htmlFor="storeAddress">Alamat Toko</label>
            <textarea
              id="storeAddress"
              className="input-field"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Jl. Raya Utama No. 10, Kel. Sukamaju, Kec. Cimahi Utara, Bandung"
              rows={2}
              style={{ resize: "vertical" }}
            />
          </div>

          <div>
            <label className="input-label" htmlFor="footerNote">
              Keterangan Footer Struk
            </label>
            <textarea
              id="footerNote"
              className="input-field"
              value={footerNote}
              onChange={(e) => setFooterNote(e.target.value)}
              placeholder="Terima kasih sudah berbelanja! Barang yang sudah dibeli tidak dapat dikembalikan."
              rows={2}
              style={{ resize: "vertical" }}
            />
            <p style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "4px" }}>
              Teks ini muncul di bagian bawah struk cetak dan struk WA.
            </p>
          </div>

          {/* Preview mini */}
          <div
            style={{
              background: "hsl(var(--bg-elevated))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "12px",
              padding: "14px 16px",
              fontSize: "12px",
              fontFamily: "monospace",
              color: "hsl(var(--text-secondary))",
              lineHeight: 1.7,
            }}
          >
            <div style={{ marginBottom: "6px", fontWeight: 700, fontSize: "13px", color: "hsl(var(--text-primary))" }}>
              👁️ Preview Header Struk
            </div>
            <div style={{ fontWeight: 700 }}>{storeName || "— Nama Toko —"}</div>
            {address && <div>📍 {address}</div>}
            {phone && <div>📞 {phone}</div>}
            <div style={{ borderTop: "1px dashed hsl(var(--border))", marginTop: "8px", paddingTop: "8px" }}>
              {footerNote}
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSaveInfo}
            disabled={isSaving}
            style={{ alignSelf: "flex-start" }}
          >
            {isSaving ? "Menyimpan..." : "💾 Simpan Info Toko"}
          </button>
        </div>
      )}

      {/* ── TAB: QRIS STATIS ───────────────────────────────────── */}
      {activeTab === "qris" && (
        <div style={{ display: "grid", gap: "18px" }}>
          <div>
            <p style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", lineHeight: 1.6 }}>
              Upload gambar QRIS statis dari bank atau aplikasi Anda. Gambar ini akan tampil saat pembayaran QRIS dipilih di kasir, dan bisa dikirim via WhatsApp ke pelanggan.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: qrisImageUrl ? "1fr 1fr" : "1fr", gap: "20px", alignItems: "start" }}>
            {/* Upload area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "2px dashed hsl(var(--border))",
                borderRadius: "12px",
                padding: "32px 20px",
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(var(--primary))";
                (e.currentTarget as HTMLDivElement).style.background = "hsl(var(--primary)/0.04)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(var(--border))";
                (e.currentTarget as HTMLDivElement).style.background = "transparent";
              }}
            >
              <div style={{ fontSize: "40px", marginBottom: "10px" }}>📲</div>
              <div style={{ fontWeight: 600, fontSize: "14px" }}>Klik untuk Upload Gambar QRIS</div>
              <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "6px" }}>PNG / JPG · Maks 2 MB</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleQrisFileChange}
            />

            {/* Preview */}
            {qrisImageUrl && (
              <div style={{ display: "grid", gap: "10px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600 }}>Preview QRIS:</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrisImageUrl}
                  alt="QRIS Preview"
                  style={{
                    width: "100%",
                    maxWidth: "220px",
                    borderRadius: "12px",
                    border: "1px solid hsl(var(--border))",
                    display: "block",
                  }}
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: "hsl(var(--error))", fontSize: "12px" }}
                    onClick={() => setQrisImageUrl("")}
                  >
                    🗑️ Hapus
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: "12px" }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    🔄 Ganti
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Atau URL langsung */}
          <div>
            <label className="input-label" htmlFor="qrisUrl">Atau masukkan URL gambar QRIS langsung</label>
            <input
              id="qrisUrl"
              className="input-field"
              value={qrisImageUrl.startsWith("data:") ? "" : qrisImageUrl}
              onChange={(e) => setQrisImageUrl(e.target.value)}
              placeholder="https://example.com/qris-saya.png"
              type="url"
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSaveQris}
            disabled={isSaving}
            style={{ alignSelf: "flex-start" }}
          >
            {isSaving ? "Menyimpan..." : "💾 Simpan QRIS"}
          </button>
        </div>
      )}

      {/* ── TAB: TEMPLATE WA ───────────────────────────────────── */}
      {activeTab === "wa" && (
        <div style={{ display: "grid", gap: "20px" }}>
          <div>
            <p style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", lineHeight: 1.6 }}>
              Edit template pesan WhatsApp. Gunakan variabel <code style={{ background: "hsl(var(--bg-elevated))", padding: "1px 5px", borderRadius: "4px" }}>{"{{variabel}}"}</code> yang akan diganti otomatis saat pengiriman.
            </p>
          </div>

          {/* Sub-tab: Struk vs Order */}
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              { key: "receipt" as const, label: "🧾 Struk Pembayaran" },
              { key: "order" as const, label: "📋 Konfirmasi Pesanan" },
            ].map((t) => (
              <button
                key={t.key}
                className={`btn btn-sm ${waPreviewMode === t.key ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setWaPreviewMode(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Variabel yang tersedia */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              padding: "12px",
              background: "hsl(var(--bg-elevated))",
              borderRadius: "10px",
              border: "1px solid hsl(var(--border))",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 600, color: "hsl(var(--text-secondary))", width: "100%", marginBottom: "4px" }}>
              📌 Variabel tersedia:
            </span>
            {[
              "{{storeName}}",
              "{{address}}",
              "{{phone}}",
              "{{items}}",
              "{{subtotal}}",
              "{{discount}}",
              "{{total}}",
              "{{paid}}",
              "{{change}}",
              "{{paymentMethod}}",
              "{{invoiceNo}}",
              "{{footerNote}}",
            ].map((v) => (
              <code
                key={v}
                onClick={() => {
                  navigator.clipboard?.writeText(v);
                  toast(`Disalin: ${v}`, "info");
                }}
                title="Klik untuk salin"
                style={{
                  fontSize: "11px",
                  padding: "2px 7px",
                  borderRadius: "4px",
                  background: "hsl(var(--primary)/0.1)",
                  color: "hsl(var(--primary))",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                {v}
              </code>
            ))}
          </div>

          {waPreviewMode === "receipt" ? (
            <>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label className="input-label" style={{ margin: 0 }}>Template Struk WA</label>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: "12px", color: "hsl(var(--warning))" }}
                    onClick={() => resetWaTemplate("receipt")}
                  >
                    🔄 Reset Default
                  </button>
                </div>
                <textarea
                  className="input-field"
                  value={waReceiptTemplate}
                  onChange={(e) => setWaReceiptTemplate(e.target.value)}
                  rows={16}
                  style={{ resize: "vertical", fontFamily: "monospace", fontSize: "13px" }}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label className="input-label" style={{ margin: 0 }}>Template Konfirmasi Pesanan WA</label>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: "12px", color: "hsl(var(--warning))" }}
                    onClick={() => resetWaTemplate("order")}
                  >
                    🔄 Reset Default
                  </button>
                </div>
                <textarea
                  className="input-field"
                  value={waOrderTemplate}
                  onChange={(e) => setWaOrderTemplate(e.target.value)}
                  rows={12}
                  style={{ resize: "vertical", fontFamily: "monospace", fontSize: "13px" }}
                />
              </div>
            </>
          )}

          {/* Preview hasil render */}
          <div style={{ display: "grid", gap: "8px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>
              👁️ Preview Pesan (data contoh):
            </div>
            <div
              style={{
                background: "#075E54",
                borderRadius: "12px 12px 12px 0",
                padding: "14px 16px",
                maxWidth: "360px",
                fontSize: "13px",
                color: "white",
                fontFamily: "inherit",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
              }}
            >
              {previewTemplate(waPreviewMode === "receipt" ? waReceiptTemplate : waOrderTemplate)
                .replace(/\*(.*?)\*/g, "$1")
                .replace(/_(.*?)_/g, "$1")}
            </div>
            <p style={{ fontSize: "11px", color: "hsl(var(--text-muted))" }}>
              *Bold* dan _italic_ akan ditampilkan sesuai format WhatsApp
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSaveWaTemplates}
            disabled={isSaving}
            style={{ alignSelf: "flex-start" }}
          >
            {isSaving ? "Menyimpan..." : "💾 Simpan Template WA"}
          </button>
        </div>
      )}
    </section>
  );
}
