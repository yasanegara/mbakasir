"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import { formatRupiahFull } from "@/lib/utils";
import { useMemo } from "react";

export default function StockAlertTab({ onSwitchTab }: { onSwitchTab: (tab: "products" | "materials") => void }) {
  const products = useLiveQuery(() => getDb().products.toArray()) || [];
  const rawMaterials = useLiveQuery(() => getDb().rawMaterials.toArray()) || [];

  const lowStockProducts = useMemo(() =>
    products
      .filter((p) => p.isActive && p.stock <= 5)
      .sort((a, b) => a.stock - b.stock),
  [products]);

  const lowStockMaterials = useMemo(() =>
    rawMaterials
      .filter((m) => m.stock <= m.minStock)
      .sort((a, b) => a.stock - b.stock),
  [rawMaterials]);

  const totalAlerts = lowStockProducts.length + lowStockMaterials.length;

  return (
    <div style={{ display: "grid", gap: "24px" }}>
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
              ? "Produk atau bahan baku di bawah threshold. Segera restok."
              : "Semua produk dan bahan baku masih berada di atas batas minimum."}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "48px", fontWeight: 800, lineHeight: 1 }}>{totalAlerts}</div>
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>🛒 Produk Stok Kritis</h3>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {lowStockProducts.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "hsl(var(--text-muted))" }}>✓ Semua produk aman.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border))" }}>
                <tr>
                  <th style={thStyle}>Nama Produk</th>
                  <th style={thStyle}>Stok</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((p) => (
                  <tr key={p.localId} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                    <td style={tdStyle}>{p.name}</td>
                    <td style={{ ...tdStyle, color: "hsl(var(--error))", fontWeight: 800 }}>{p.stock} {p.unit}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <button className="btn btn-primary btn-sm" onClick={() => onSwitchTab("products")}>Restok</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>🧪 Bahan Baku Kritis</h3>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {lowStockMaterials.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "hsl(var(--text-muted))" }}>✓ Semua bahan baku aman.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border))" }}>
                <tr>
                  <th style={thStyle}>Nama Bahan</th>
                  <th style={thStyle}>Stok</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {lowStockMaterials.map((m) => (
                  <tr key={m.localId} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                    <td style={tdStyle}>{m.name}</td>
                    <td style={{ ...tdStyle, color: "hsl(var(--warning))", fontWeight: 800 }}>{m.stock} {m.unit}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <button className="btn btn-outline btn-sm" onClick={() => onSwitchTab("materials")}>Restok</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "12px 16px", fontSize: "13px", fontWeight: 600, textAlign: "left" };
const tdStyle: React.CSSProperties = { padding: "13px 16px", fontSize: "14px" };
