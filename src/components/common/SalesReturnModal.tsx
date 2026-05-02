"use client";

import { useState } from "react";
import { getDb, enqueueSyncOp, type LocalSale, type LocalSaleItem } from "@/lib/db";
import { formatRupiahFull } from "@/lib/utils";
import { useToast } from "@/contexts/AppProviders";
import { v4 as uuidv4 } from "uuid";

interface SalesReturnModalProps {
  sale: LocalSale;
  items: LocalSaleItem[];
  currentCash: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface ReturnItemDraft {
  localId: string;
  productId: string;
  productName: string;
  originalQty: number;
  returnQty: number;
  price: number;
  condition: "GOOD" | "DAMAGED";
}

export default function SalesReturnModal({ sale, items, currentCash, onClose, onSuccess }: SalesReturnModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [draftItems, setDraftItems] = useState<ReturnItemDraft[]>(
    items.map((item) => ({
      localId: item.localId,
      productId: item.productId,
      productName: item.productName,
      originalQty: item.quantity,
      returnQty: 0,
      price: item.price,
      condition: "GOOD",
    }))
  );

  const handleQtyChange = (localId: string, qty: number) => {
    setDraftItems((prev) =>
      prev.map((item) =>
        item.localId === localId
          ? { ...item, returnQty: Math.max(0, Math.min(qty, item.originalQty)) }
          : item
      )
    );
  };

  const handleConditionChange = (localId: string, condition: "GOOD" | "DAMAGED") => {
    setDraftItems((prev) =>
      prev.map((item) => (item.localId === localId ? { ...item, condition } : item))
    );
  };

  const totalReturnAmount = draftItems.reduce((sum, item) => sum + item.returnQty * item.price, 0);

  const handleSaveReturn = async () => {
    if (totalReturnAmount === 0) {
      toast("Pilih setidaknya satu item untuk diretur.", "warning");
      return;
    }

    if (totalReturnAmount > currentCash) {
       if (!confirm(`⚠️ Kas di laci (${formatRupiahFull(currentCash)}) tidak cukup untuk mengembalikan uang (${formatRupiahFull(totalReturnAmount)}). Tetap lanjutkan?`)) {
          return;
       }
    }

    setLoading(true);
    try {
      const db = getDb();
      const returnLocalId = uuidv4();
      const timestamp = Date.now();

      const returnRecord = {
        localId: returnLocalId,
        tenantId: sale.tenantId,
        saleLocalId: sale.localId,
        invoiceNo: `RET-${sale.invoiceNo}-${timestamp.toString().slice(-4)}`,
        totalAmount: totalReturnAmount,
        reason,
        createdAt: timestamp,
        syncStatus: "PENDING" as const,
      };

      const returnItems = draftItems
        .filter((i) => i.returnQty > 0)
        .map((i) => ({
          id: uuidv4(),
          localId: uuidv4(),
          returnLocalId,
          productId: i.productId,
          productName: i.productName,
          quantity: i.returnQty,
          price: i.price,
          condition: i.condition,
        }));

      await db.transaction("rw", [db.salesReturns, db.salesReturnItems, db.products, db.productAssignments, db.syncQueue], async () => {
        // 1. Save return record
        await db.salesReturns.add(returnRecord);
        await enqueueSyncOp("salesReturns", returnLocalId, "CREATE", returnRecord);

        // 2. Save items & Update Stock
        for (const rItem of returnItems) {
          await db.salesReturnItems.add(rItem);
          // Note: sync for returnItems usually handled via parent return record or separate ops
          
          if (rItem.condition === "GOOD") {
            const assignment = sale.terminalId
              ? await db.productAssignments
                  .where({ productId: rItem.productId, terminalId: sale.terminalId })
                  .first()
              : undefined;

            if (assignment) {
              const updatedAssignment = {
                ...assignment,
                stock: assignment.stock + rItem.quantity,
              };
              await db.productAssignments.put(updatedAssignment);
              await enqueueSyncOp(
                "productAssignments",
                assignment.id,
                "UPDATE",
                updatedAssignment
              );
            } else {
              const product = await db.products.get(rItem.productId);
              if (product) {
                const updatedProduct = {
                  ...product,
                  stock: product.stock + rItem.quantity,
                  updatedAt: Date.now(),
                  syncStatus: "PENDING" as const,
                };
                await db.products.put(updatedProduct);
                await enqueueSyncOp("products", product.localId, "UPDATE", updatedProduct);
              }
            }
          }
        }
      });

      toast(`Retur berhasil disimpan! Total: ${formatRupiahFull(totalReturnAmount)}`, "success");
      onSuccess();
    } catch (err) {
      console.error("Save return error:", err);
      toast("Gagal menyimpan data retur.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)", padding: "20px", backdropFilter: "blur(4px)" }}>
      <div className="card animate-slide-up" style={{ width: "100%", maxWidth: "650px", maxHeight: "90vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 800 }}>🔄 Retur Penjualan</h3>
            <p style={{ fontSize: "12px", color: "hsl(var(--text-secondary))", marginTop: "2px" }}>Nota: {sale.invoiceNo} • {new Date(sale.createdAt).toLocaleDateString()}</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={loading}>✕</button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <div style={{ display: "grid", gap: "20px" }}>
            {/* Reason */}
            <div>
              <label className="input-label">Alasan Retur</label>
              <textarea 
                className="input-field" 
                placeholder="Misal: Barang cacat, salah beli, dll..."
                style={{ minHeight: "60px", resize: "none" }}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {/* Items Table */}
            <div>
              <label className="input-label">Item yang Dikembalikan</label>
              <div style={{ border: "1px solid hsl(var(--border))", borderRadius: "12px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead style={{ background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border))" }}>
                    <tr>
                      <th style={{ padding: "10px", textAlign: "left" }}>Nama Produk</th>
                      <th style={{ padding: "10px", textAlign: "center" }}>Qty Beli</th>
                      <th style={{ padding: "10px", textAlign: "center" }}>Qty Retur</th>
                      <th style={{ padding: "10px", textAlign: "center" }}>Kondisi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftItems.map((item) => (
                      <tr key={item.localId} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                        <td style={{ padding: "10px", fontWeight: 600 }}>{item.productName}</td>
                        <td style={{ padding: "10px", textAlign: "center" }}>{item.originalQty}</td>
                        <td style={{ padding: "10px", textAlign: "center" }}>
                          <input 
                            type="number" 
                            className="input-field" 
                            style={{ width: "60px", padding: "4px", textAlign: "center" }}
                            value={item.returnQty}
                            onChange={(e) => handleQtyChange(item.localId, Number(e.target.value))}
                          />
                        </td>
                        <td style={{ padding: "10px", textAlign: "center" }}>
                          <select 
                            className="input-field" 
                            style={{ width: "100px", padding: "4px", fontSize: "11px" }}
                            value={item.condition}
                            onChange={(e) => handleConditionChange(item.localId, e.target.value as any)}
                          >
                            <option value="GOOD">Layak Jual</option>
                            <option value="DAMAGED">Rusak</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "20px 24px", background: "hsl(var(--bg-elevated))", borderTop: "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "12px", color: "hsl(var(--text-secondary))" }}>Total Uang Kembali:</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "hsl(var(--primary))" }}>{formatRupiahFull(totalReturnAmount)}</div>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Batal</button>
            <button className="btn btn-primary" onClick={handleSaveReturn} disabled={loading || totalReturnAmount === 0}>
              {loading ? "Menyimpan..." : "Simpan Retur"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
