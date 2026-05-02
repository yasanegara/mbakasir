"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb, enqueueSyncOp } from "@/lib/db";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatRupiahFull } from "@/lib/utils";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAuth, useToast } from "@/contexts/AppProviders";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

export default function AssetsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const tenantId = user?.tenantId;
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [years, setYears] = useState(4);
  const [notes, setNotes] = useState("");

  const assets = useLiveQuery(
    () => (tenantId ? getDb().assets.where("tenantId").equals(tenantId).reverse().sortBy("purchaseDate") : []),
    [tenantId]
  ) ?? [];
  const visibleAssets = assets.filter((asset) => !asset.archivedAt);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tenantId || !name || !price) return;

    const localId = uuidv4();
    const newAsset = {
      localId,
      tenantId,
      name,
      purchasePrice: price,
      purchaseDate: new Date(date).getTime(),
      depreciationYears: years,
      notes,
      syncStatus: "PENDING" as const,
      createdAt: Date.now(),
    };

    await getDb().assets.add(newAsset);
    await enqueueSyncOp("assets", localId, "CREATE", newAsset);

    toast("Aset berhasil dicatat", "success");
    setName("");
    setPrice(0);
    setNotes("");
    setShowModal(false);
  };

  const totalAssetValue = visibleAssets.reduce((sum, as) => sum + as.purchasePrice, 0);

  const handleDelete = async (localId: string, archivedAt: number) => {
    if (!confirm("Sembunyikan aset ini dari daftar aktif? Histori investasi akan tetap disimpan.")) return;
    await getDb().assets.update(localId, { archivedAt });
    toast("Aset diarsipkan dari daftar aktif", "info");
  };

  return (
    <DashboardLayout title="Aset Tetap">
      <div style={{ display: "grid", gap: "24px" }}>
        
        {/* Header Section */}
        <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "20px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 900, marginBottom: "8px", letterSpacing: "-0.5px" }}>🏢 Aset Tetap</h1>
            <p style={{ color: "hsl(var(--text-secondary))", fontSize: "14px" }}>Kelola peralatan, mesin, perabot, dan aset fisik jangka panjang toko Anda.</p>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ height: "48px", padding: "0 24px", borderRadius: "12px", boxShadow: "0 4px 12px hsl(var(--primary)/0.3)" }}
            onClick={() => setShowModal(true)}
          >
            ➕ Tambah Aset Baru
          </button>
        </section>

        {/* Stats Section */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px" }}>
          <div className="card" style={{ padding: "20px", borderLeft: "4px solid hsl(var(--primary))" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--text-secondary))", marginBottom: "8px" }}>Total Nilai Aset</div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "hsl(var(--primary))" }}>{formatRupiahFull(totalAssetValue)}</div>
          </div>
          <div className="card" style={{ padding: "20px", borderLeft: "4px solid hsl(var(--success))" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--text-secondary))", marginBottom: "8px" }}>Jumlah Item Aset</div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "hsl(var(--success))" }}>{visibleAssets.length} Item</div>
          </div>
        </section>

        {/* List Section */}
        <section className="card" style={{ padding: 0, overflow: "hidden", borderRadius: "16px" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid hsl(var(--border))", background: "hsl(var(--bg-elevated))" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700 }}>Daftar Inventaris Aset</h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "hsl(var(--bg-elevated)/0.5)", borderBottom: "1px solid hsl(var(--border))" }}>
                  <th style={thStyle}>Nama Aset</th>
                  <th style={thStyle}>Tanggal Beli</th>
                  <th style={thStyle}>Harga Perolehan</th>
                  <th style={thStyle}>Masa Pakai</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visibleAssets.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "60px", textAlign: "center" }}>
                      <div style={{ fontSize: "40px", marginBottom: "16px" }}>🏢</div>
                      <div style={{ fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Belum ada aset tetap yang dicatat.</div>
                    </td>
                  </tr>
                ) : (
                  visibleAssets.map((as) => (
                    <tr key={as.localId} style={{ borderBottom: "1px solid hsl(var(--border))", transition: "background 0.2s" }} className="hover-row">
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "hsl(var(--primary)/0.1)", color: "hsl(var(--primary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                            {as.name.toLowerCase().includes("mesin") ? "⚙️" : as.name.toLowerCase().includes("meja") || as.name.toLowerCase().includes("kursi") ? "🪑" : "📦"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "14px" }}>{as.name}</div>
                            {as.notes && <div style={{ fontSize: "11px", color: "hsl(var(--text-muted))" }}>{as.notes}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}>{new Date(as.purchaseDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td style={{ ...tdStyle, fontWeight: 800, color: "hsl(var(--primary))" }}>
                        {formatRupiahFull(as.purchasePrice)}
                      </td>
                      <td style={tdStyle}>
                        <span className="badge" style={{ background: "hsl(var(--bg-elevated))", color: "hsl(var(--text-primary))", fontWeight: 600 }}>
                          {as.depreciationYears} Tahun
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          style={{ color: "hsl(var(--error))", opacity: 0.6 }} 
                          onClick={(event) => handleDelete(as.localId, event.timeStamp)}
                        >
                          Arsipkan
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showModal && (
        <div className="modal-overlay active" style={{ backdropFilter: "blur(8px)", background: "hsl(var(--bg-card)/0.8)" }}>
          <div className="card animate-slide-up" style={{ width: "100%", maxWidth: "500px", padding: "0", overflow: "hidden", borderRadius: "24px", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "24px", background: "var(--gradient-primary)", color: "white" }}>
              <h3 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>🏢 Tambah Aset Tetap</h3>
              <p style={{ margin: "4px 0 0", opacity: 0.8, fontSize: "13px" }}>Catat perolehan aset baru untuk laporan neraca.</p>
            </div>
            
            <form onSubmit={handleSave} style={{ padding: "24px", display: "grid", gap: "20px" }}>
              <div className="form-group">
                <label className="input-label">Nama Aset</label>
                <input 
                  className="input-field" 
                  placeholder="Contoh: Mesin Espresso, Meja Kasir, AC" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "16px" }}>
                <div className="form-group">
                  <label className="input-label">Tanggal Perolehan</label>
                  <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="input-label">Masa Pakai (Thn)</label>
                  <input type="number" className="input-field" value={years} onChange={(e) => setYears(parseInt(e.target.value))} required />
                </div>
              </div>

              <CurrencyInput 
                label="Harga Beli / Nilai Perolehan" 
                value={price} 
                onChange={setPrice} 
                placeholder="0"
              />

              <div className="form-group">
                <label className="input-label">Catatan Tambahan (Opsional)</label>
                <textarea 
                  className="input-field" 
                  placeholder="Merk, serial number, atau lokasi aset..." 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  rows={2} 
                  style={{ resize: "none" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "8px" }}>
                <button type="button" className="btn btn-ghost" style={{ height: "48px" }} onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ height: "48px", fontWeight: 700 }}>Simpan Aset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .hover-row:hover {
          background: hsl(var(--bg-elevated)/0.5) !important;
        }
      `}</style>
    </DashboardLayout>
  );
}

const thStyle: React.CSSProperties = { padding: "16px 24px", fontSize: "13px", fontWeight: 600, color: "hsl(var(--text-secondary))", textTransform: "uppercase", letterSpacing: "0.5px" };
const tdStyle: React.CSSProperties = { padding: "16px 24px", fontSize: "14px" };
