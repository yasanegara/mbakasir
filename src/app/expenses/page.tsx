"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb, enqueueSyncOp } from "@/lib/db";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatRupiahFull } from "@/lib/utils";
import { useState, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAuth, useToast } from "@/contexts/AppProviders";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

const CATEGORIES = [
  { id: "Listrik & Air", icon: "💧" },
  { id: "Sewa Tempat", icon: "🏠" },
  { id: "Gaji Karyawan", icon: "👥" },
  { id: "Perlengkapan Toko", icon: "📦" },
  { id: "Pemasaran/Iklan", icon: "📣" },
  { id: "Transportasi", icon: "🚚" },
  { id: "Pemeliharaan", icon: "🔧" },
  { id: "Lain-lain", icon: "📝" }
];

export default function ExpensesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const tenantId = user?.tenantId;
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const expenses = useLiveQuery(
    () => (tenantId ? getDb().expenses.where("tenantId").equals(tenantId).reverse().sortBy("date") : []),
    [tenantId]
  ) ?? [];

  const sales = useLiveQuery(() => tenantId ? getDb().sales.where("tenantId").equals(tenantId).and(s => s.status === "COMPLETED").toArray() : [], [tenantId]) || [];
  const rawMaterials = useLiveQuery(() => tenantId ? getDb().rawMaterials.where("tenantId").equals(tenantId).toArray() : [], [tenantId]) || [];
  const products = useLiveQuery(() => tenantId ? getDb().products.where("tenantId").equals(tenantId).toArray() : [], [tenantId]) || [];
  const allAssets = useLiveQuery(() => tenantId ? getDb().assets.where("tenantId").equals(tenantId).toArray() : [], [tenantId]) || [];
  const returns = useLiveQuery(() => tenantId ? getDb().salesReturns.where("tenantId").equals(tenantId).toArray() : [], [tenantId]) || [];
  
  const initialCapital = useLiveQuery(async () => {
    const pDefault = await getDb().storeProfile.get("default");
    if (!tenantId) return pDefault?.initialCapital || 0;
    const pTenant = await getDb().storeProfile.get(tenantId);
    return pTenant?.initialCapital || pDefault?.initialCapital || 0;
  }, [tenantId]) || 0;

  const currentCash = useMemo(() => {
    const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalReturns = returns.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalAssetValue = allAssets.reduce((sum, a) => sum + a.purchasePrice, 0);
    const persediaanProduk = products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0);
    const persediaanBahan = rawMaterials.reduce((sum, m) => sum + (m.stock * m.costPerUnit), 0);
    const totalPersediaan = persediaanProduk + persediaanBahan;

    return initialCapital + totalSales - totalExpenses - totalReturns - totalAssetValue - totalPersediaan;
  }, [initialCapital, sales, expenses, returns, allAssets, products, rawMaterials]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tenantId || !amount) return;

    if (amount > currentCash) {
      if (!confirm(`⚠️ Kas di laci (${formatRupiahFull(currentCash)}) tidak cukup untuk membayar biaya ini (${formatRupiahFull(amount)}). Tetap lanjutkan?`)) {
        return;
      }
    }

    const localId = uuidv4();
    const newExpense = {
      localId,
      tenantId,
      userId: user.sub,
      category,
      amount: amount,
      notes,
      date: new Date(date).getTime(),
      syncStatus: "PENDING" as const,
      createdAt: Date.now(),
    };

    await getDb().expenses.add(newExpense);
    await enqueueSyncOp("expenses", localId, "CREATE", newExpense);

    toast("Biaya berhasil dicatat", "success");
    setAmount(0);
    setNotes("");
    setShowModal(false);
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const thisMonthTotal = expenses
    .filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const totalAllTime = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleDelete = async (localId: string) => {
    if (!confirm("Hapus biaya ini?")) return;
    await getDb().expenses.delete(localId);
    await enqueueSyncOp("expenses", localId, "DELETE", { localId });
    toast("Catatan biaya dihapus", "info");
  };

  return (
    <DashboardLayout title="Biaya Operasional">
      <div style={{ display: "grid", gap: "24px" }}>
        
        {/* Header Section */}
        <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "20px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 900, marginBottom: "8px", letterSpacing: "-0.5px" }}>💸 Pengeluaran Toko</h1>
            <p style={{ color: "hsl(var(--text-secondary))", fontSize: "14px" }}>Monitor dan catat semua biaya operasional untuk laporan laba rugi yang akurat.</p>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ height: "48px", padding: "0 24px", borderRadius: "12px", boxShadow: "0 4px 12px hsl(var(--primary)/0.3)" }}
            onClick={() => setShowModal(true)}
          >
            ➕ Catat Biaya Baru
          </button>
        </section>

        {/* Stats Section */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px" }}>
          <div className="card" style={{ padding: "20px", borderLeft: "4px solid hsl(var(--primary))" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--text-secondary))", marginBottom: "8px" }}>Bulan Ini</div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "hsl(var(--primary))" }}>{formatRupiahFull(thisMonthTotal)}</div>
          </div>
          <div className="card" style={{ padding: "20px", borderLeft: "4px solid hsl(var(--warning))" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--text-secondary))", marginBottom: "8px" }}>Total Semua Waktu</div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "hsl(var(--warning))" }}>{formatRupiahFull(totalAllTime)}</div>
          </div>
          <div className="card" style={{ padding: "20px", borderLeft: "4px solid hsl(var(--success))" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--text-secondary))", marginBottom: "8px" }}>Jumlah Transaksi</div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "hsl(var(--success))" }}>{expenses.length}</div>
          </div>
        </section>

        {/* List Section */}
        <section className="card" style={{ padding: 0, overflow: "hidden", borderRadius: "16px" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid hsl(var(--border))", background: "hsl(var(--bg-elevated))" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700 }}>Riwayat Pengeluaran</h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "hsl(var(--bg-elevated)/0.5)", borderBottom: "1px solid hsl(var(--border))" }}>
                  <th style={thStyle}>Tanggal</th>
                  <th style={thStyle}>Kategori</th>
                  <th style={thStyle}>Catatan</th>
                  <th style={thStyle}>Jumlah</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "60px", textAlign: "center" }}>
                      <div style={{ fontSize: "40px", marginBottom: "16px" }}>📄</div>
                      <div style={{ fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Belum ada pengeluaran yang dicatat.</div>
                    </td>
                  </tr>
                ) : (
                  expenses.map((ex) => {
                    const cat = CATEGORIES.find(c => c.id === ex.category);
                    return (
                      <tr key={ex.localId} style={{ borderBottom: "1px solid hsl(var(--border))", transition: "background 0.2s" }} className="hover-row">
                        <td style={tdStyle}>{new Date(ex.date).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "18px" }}>{cat?.icon || "💰"}</span>
                            <span style={{ fontWeight: 600, fontSize: "13px" }}>{ex.category}</span>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, color: "hsl(var(--text-secondary))", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ex.notes || "-"}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 800, color: "hsl(var(--error))" }}>
                          {formatRupiahFull(ex.amount)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            style={{ color: "hsl(var(--error))", opacity: 0.6 }} 
                            onClick={() => handleDelete(ex.localId)}
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showModal && (
        <div className="modal-overlay active" style={{ backdropFilter: "blur(8px)", background: "hsl(var(--bg-card)/0.8)" }}>
          <div className="card animate-slide-up" style={{ width: "100%", maxWidth: "480px", padding: "0", overflow: "hidden", borderRadius: "24px", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "24px", background: "var(--gradient-primary)", color: "white" }}>
              <h3 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>➕ Catat Pengeluaran</h3>
              <p style={{ margin: "4px 0 0", opacity: 0.8, fontSize: "13px" }}>Pastikan data yang dimasukkan sudah benar.</p>
            </div>
            
            <form onSubmit={handleSave} style={{ padding: "24px", display: "grid", gap: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="form-group">
                  <label className="input-label">Tanggal</label>
                  <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="input-label">Kategori</label>
                  <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.id}</option>)}
                  </select>
                </div>
              </div>

              <CurrencyInput 
                label="Jumlah Pengeluaran" 
                value={amount} 
                onChange={setAmount} 
                placeholder="0"
              />

              <div className="form-group">
                <label className="input-label">Keterangan / Catatan</label>
                <textarea 
                  className="input-field" 
                  placeholder="Contoh: Pembayaran listrik toko periode April 2024" 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  rows={3} 
                  style={{ resize: "none" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "8px" }}>
                <button type="button" className="btn btn-ghost" style={{ height: "48px" }} onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ height: "48px", fontWeight: 700 }}>Simpan Catatan</button>
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
}const thStyle: React.CSSProperties = { padding: "16px 24px", fontSize: "13px", fontWeight: 600, color: "hsl(var(--text-secondary))", textTransform: "uppercase", letterSpacing: "0.5px" };
const tdStyle: React.CSSProperties = { padding: "16px 24px", fontSize: "14px" };
