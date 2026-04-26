"use client";

import { useState, useEffect } from "react";
import { formatRupiahFull } from "@/lib/utils";

interface LedgerEntry {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
  tenant?: { name: string };
  agent?: { name: string };
}

interface TokenLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export default function TokenLedgerModal({ isOpen, onClose, title = "Riwayat Transaksi Token" }: TokenLedgerModalProps) {
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchLedger();
    }
  }, [isOpen]);

  async function fetchLedger() {
    setLoading(true);
    try {
      const res = await fetch("/api/common/tokens/ledger");
      const data = await res.json();
      if (data.ledger) {
        setLedger(data.ledger);
      }
    } catch (err) {
      console.error("Failed to fetch ledger", err);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div style={{ 
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
    }}>
      <div className="card" style={{ 
        maxWidth: "800px", width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column",
        padding: 0, borderRadius: "24px", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
      }}>
        {/* Header */}
        <div style={{ 
          padding: "24px 32px", borderBottom: "1px solid hsl(var(--border))",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "hsl(var(--bg-elevated))"
        }}>
          <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>{title}</h2>
          <button 
            className="btn btn-ghost btn-icon" 
            onClick={onClose}
            style={{ fontSize: "20px" }}
          >✕</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 32px 32px" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "hsl(var(--text-muted))" }}>
              Memuat riwayat...
            </div>
          ) : ledger.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "hsl(var(--text-muted))" }}>
              Belum ada transaksi token.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
              {ledger.map((entry) => (
                <div key={entry.id} style={{ 
                  padding: "16px", borderRadius: "16px", border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--bg-surface))", display: "flex", justifyContent: "space-between", gap: "16px"
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ 
                        fontSize: "11px", fontWeight: 800, padding: "2px 8px", borderRadius: "6px",
                        background: entry.amount > 0 ? "hsl(142 70% 45% / 0.1)" : "hsl(0 72% 51% / 0.1)",
                        color: entry.amount > 0 ? "hsl(142 70% 45%)" : "hsl(0 72% 51%)",
                        textTransform: "uppercase"
                      }}>
                        {entry.type}
                      </span>
                      <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                        {new Date(entry.createdAt).toLocaleString("id-ID", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ marginTop: "8px", fontSize: "14px", fontWeight: 600 }}>{entry.description}</div>
                    {entry.tenant && (
                      <div style={{ marginTop: "4px", fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                        Toko: {entry.tenant.name}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ 
                      fontSize: "18px", fontWeight: 800, 
                      color: entry.amount > 0 ? "hsl(142 70% 45%)" : "hsl(0 72% 51%)"
                    }}>
                      {entry.amount > 0 ? "+" : ""}{entry.amount} T
                    </div>
                    <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "4px" }}>
                      Saldo: {entry.balanceAfter} T
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
