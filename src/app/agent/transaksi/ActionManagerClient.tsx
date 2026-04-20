"use client";

import { useState } from "react";
import { formatRupiahFull, formatDateShort } from "@/lib/utils";
import { getTokenConversion } from "@/lib/token-settings-shared";

interface ActionManagerProps {
  requests: any[];
  tenants: any[];
  tokenConfig: any;
  agentId: string;
}

export default function ActionManagerClient({ requests, tenants, tokenConfig, agentId }: ActionManagerProps) {
  const [localReqs, setLocalReqs] = useState(requests);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"REQUESTS" | "MANUAL">("REQUESTS");

  // State untuk form manual "Mint / Aktivasi"
  const [selectedTenant, setSelectedTenant] = useState("");
  const [targetKey, setTargetKey] = useState("POS_SLOT");
  const [qty, setQty] = useState(1);

  const posConversion = getTokenConversion(tokenConfig, "POS_SLOT");
  const licenseConversion = getTokenConversion(tokenConfig, "LICENSE_MONTH");

  async function handleApprove(reqId: string, actionDetails: any) {
    if (!confirm("Konfirmasi aktivasi fitur ini? Pastikan Anda sudah menerima pembayaran dari toko.")) return;
    setIsSubmitting(true);
    try {
      // 1. Panggil API agen approval (nanti kita buat route-nya)
      const res = await fetch(`/api/agent/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reqId,
          tenantId: actionDetails.tenantId,
          targetKey: targetKey,
          quantity: qty,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengaktifkan");

      alert("Berhasil menyetujui dan mengaktifkan fitur ke toko.");
      if (reqId) {
        setLocalReqs(localReqs.filter(r => r.id !== reqId));
      }
      window.location.reload();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReject(reqId: string) {
    if (!confirm("Tolak permintaan ini?")) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/agent/purchase-requests/${reqId}/reject`, { method: "POST" });
      if (res.ok) {
        setLocalReqs(localReqs.filter(r => r.id !== reqId));
      }
    } catch (e) {
      alert("Gagal menolak");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid hsl(var(--border))", paddingBottom: "16px" }}>
        <button 
          onClick={() => setActiveTab("REQUESTS")}
          className={`btn ${activeTab === "REQUESTS" ? "btn-primary" : "btn-ghost"}`}
        >
          Notifikasi Permintaan ({localReqs.length})
        </button>
        <button 
          onClick={() => setActiveTab("MANUAL")}
          className={`btn ${activeTab === "MANUAL" ? "btn-primary" : "btn-ghost"}`}
        >
          Aktivasi Manual (Minting)
        </button>
      </div>

      {activeTab === "REQUESTS" && (
        <section className="card">
          <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>Daftar Antrean Pembelian</h2>
          {localReqs.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", border: "1px dashed hsl(var(--border))", borderRadius: "12px", color: "hsl(var(--text-muted))" }}>
              Tidak ada permintaan tertunda.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "16px" }}>
              {localReqs.map(req => (
                <div key={req.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "16px", padding: "16px", border: "1px solid hsl(var(--border))", borderRadius: "12px", background: "hsl(var(--bg-elevated))" }}>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "hsl(var(--primary))" }}>{req.tenant.name}</h3>
                    <div style={{ marginTop: "4px", fontSize: "14px", color: "hsl(var(--text-secondary))" }}>
                      Meminta: <strong>{req.amount} Token</strong> (Est. Nilai: Rp {Number(req.totalPrice).toLocaleString("id-ID")})
                    </div>
                    {req.voucherCode && (
                      <div style={{ marginTop: "4px", fontSize: "12px", fontWeight: 600, color: "hsl(var(--warning))" }}>
                        Kupon Digunakan: {req.voucherCode}
                      </div>
                    )}
                    <div style={{ marginTop: "8px", fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                      Waktu Pesan: {formatDateShort(req.createdAt)}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {/* Alih-alih langsung 'approve', kita prefill form aktivasi manual */}
                    <button 
                      onClick={() => {
                        setSelectedTenant(req.tenantId);
                        setQty(req.amount);
                        setActiveTab("MANUAL");
                      }} 
                      disabled={isSubmitting} 
                      className="btn btn-primary"
                    >
                      Proses (Mint)
                    </button>
                    <button 
                      onClick={() => handleReject(req.id)} 
                      disabled={isSubmitting} 
                      className="btn btn-ghost" 
                      style={{ color: "hsl(var(--danger))" }}
                    >
                      Tolak Saja
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "MANUAL" && (
        <section className="card">
          <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>Aktivasi Fitur / Cetak ke Toko</h2>
          <p style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", marginBottom: "20px" }}>
            Tentukan toko mana yang ingin Anda berikan fasilitas. Proses ini akan <strong>MENGURANGI SALDO TOKEN AGEN ANDA</strong> dan mencetaknya menjadi fasilitas aktif untuk toko tersebut.
          </p>

          <div style={{ display: "grid", gap: "20px", background: "hsl(var(--bg-elevated))", padding: "20px", borderRadius: "12px", border: "1px solid hsl(var(--border))" }}>
            <div>
              <label className="input-label">Pilih Toko Sasaran</label>
              <select className="input-field" value={selectedTenant} onChange={e => setSelectedTenant(e.target.value)}>
                <option value="">-- Pilih Toko Anda --</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name} (Terpakai: {t.tokenUsed} ST)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label">Jenis Layanan / Fitur yang Ditambahkan</label>
              <select className="input-field" value={targetKey} onChange={e => setTargetKey(e.target.value)}>
                {posConversion && (
                  <option value="POS_SLOT">Terminal POS Tambahan (Harga: {posConversion.tokenCost} token/POS)</option>
                )}
                {licenseConversion && (
                  <option value="LICENSE_MONTH">Perpanjang Usia Lisensi Penuh (Harga: {licenseConversion.tokenCost} token/bulan)</option>
                )}
              </select>
            </div>

            <div>
              <label className="input-label">Kuantitas (Misal: 2 = 2 Bulan Lisensi atau 2 POS Baru)</label>
              <input 
                type="number" 
                min={1} 
                className="input-field" 
                value={qty} 
                onChange={e => setQty(Number(e.target.value))} 
              />
            </div>

            <button 
              className="btn btn-primary" 
              disabled={isSubmitting || !selectedTenant || qty < 1}
              onClick={() => handleApprove("", { tenantId: selectedTenant })}
              style={{ padding: "12px", justifyContent: "center" }}
            >
              Cetak / Aktifkan Sekarang
            </button>
          </div>
        </section>
      )}
    </>
  );
}
