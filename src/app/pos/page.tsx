"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth, useToast } from "@/contexts/AppProviders";
import { getDb, enqueueSyncOp } from "@/lib/db";
import type { LocalProduct, LocalSaleItem, LocalSale, LocalShift } from "@/lib/db";
import { useInitialSync } from "@/hooks/useInitialSync";
import { useLiveQuery } from "dexie-react-hooks";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { formatRupiah, formatRupiahFull, generateInvoiceNo, generateUUID } from "@/lib/utils";

// ============================================================
// HALAMAN KASIR (POS)
// CTO & Lead UI/UX: 100% Offline, Real-time Dexie.js
// ============================================================

export default function POSPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSyncing, hasSynced, error } = useInitialSync();

  // 1. Data dari IndexedDB (Reactive via Dexie)
  const products = useLiveQuery(() => getDb().products.where("isActive").equals(1).toArray()) || [];
  
  // 2. State Keranjang & Checkout
  const [cart, setCart] = useState<{ product: LocalProduct; qty: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "QRIS">("CASH");
  const [paidAmount, setPaidAmount] = useState(0);

  // Kalkulasi total
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const changeAmount = paymentMethod === "CASH" ? Math.max(0, paidAmount - subtotal) : 0;
  const isPaidSufficient = paymentMethod === "QRIS" || paidAmount >= subtotal;

  // ─── Handler Keranjang ─────────────────────────────────────
  
  const addToCart = (product: LocalProduct) => {
    // Validasi stok sederhana
    const currentQty = cart.find((c) => c.product.localId === product.localId)?.qty || 0;
    if (currentQty + 1 > product.stock && product.stock > 0) { // Anggap jika stock=0, itu unlimited (karena blm implementasi stric inventory)
       toast(`Stok ${product.name} tidak mencukupi`, "warning");
       return;
    }
    
    setCart((prev) => {
      const existing = prev.find((item) => item.product.localId === product.localId);
      if (existing) {
        return prev.map((item) =>
          item.product.localId === product.localId ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (localId: string) => {
    setCart((prev) => prev.filter((item) => item.product.localId !== localId));
  };

  const updateQty = (localId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.localId === localId) {
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty } : item;
        }
        return item;
      })
    );
  };

  // ─── Handler Checkout (The Core Engine) ────────────────────

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!isPaidSufficient) {
      toast("Uang pembayaran kurang!", "error");
      return;
    }
    if (!user?.tenantId || !user.sub) {
      toast("Sesi tidak valid", "error");
      return;
    }

    try {
      const db = getDb();
      const saleLocalId = generateUUID();
      const now = Date.now();

      // 1. Buat Payload Sale Item
      const saleItems: LocalSaleItem[] = cart.map((item) => ({
        id: generateUUID(), // dummy id until server response
        localId: generateUUID(),
        saleLocalId,
        productId: item.product.localId,
        productName: item.product.name,
        price: item.product.price,
        costPrice: item.product.costPrice,
        quantity: item.qty,
        discount: 0,
        subtotal: item.product.price * item.qty,
      }));

      // 2. Buat Payload Sale
      const sale: LocalSale = {
        localId: saleLocalId,
        tenantId: user.tenantId,
        userId: user.sub,
        invoiceNo: generateInvoiceNo(),
        status: "COMPLETED",
        paymentMethod,
        subtotal,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: subtotal,
        paidAmount: paymentMethod === "CASH" ? paidAmount : subtotal,
        changeAmount,
        syncStatus: "PENDING",
        createdAt: now,
        updatedAt: now,
      };

      // 3. Simpan ke IndexedDB (Transaksi lokal, super cepat)
      await db.transaction('rw', [db.sales, db.saleItems, db.products, db.rawMaterials, db.billOfMaterials, db.syncQueue], async () => {
        // A. Insert Sale Header & Items
        await db.sales.put(sale);
        await db.saleItems.bulkPut(saleItems);

        // B. Update Stok Produk (Local)
        for (const item of cart) {
          const prod = await db.products.get(item.product.localId);
          if (prod) {
             const newStock = prod.stock - item.qty;
             await db.products.update(prod.localId, { stock: Math.max(0, newStock) });
             
             // Queue update sync
             await enqueueSyncOp("products", prod.localId, "UPDATE", { ...prod, stock: Math.max(0, newStock) });
          }

          // C. BILL OF MATERIALS ENGINE
          if (item.product.hasBoM) {
             const boms = await db.billOfMaterials.where("productId").equals(item.product.localId).toArray();
             for (const bom of boms) {
                const material = await db.rawMaterials.get(bom.rawMaterialId);
                if (material) {
                   // Kurangi stok: Qty Produk Terjual * Qty Bahan di BoM
                   const deduction = item.qty * bom.quantity;
                   const newMatStock = material.stock - deduction;
                   
                   await db.rawMaterials.update(material.localId, { stock: Math.max(0, newMatStock) });
                   
                   await enqueueSyncOp("rawMaterials", material.localId, "UPDATE", { ...material, stock: Math.max(0, newMatStock) });
                }
             }
          }
        }

        // D. Queue Sale ke Background Sync
        await enqueueSyncOp("sales", saleLocalId, "CREATE", {
           ...sale,
           items: saleItems
        });
      });

      // 4. Reset & Beri Notifikasi
      setCart([]);
      setPaidAmount(0);
      toast("Transaksi berhasil! Offline sync berjalan.", "success");

    } catch (err: any) {
      console.error("Checkout Failed:", err);
      toast(`Gagal: ${err.message}`, "error");
    }
  };

  // ─── Rendering ─────────────────────────────────────────────

  if (isSyncing && products.length === 0) {
    return (
      <DashboardLayout title="Kasir (POS)">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh" }}>
          <div className="animate-spin" style={{ fontSize: "40px" }}>⏳</div>
          <p style={{ marginTop: "16px", fontWeight: 600 }}>Sinkronisasi Master Data...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Kasir (POS)">
      <div className="pos-grid">
        {/* KIRI: Daftar Produk */}
        <div className="pos-products">
          {error && (
            <div className="badge badge-error" style={{ marginBottom: "16px", display: "block", width: "fit-content" }}>
              Warning: {error} (Menggunakan data offline terakhir)
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
            {products.map((p) => {
              const isEmpty = p.stock <= 0;
              return (
                <div 
                  key={p.localId} 
                  className={`product-card ${isEmpty ? "out-of-stock" : ""}`}
                  onClick={() => !isEmpty && addToCart(p)}
                >
                  <div style={{ 
                    height: "100px", 
                    background: "hsl(var(--bg-elevated))", 
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "32px"
                   }}>
                    {p.name.charAt(0)}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "14px", lineHeight: 1.2 }}>
                    {p.name}
                  </div>
                  <div style={{ color: "hsl(var(--primary))", fontWeight: 700, fontSize: "14px" }}>
                    {formatRupiahFull(p.price)}
                  </div>
                  <div style={{ fontSize: "11px", color: "hsl(var(--text-muted))" }}>
                    Stok: {p.stock}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* KANAN: Keranjang (Cart) */}
        <div className="pos-cart">
          <div style={{ padding: "20px", borderBottom: "1px solid hsl(var(--border))" }}>
            <h2 style={{ fontSize: "18px" }}>Keranjang</h2>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: "center", color: "hsl(var(--text-muted))", marginTop: "40px" }}>
                Keranjang masih kosong
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.localId} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600 }}>{item.product.name}</div>
                    <div style={{ fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
                      {formatRupiahFull(item.product.price)}
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "hsl(var(--bg-elevated))", borderRadius: "100px", padding: "4px" }}>
                    <button className="btn btn-ghost btn-icon" style={{ width: "28px", height: "28px", padding: 0, borderRadius: "50%" }} onClick={() => updateQty(item.product.localId, -1)}>-</button>
                    <span style={{ fontSize: "14px", fontWeight: 600, width: "24px", textAlign: "center" }}>{item.qty}</span>
                    <button className="btn btn-ghost btn-icon" style={{ width: "28px", height: "28px", padding: 0, borderRadius: "50%" }} onClick={() => updateQty(item.product.localId, 1)}>+</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: "20px", background: "hsl(var(--bg-elevated))", borderTop: "1px solid hsl(var(--border))" }}>
             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", fontSize: "18px", fontWeight: 700 }}>
               <span>Total:</span>
               <span>{formatRupiahFull(subtotal)}</span>
             </div>

             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
               <button 
                  className={`btn ${paymentMethod === "CASH" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setPaymentMethod("CASH")}
                >
                  Tunai
                </button>
                <button 
                  className={`btn ${paymentMethod === "QRIS" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => {
                     setPaymentMethod("QRIS");
                     setPaidAmount(0);
                  }}
                >
                  QRIS
                </button>
             </div>

             {paymentMethod === "CASH" && (
                <div style={{ marginBottom: "16px" }}>
                  <CurrencyInput
                    label="Tunai Diterima"
                    value={paidAmount}
                    onChange={setPaidAmount}
                    autoFocus
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "14px" }}>
                    <span style={{ color: "hsl(var(--text-secondary))" }}>Kembalian:</span>
                    <span style={{ fontWeight: 600, color: changeAmount > 0 ? "hsl(var(--warning))" : "inherit" }}>
                      {formatRupiahFull(changeAmount)}
                    </span>
                  </div>
                </div>
             )}

             <button 
                className="btn btn-primary btn-xl btn-block"
                disabled={cart.length === 0 || !isPaidSufficient}
                onClick={handleCheckout}
             >
                Bayar
             </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
