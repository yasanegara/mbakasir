"use client";

import { useState } from "react";
import { useToast } from "@/contexts/AppProviders";
import { formatDateShort } from "@/lib/utils";

interface PosTerminalSummary {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
  isActive: boolean;
  tokenCost: number;
  targetRevenue: number;
  createdAt: string;
}

import { getDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { formatRupiahFull } from "@/lib/utils";

export default function PosTerminalManager({
  tenantName,
  tokenSymbol,
  posRuleLabel,
  posTokenCost,
  initialTerminals,
}: {
  tenantName: string;
  agentName: string;
  tokenSymbol: string;
  posRuleLabel: string | null;
  posTokenCost: number | null;
  initialAgentBalance: number;
  initialTokenUsed: number;
  initialTerminals: PosTerminalSummary[];
}) {
  const { toast } = useToast();
  const [terminals, setTerminals] = useState(initialTerminals);
  const [newTerminalName, setNewTerminalName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedTerminalId, setSelectedTerminalId] = useState<string | null>(null);

  const sales = useLiveQuery(() => getDb().sales.toArray()) || [];
  const saleItems = useLiveQuery(() => getDb().saleItems.toArray()) || [];

  const selectedTerminal = terminals.find(t => t.id === selectedTerminalId);

  // Performance calculations
  const terminalSales = sales.filter(s => s.terminalId === selectedTerminalId && s.status !== "VOIDED");
  const totalRevenue = terminalSales.reduce((acc, s) => acc + s.totalAmount, 0);
  
  const topProducts = (() => {
    const counts: Record<string, { name: string, qty: number, revenue: number }> = {};
    terminalSales.forEach(s => {
      const items = saleItems.filter(si => si.saleLocalId === s.localId);
      items.forEach(si => {
        if (!counts[si.productId]) counts[si.productId] = { name: si.productName, qty: 0, revenue: 0 };
        counts[si.productId].qty += si.quantity;
        counts[si.productId].revenue += si.subtotal;
      });
    });
    return Object.values(counts).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  })();

  async function handleCreateTerminal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!posRuleLabel) {
      toast("Rule POS tambahan belum diaktifkan oleh Super Admin", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/tenant/pos-terminals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newTerminalName || `POS ${terminals.length + 1}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast(data.error || "Gagal menambahkan terminal POS", "error");
        return;
      }

      setTerminals((current) => [...current, data.terminal]);
      setNewTerminalName("");
      setShowForm(false);
      toast(
        `POS ${data.terminal.name} berhasil dibuat.`,
        "success"
      );
    } catch {
      toast("Terjadi kesalahan jaringan saat menambah POS", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <section className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Header & Stats */}
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid hsl(var(--border))",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            background: "hsl(var(--bg-card))"
          }}
        >
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700 }}>🖥️ Manajemen POS & Terminal</h2>
            <p style={{ marginTop: "4px", fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
              Kelola terminal kasir untuk {tenantName}.
            </p>
          </div>
          
          <button 
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
            style={{ 
              fontSize: "13px", 
              padding: "10px 20px", 
              borderRadius: "10px",
              boxShadow: "0 4px 10px hsl(var(--primary) / 0.3)"
            }}
          >
            ➕ Tambah POS (1 {tokenSymbol})
          </button>
        </div>

        {/* Create Form (Overlay/Dropdown style) */}
        {showForm && (
          <div style={{ padding: "20px", borderBottom: "1px solid hsl(var(--border))", background: "hsl(var(--bg-elevated) / 0.5)", borderLeft: "4px solid hsl(var(--primary))" }}>
            <form
              onSubmit={handleCreateTerminal}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "12px",
                alignItems: "end",
              }}
            >
              <div>
                <label className="input-label" style={{ fontSize: "11px", marginBottom: "6px" }}>
                  Nama Terminal Baru
                </label>
                <input
                  autoFocus
                  className="input-field"
                  style={{ padding: "8px 12px", height: "38px" }}
                  value={newTerminalName}
                  onChange={(e) => setNewTerminalName(e.target.value)}
                  placeholder={`Contoh: POS ${terminals.length + 1}`}
                />
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn btn-ghost"
                  style={{ height: "38px" }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ height: "38px", padding: "0 20px" }}
                >
                  {isSubmitting ? "Memproses..." : "Konfirmasi (1 T.)"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List of Terminals */}
        <div style={{ display: "grid", gap: "1px", background: "hsl(var(--border))" }}>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "2fr 1fr 1fr", 
            padding: "12px 20px", 
            background: "hsl(var(--bg-elevated))",
            fontSize: "11px",
            fontWeight: 800,
            color: "hsl(var(--text-muted))",
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            <span>Terminal</span>
            <span>Kode Akses</span>
            <span style={{ textAlign: "right" }}>Status</span>
          </div>

          {terminals.map((terminal) => (
            <div
              key={terminal.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr",
                gap: "16px",
                padding: "16px 20px",
                background: "hsl(var(--bg-card))",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "14px", color: "hsl(var(--text-primary))" }}>{terminal.name}</div>
                <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                  {terminal.isDefault && <span className="badge badge-success" style={{ fontSize: "9px", padding: "2px 6px" }}>UTAMA</span>}
                  <span style={{ fontSize: "10px", color: "hsl(var(--text-muted))" }}>Aktif sejak {formatDateShort(terminal.createdAt)}</span>
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 700, fontFamily: "monospace", fontSize: "15px", color: "hsl(var(--primary))" }}>{terminal.code}</div>
              </div>

              <div style={{ textAlign: "right", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button 
                  onClick={() => setSelectedTerminalId(terminal.id)}
                  className="btn btn-sm btn-outline"
                  style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "8px" }}
                >
                  📊 Detail
                </button>
                <span className={`badge ${terminal.isActive ? "badge-success" : "badge-warning"}`} style={{ fontSize: "10px" }}>
                  {terminal.isActive ? "Aktif" : "Nonaktif"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Terminal Detail Modal */}
      {selectedTerminal && (
        <div style={{ 
          position: "fixed", 
          inset: 0, 
          background: "rgba(0,0,0,0.5)", 
          backdropFilter: "blur(4px)", 
          zIndex: 1000, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          padding: "20px"
        }}>
          <div className="card" style={{ width: "100%", maxWidth: "500px", background: "hsl(var(--bg-card))", boxShadow: "0 20px 50px rgba(0,0,0,0.3)", borderRadius: "24px", overflow: "hidden" }}>
            <div style={{ padding: "24px", borderBottom: "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 700 }}>📈 Detail POS: {selectedTerminal.name}</h3>
                <code style={{ fontSize: "12px", color: "hsl(var(--primary))", background: "hsl(var(--primary) / 0.1)", padding: "2px 6px", borderRadius: "4px", marginTop: "4px", display: "inline-block" }}>
                  Terminal ID: {selectedTerminal.id}
                </code>
              </div>
              <button onClick={() => setSelectedTerminalId(null)} className="btn btn-ghost btn-sm" style={{ borderRadius: "50%", width: "32px", height: "32px", padding: 0 }}>✕</button>
            </div>

            <div style={{ padding: "24px", display: "grid", gap: "24px" }}>
              {/* Stats Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ padding: "16px", background: "hsl(var(--bg-elevated))", borderRadius: "16px" }}>
                  <div style={{ fontSize: "11px", color: "hsl(var(--text-muted))", textTransform: "uppercase", fontWeight: 700 }}>Omset Saat Ini</div>
                  <div style={{ fontSize: "20px", fontWeight: 800, marginTop: "4px" }}>{formatRupiahFull(totalRevenue)}</div>
                </div>
                <div style={{ padding: "16px", background: "hsl(var(--bg-elevated))", borderRadius: "16px" }}>
                  <div style={{ fontSize: "11px", color: "hsl(var(--text-muted))", textTransform: "uppercase", fontWeight: 700 }}>Total Transaksi</div>
                  <div style={{ fontSize: "20px", fontWeight: 800, marginTop: "4px" }}>{terminalSales.length}</div>
                </div>
              </div>

              {/* Target Omset */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>🎯 Target Omset</span>
                  <span style={{ fontSize: "12px", color: "hsl(var(--primary))", fontWeight: 700 }}>
                    {selectedTerminal.targetRevenue > 0 
                      ? `${Math.round((totalRevenue / selectedTerminal.targetRevenue) * 100)}%` 
                      : "Belum Diatur"}
                  </span>
                </div>
                <div style={{ height: "12px", background: "hsl(var(--border))", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{ 
                    height: "100%", 
                    width: `${Math.min(100, selectedTerminal.targetRevenue > 0 ? (totalRevenue / selectedTerminal.targetRevenue) * 100 : 0)}%`, 
                    background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))",
                    transition: "width 0.5s ease"
                  }} />
                </div>
                <p style={{ fontSize: "11px", color: "hsl(var(--text-muted))", marginTop: "6px", textAlign: "right", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px" }}>
                  Target: 
                  <input 
                    type="number"
                    className="input-field"
                    style={{ width: "120px", height: "24px", padding: "0 8px", fontSize: "11px" }}
                    value={selectedTerminal.targetRevenue}
                    onChange={async (e) => {
                      const val = parseFloat(e.target.value) || 0;
                      // Update local state
                      setTerminals(prev => prev.map(t => t.id === selectedTerminalId ? { ...t, targetRevenue: val } : t));
                      // Update Dexie
                      const db = getDb();
                      await db.posTerminals.update(selectedTerminalId!, { targetRevenue: val });
                      
                      // Update Server
                      try {
                        await fetch("/api/tenant/pos-terminals", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: selectedTerminalId, targetRevenue: val })
                        });
                      } catch (err) {
                        console.error("Failed to sync targetRevenue to server", err);
                      }
                    }}
                  />
                </p>
              </div>

              {/* Top Products */}
              <div>
                <h4 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "12px" }}>🏆 Top 5 Produk</h4>
                <div style={{ display: "grid", gap: "8px" }}>
                  {topProducts.length === 0 ? (
                    <p style={{ fontSize: "12px", color: "hsl(var(--text-muted))", textAlign: "center", padding: "20px" }}>Belum ada data penjualan.</p>
                  ) : topProducts.map((p, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "hsl(var(--bg-elevated))", borderRadius: "12px" }}>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <span style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))", borderRadius: "50%", fontSize: "11px", fontWeight: 800 }}>{i+1}</span>
                        <span style={{ fontSize: "13px", fontWeight: 600 }}>{p.name}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "12px", fontWeight: 700 }}>{formatRupiahFull(p.revenue)}</div>
                        <div style={{ fontSize: "10px", color: "hsl(var(--text-muted))" }}>{p.qty} terjual</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: "24px", borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--bg-elevated) / 0.3)" }}>
              <button 
                onClick={() => setSelectedTerminalId(null)}
                className="btn btn-primary" 
                style={{ width: "100%", borderRadius: "14px" }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
