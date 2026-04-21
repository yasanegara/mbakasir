"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatRupiahFull } from "@/lib/utils";
import { useMemo } from "react";

// ============================================================
// HALAMAN: STOK KRITIS — Threshold Alert untuk Owner
// ============================================================

export default function StockAlertPage() {
  const products = useLiveQuery(() => getDb().products.toArray()) || [];
  const rawMaterials = useLiveQuery(() => getDb().rawMaterials.toArray()) || [];

  // Produk dengan stok <= 5 atau nonaktif karena habis
  const lowStockProducts = useMemo(() =>
    products
      .filter((p) => p.isActive && p.stock <= 5)
      .sort((a, b) => a.stock - b.stock),
  [products]);

  // Bahan baku di bawah minStock
  const lowStockMaterials = useMemo(() =>
    rawMaterials
      .filter((m) => m.stock <= m.minStock)
      .sort((a, b) => a.stock - b.stock),
  [rawMaterials]);

  const totalAlerts = lowStockProducts.length + lowStockMaterials.length;

  return (
    <DashboardLayout title="Peringatan Stok Kritis">
      <div style={{ display: "grid", gap: "24px" }}>
        {/* Summary Banner */}
        <div
          style={{
            background: totalAlerts > 0
              ? "linear-gradient(135deg, hsl(var(--error)/0.8), hsl(var(--warning)/0.8))"
              : "var(--gradient-primary)",
            borderRadius: "16px",
            padding: "24px 28px",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, margin: 0 }}>
              {totalAlerts > 0 ? `⚠️ ${totalAlerts} Item Perlu Perhatian!` : "✅ Semua Stok Aman"}
            </h2>
            <p style={{ marginTop: "6px", opacity: 0.88, fontSize: "14px" }}>
              {totalAlerts > 0
                ? "Produk atau bahan baku di bawah threshold. Segera restok agar tidak kehilangan momentum penjualan."
                : "Semua produk dan bahan baku masih berada di atas batas minimum."}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "48px", fontWeight: 800, lineHeight: 1 }}>{totalAlerts}</div>
            <div style={{ fontSize: "12px", opacity: 0.8 }}>Total Peringatan</div>
          </div>
        </div>

        {/* Produk Kritis */}
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🛒</span> Produk Stok Kritis
            {lowStockProducts.length > 0 && (
              <span className="badge badge-error" style={{ fontSize: "11px" }}>{lowStockProducts.length}</span>
            )}
          </h3>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {lowStockProducts.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: "hsl(var(--text-muted))" }}>
                ✓ Semua produk dalam kondisi aman.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border))" }}>
                  <tr>
                    {["Nama Produk", "Kategori", "Stok Sekarang", "Harga Jual", "Aksi"].map((h) => (
                      <th key={h} style={{ padding: "11px 16px", fontSize: "13px", fontWeight: 600, color: "hsl(var(--text-secondary))", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map((p) => {
                    const isCritical = p.stock === 0;
                    return (
                      <tr key={p.localId} style={{ borderBottom: "1px solid hsl(var(--border))", background: isCritical ? "hsl(var(--error)/0.04)" : "transparent" }}>
                        <td style={{ padding: "13px 16px", fontWeight: 600, fontSize: "14px" }}>
                          {p.name}
                          {isCritical && <span className="badge badge-error" style={{ marginLeft: "8px", fontSize: "10px" }}>HABIS</span>}
                        </td>
                        <td style={{ padding: "13px 16px", fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
                          {p.category || "—"}
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{
                            fontWeight: 800,
                            fontSize: "18px",
                            color: isCritical ? "hsl(var(--error))" : "hsl(var(--warning))",
                          }}>
                            {p.stock}
                          </span>
                          <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginLeft: "4px" }}>{p.unit}</span>
                        </td>
                        <td style={{ padding: "13px 16px", fontSize: "13px", color: "hsl(var(--primary))", fontWeight: 600 }}>
                          {formatRupiahFull(p.price)}
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          <a href="/products" className="btn btn-primary btn-sm" style={{ fontSize: "12px", textDecoration: "none" }}>
                            Tambah Stok
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Bahan Baku Kritis */}
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🧪</span> Bahan Baku di Bawah Threshold
            {lowStockMaterials.length > 0 && (
              <span className="badge badge-warning" style={{ fontSize: "11px" }}>{lowStockMaterials.length}</span>
            )}
          </h3>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {lowStockMaterials.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: "hsl(var(--text-muted))" }}>
                ✓ Semua bahan baku masih di atas batas minimum.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border))" }}>
                  <tr>
                    {["Nama Bahan", "Stok Sekarang", "Batas Minimum", "Defisit", "Aksi"].map((h) => (
                      <th key={h} style={{ padding: "11px 16px", fontSize: "13px", fontWeight: 600, color: "hsl(var(--text-secondary))", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lowStockMaterials.map((m) => {
                    const deficit = Math.max(0, m.minStock - m.stock);
                    const isEmpty = m.stock === 0;
                    return (
                      <tr key={m.localId} style={{ borderBottom: "1px solid hsl(var(--border))", background: isEmpty ? "hsl(var(--error)/0.04)" : "transparent" }}>
                        <td style={{ padding: "13px 16px", fontWeight: 600, fontSize: "14px" }}>
                          {m.name}
                          {isEmpty && <span className="badge badge-error" style={{ marginLeft: "8px", fontSize: "10px" }}>HABIS</span>}
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{
                            fontWeight: 800,
                            fontSize: "16px",
                            color: isEmpty ? "hsl(var(--error))" : "hsl(var(--warning))",
                          }}>
                            {m.stock}
                          </span>
                          <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginLeft: "4px" }}>{m.unit}</span>
                        </td>
                        <td style={{ padding: "13px 16px", fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
                          {m.minStock} {m.unit}
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{ color: "hsl(var(--error))", fontWeight: 700, fontSize: "14px" }}>
                            -{deficit} {m.unit}
                          </span>
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          <a href="/inventory" className="btn btn-ghost btn-sm" style={{ fontSize: "12px", textDecoration: "none", border: "1px solid hsl(var(--warning)/0.4)", color: "hsl(var(--warning))" }}>
                            Beli / Restok
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
