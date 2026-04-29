"use client";

import { useState } from "react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { formatRupiahFull } from "@/lib/utils";
import type { LocalProduct } from "@/lib/db";

interface RestockModalProps {
  product: LocalProduct;
  onConfirm: (additionalStock: number, newCostPrice: number, newAvgHpp: number) => void;
  onCancel: () => void;
}

export default function RestockModal({ product, onConfirm, onCancel }: RestockModalProps) {
  const [additionalStock, setAdditionalStock] = useState(0);
  const [newCostPrice, setNewCostPrice] = useState(product.costPrice);

  // Hitung HPP rata-rata tertimbang (Weighted Average)
  const newTotalStock = product.stock + additionalStock;
  const newAvgHpp = newTotalStock > 0
    ? Math.round(
        (product.stock * product.costPrice + additionalStock * newCostPrice) / newTotalStock
      )
    : newCostPrice;

  const hppChanged = newCostPrice !== product.costPrice;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.7)", padding: "20px",
    }}>
      <div style={{
        background: "hsl(var(--bg-elevated))",
        borderRadius: "20px",
        padding: "28px",
        width: "100%",
        maxWidth: "440px",
        boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
      }}>
        {/* Header */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span style={{ fontSize: "24px" }}>📦</span>
            <h2 style={{ fontSize: "20px", fontWeight: 800 }}>Restock Produk</h2>
          </div>
          <div style={{
            padding: "12px 14px",
            background: "hsl(var(--primary) / 0.08)",
            border: "1px solid hsl(var(--primary) / 0.2)",
            borderRadius: "10px",
          }}>
            <div style={{ fontWeight: 700, fontSize: "15px" }}>{product.name}</div>
            <div style={{ fontSize: "12px", color: "hsl(var(--text-secondary))", marginTop: "2px" }}>
              SKU: {product.sku} · Stok saat ini: <strong>{product.stock} {product.unit}</strong> · HPP: {formatRupiahFull(product.costPrice)}
            </div>
          </div>
        </div>

        {/* Input */}
        <div style={{ display: "grid", gap: "16px", marginBottom: "20px" }}>
          <div>
            <label className="input-label">Stok Tambahan ({product.unit})</label>
            <input
              type="number"
              min={1}
              className="input-field"
              value={additionalStock === 0 ? "" : additionalStock}
              placeholder="0"
              autoFocus
              onFocus={(e) => e.target.select()}
              onChange={(e) => setAdditionalStock(Math.max(0, Number(e.target.value) || 0))}
            />
            <p style={{ fontSize: "11px", color: "hsl(var(--text-muted))", marginTop: "4px" }}>
              Stok baru setelah restock: <strong>{newTotalStock} {product.unit}</strong>
            </p>
          </div>

          <CurrencyInput
            label="Harga Beli per Unit (batch ini)"
            value={newCostPrice}
            onChange={setNewCostPrice}
          />
        </div>

        {/* Preview HPP */}
        <div style={{
          padding: "14px 16px",
          background: hppChanged ? "hsl(var(--warning) / 0.08)" : "hsl(var(--bg-card))",
          border: `1px solid ${hppChanged ? "hsl(var(--warning) / 0.3)" : "hsl(var(--border))"}`,
          borderRadius: "12px",
          marginBottom: "20px",
          fontSize: "13px",
        }}>
          <div style={{ fontWeight: 700, marginBottom: "8px", color: hppChanged ? "hsl(var(--warning))" : "inherit" }}>
            {hppChanged ? "⚠️ HPP Berubah — Kalkulasi Weighted Average:" : "✅ Kalkulasi HPP:"}
          </div>
          <div style={{ display: "grid", gap: "4px", color: "hsl(var(--text-secondary))" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Stok lama ({product.stock} × {formatRupiahFull(product.costPrice)})</span>
              <span>{formatRupiahFull(product.stock * product.costPrice)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Stok baru ({additionalStock} × {formatRupiahFull(newCostPrice)})</span>
              <span>{formatRupiahFull(additionalStock * newCostPrice)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: "1px dashed hsl(var(--border))", paddingTop: "6px", marginTop: "4px", color: "hsl(var(--text-primary))" }}>
              <span>HPP Rata-rata Baru ({newTotalStock} unit)</span>
              <span style={{ color: "hsl(var(--primary))" }}>{formatRupiahFull(newAvgHpp)}/unit</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <button className="btn btn-ghost" onClick={onCancel}>
            Batal
          </button>
          <button
            className="btn btn-primary"
            disabled={additionalStock <= 0}
            onClick={() => onConfirm(additionalStock, newCostPrice, newAvgHpp)}
          >
            Simpan Restock
          </button>
        </div>
      </div>
    </div>
  );
}
