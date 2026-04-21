"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatRupiahFull } from "@/lib/utils";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AppProviders";

// ============================================================
// RIWAYAT TRANSAKSI POS — Dilihat Owner & Kasir
// ============================================================

export default function SalesHistoryPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const sales = useLiveQuery(() =>
    getDb().sales.orderBy("createdAt").reverse().limit(200).toArray()
  ) || [];

  const saleItems = useLiveQuery(() => getDb().saleItems.toArray()) || [];

  const filtered = useMemo(() => {
    if (!search.trim()) return sales;
    const q = search.toLowerCase();
    return sales.filter(
      (s) =>
        s.invoiceNo.toLowerCase().includes(q) ||
        s.paymentMethod.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q)
    );
  }, [sales, search]);

  const totalRevenue = sales
    .filter((s) => s.status === "COMPLETED")
    .reduce((sum, s) => sum + s.totalAmount, 0);

  const totalVoided = sales.filter((s) => s.status === "VOIDED").length;

  const paymentMethodLabel: Record<string, string> = {
    CASH: "Tunai",
    QRIS: "QRIS",
    TRANSFER: "Transfer",
    CREDIT: "Kredit",
  };

  const statusColor: Record<string, string> = {
    COMPLETED: "var(--success)",
    VOIDED: "var(--error)",
    PENDING: "var(--warning)",
  };

  const statusLabel: Record<string, string> = {
    COMPLETED: "Selesai",
    VOIDED: "Dibatalkan",
    PENDING: "Pending",
  };

  return (
    <DashboardLayout title="Riwayat Transaksi">
      <div style={{ display: "grid", gap: "24px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <div className="stat-card">
            <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>Total Transaksi</span>
            <span className="stat-value">{sales.length}</span>
            <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "4px" }}>
              {sales.filter((s) => s.syncStatus === "PENDING").length} belum tersinkron
            </span>
          </div>
          <div className="stat-card">
            <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>Total Omzet</span>
            <span className="stat-value" style={{ fontSize: "22px" }}>{formatRupiahFull(totalRevenue)}</span>
          </div>
          <div className="stat-card">
            <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>Dibatalkan</span>
            <span className="stat-value" style={{ fontSize: "28px", color: totalVoided > 0 ? "hsl(var(--error))" : "inherit" }}>
              {totalVoided}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="card" style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            className="input-field"
            style={{ maxWidth: "320px" }}
            placeholder="Cari invoice, metode bayar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span style={{ fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
            Menampilkan {filtered.length} dari {sales.length} transaksi
          </span>
        </div>

        {/* Tabel */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "hsl(var(--text-muted))" }}>
              Belum ada data transaksi.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                <thead style={{ background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border))" }}>
                  <tr>
                    {["No. Invoice", "Waktu", "Metode", "Total", "Kembalian", "Status", "Sync"].map((h) => (
                      <th key={h} style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "hsl(var(--text-secondary))", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sale) => {
                    const itemsInSale = saleItems.filter((i) => i.saleLocalId === sale.localId);
                    return (
                      <tr key={sale.localId} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                        <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "13px", fontWeight: 600 }}>
                          {sale.invoiceNo}
                          <div style={{ fontSize: "11px", color: "hsl(var(--text-muted))", fontFamily: "inherit", fontWeight: 400, marginTop: "2px" }}>
                            {itemsInSale.length} item produk
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: "12px", color: "hsl(var(--text-secondary))", whiteSpace: "nowrap" }}>
                          {new Date(sale.createdAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                          <div style={{ marginTop: "2px" }}>
                            {new Date(sale.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span className="badge badge-info" style={{ fontSize: "11px" }}>
                            {paymentMethodLabel[sale.paymentMethod] || sale.paymentMethod}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 700, fontSize: "14px", color: "hsl(var(--primary))", whiteSpace: "nowrap" }}>
                          {formatRupiahFull(sale.totalAmount)}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: "13px", color: "hsl(var(--text-secondary))", whiteSpace: "nowrap" }}>
                          {sale.changeAmount > 0 ? formatRupiahFull(sale.changeAmount) : "—"}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            className="badge"
                            style={{
                              fontSize: "11px",
                              background: `hsl(${statusColor[sale.status]} / 0.12)`,
                              color: `hsl(${statusColor[sale.status]})`,
                              border: `1px solid hsl(${statusColor[sale.status]} / 0.3)`,
                            }}
                          >
                            {statusLabel[sale.status] || sale.status}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            className="badge"
                            style={{
                              fontSize: "11px",
                              background: sale.syncStatus === "SYNCED" ? "hsl(var(--success)/0.12)" : "hsl(var(--warning)/0.12)",
                              color: sale.syncStatus === "SYNCED" ? "hsl(var(--success))" : "hsl(var(--warning))",
                            }}
                          >
                            {sale.syncStatus === "SYNCED" ? "✓ Synced" : "⏳ Pending"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
