"use client";

import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth, useToast } from "@/contexts/AppProviders";
import { getDb, enqueueSyncOp } from "@/lib/db";
import type { LocalProduct, LocalSaleItem, LocalSale, LocalShift } from "@/lib/db";
import { useInitialSync } from "@/hooks/useInitialSync";
import { useLiveQuery } from "dexie-react-hooks";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { formatRupiah, formatRupiahFull, generateInvoiceNo, generateUUID } from "@/lib/utils";
import { renderWaTemplate } from "@/hooks/useStoreProfile";

function getSuggestedAmounts(total: number): number[] {
  if (total <= 0) return [];
  const suggestions = new Set<number>();
  suggestions.add(total); // Uang pas
  
  const steps = [5000, 10000, 20000, 50000, 100000];
  for (const step of steps) {
    const rounded = Math.ceil(total / step) * step;
    if (rounded >= total) suggestions.add(rounded);
  }

  return Array.from(suggestions).sort((a, b) => a - b).slice(0, 4);
}

// Portal: renders children directly into document.body
// to escape any stacking context created by animated parent elements.
function FixedPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return ReactDOM.createPortal(children, document.body);
}

// ============================================================
// HALAMAN KASIR (POS)
// CTO & Lead UI/UX: 100% Offline, Real-time Dexie.js
// ============================================================

export default function POSPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSyncing, hasSynced, error } = useInitialSync();

  // 1. Data dari IndexedDB (Reactive via Dexie)
  const products = useLiveQuery(async () => {
    const all = await getDb().products.toArray();
    return all.filter((p) => p.isActive === true);
  }) || [];

  // Profil toko dari IndexedDB
  const storeProfile = useLiveQuery(() => getDb().storeProfile.get("default"));
  const storeName = storeProfile?.storeName || "";
  const storeAddress = storeProfile?.address || "";
  const storePhone = storeProfile?.phone || "";
  const storeFooter = storeProfile?.footerNote || "Terima kasih sudah berbelanja! 🙏";
  const storeQrisImage = storeProfile?.qrisImageUrl || "";
  const waReceiptTemplate = storeProfile?.waReceiptTemplate || "";
  
  const shifts = useLiveQuery(async () => {
    if (!user) return [];
    return await getDb().shifts.where("userId").equals(user.sub).toArray();
  }, [user]);
  const activeShift = shifts?.find((s) => !s.closedAt);

  // 2. State Keranjang & Checkout
  const [cart, setCart] = useState<{ product: LocalProduct; qty: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "QRIS">("CASH");
  const [paidAmount, setPaidAmount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [openingCash, setOpeningCash] = useState(0);
  const [showShiftSummary, setShowShiftSummary] = useState(false);
  const [includeInventory, setIncludeInventory] = useState(false);

  // PIN verification state
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Customer info and discount
  const [customerName, setCustomerName] = useState("");
  const [customerWa, setCustomerWa] = useState("");
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);

  // State struk untuk auto-print
  const [lastReceipt, setLastReceipt] = useState<{
    items: { name: string; qty: number; price: number }[];
    subtotal: number;
    discount: number;
    total: number;
    method: string;
    change: number;
    customerName: string;
    invoiceNo: string;
  } | null>(null);

  // Kalkulasi total
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const changeAmount = paymentMethod === "CASH" ? Math.max(0, paidAmount - totalAmount) : 0;
  const isPaidSufficient = paymentMethod === "QRIS" || paidAmount >= totalAmount;

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


  // ─── Handler PIN Verification ──────────────────────────────

  const handleVerifyPin = () => {
    const expectedPin = user?.pin;
    if (!expectedPin) {
      // No PIN set, skip verification
      setIsPinVerified(true);
      return;
    }
    if (pinInput === expectedPin) {
      setIsPinVerified(true);
      setPinError("");
    } else {
      setPinError("PIN salah. Coba lagi.");
      setPinInput("");
    }
  };

  // ─── Handler Shift ──────────────────────────────────────────

  const handleStartShift = async () => {
    if (!user || user.role === "SUPERADMIN") return;
    try {
      const shiftLocalId = generateUUID();
      const newShift: LocalShift = {
        localId: shiftLocalId,
        tenantId: user.tenantId || "",
        userId: user.sub,
        openingCash,
        totalSales: 0,
        totalVoid: 0,
        startedAt: Date.now(),
        syncStatus: "PENDING",
      };
      await getDb().shifts.put(newShift);
      await enqueueSyncOp("shifts", shiftLocalId, "CREATE", newShift);
      toast("Shift dimulai! Selamat bertugas.", "success");
    } catch (err) {
      toast("Gagal membuka shift", "error");
    }
  };

  const confirmCloseShift = async () => {
    if (!activeShift) return;
    try {
      const closed = {
        ...activeShift,
        closedAt: Date.now(),
        syncStatus: "PENDING" as const,
      };
      await getDb().shifts.put(closed);
      await enqueueSyncOp("shifts", closed.localId, "UPDATE", closed);
      setShowShiftSummary(false);
      toast("Shift berhasil ditutup.", "info");
    } catch (err) {
      toast("Gagal tutup shift", "error");
    }
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
        shiftLocalId: activeShift?.localId,
        invoiceNo: generateInvoiceNo(),
        status: "COMPLETED",
        paymentMethod,
        subtotal,
        discountAmount,
        taxAmount: 0,
        totalAmount,
        paidAmount: paymentMethod === "CASH" ? paidAmount : totalAmount,
        changeAmount,
        syncStatus: "PENDING",
        createdAt: now,
        updatedAt: now,
      };

      // 3. Simpan ke IndexedDB (Transaksi lokal, super cepat)
      await db.transaction('rw', [db.sales, db.saleItems, db.products, db.rawMaterials, db.billOfMaterials, db.shifts, db.syncQueue], async () => {
        // A. Insert Sale Header & Items
        await db.sales.put(sale);
        await db.saleItems.bulkPut(saleItems);

        // Update totalSales di Shift
        if (activeShift) {
           const updatedShift: LocalShift = { ...activeShift, totalSales: activeShift.totalSales + subtotal, syncStatus: "PENDING" };
           await db.shifts.put(updatedShift);
           await enqueueSyncOp("shifts", activeShift.localId, "UPDATE", updatedShift);
        }

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

      // 4. Simpan struk untuk auto-print
      setLastReceipt({
        items: cart.map(i => ({ name: i.product.name, qty: i.qty, price: i.product.price })),
        subtotal,
        discount: discountAmount,
        total: totalAmount,
        method: paymentMethod,
        change: changeAmount,
        customerName,
        invoiceNo: saleLocalId.slice(-8).toUpperCase(),
      });

      // 5. Reset & Beri Notifikasi
      setCart([]);
      setPaidAmount(0);
      setDiscountAmount(0);
      setIsCartOpen(false);

      // 6. Auto-print struk (delay singkat supaya state render dulu)
      setTimeout(() => window.print(), 150);

      // 5. Kirim Struk WA jika ada nomor konsumen
      if (customerWa.trim()) {
        const itemLines = cart
          .map((i) => `• ${i.product.name} ×${i.qty}  ${formatRupiahFull(i.product.price * i.qty)}`)
          .join("\n");

        let waMsg: string;
        if (waReceiptTemplate) {
          waMsg = renderWaTemplate(waReceiptTemplate, {
            storeName,
            address: storeAddress,
            phone: storePhone,
            items: itemLines,
            subtotal: formatRupiahFull(subtotal).replace("Rp", "").trim(),
            discount: discountAmount > 0 ? formatRupiahFull(discountAmount).replace("Rp", "").trim() : "",
            total: formatRupiahFull(totalAmount).replace("Rp", "").trim(),
            paid: paymentMethod === "CASH" ? formatRupiahFull(paidAmount).replace("Rp", "").trim() : formatRupiahFull(totalAmount).replace("Rp", "").trim(),
            change: changeAmount > 0 ? formatRupiahFull(changeAmount).replace("Rp", "").trim() : "0",
            paymentMethod: paymentMethod === "CASH" ? "Tunai" : "QRIS",
            invoiceNo: sale.invoiceNo,
            footerNote: storeFooter,
          });
        } else {
          const greeting = customerName ? `Halo ${customerName}! 👋\n` : "";
          const discountLine = discountAmount > 0 ? `\nDiskon: -${formatRupiahFull(discountAmount)}` : "";
          const changeLine = paymentMethod === "CASH" && changeAmount > 0 ? `\nKembalian: ${formatRupiahFull(changeAmount)}` : "";
          waMsg = `${greeting}*🧾 Struk Belanja*\n${storeName ? `*${storeName}*\n` : ""}\n${itemLines}\n\nSubtotal: ${formatRupiahFull(subtotal)}${discountLine}\n*Total: ${formatRupiahFull(totalAmount)}*\nMetode: ${paymentMethod === "CASH" ? "Tunai" : "QRIS"}${changeLine}\n\n${storeFooter}`;
        }

        const waNumber = customerWa.replace(/\D/g, "").replace(/^0/, "62");
        window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`, "_blank");
      }

      setCustomerName("");
      setCustomerWa("");
      setShowCustomerForm(false);
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

  // Verifikasi PIN dulu (Abaikan jika SUPERADMIN atau TENANT / owner)
  if (user && user.role === "CASHIER" && user.pin && !isPinVerified) {
    return (
      <DashboardLayout title="Verifikasi Identitas">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "70vh" }}>
          <div className="card" style={{ width: "100%", maxWidth: "380px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>🔐</div>
            <h2 style={{ marginBottom: "8px", fontSize: "20px", fontWeight: 700 }}>Masukkan PIN Anda</h2>
            <p style={{ color: "hsl(var(--text-secondary))", marginBottom: "24px", fontSize: "14px" }}>
              Masukkan PIN 6 digit Anda sebagai {user.name} untuk membuka sesi kasir.
            </p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              className="input-field"
              style={{ textAlign: "center", fontSize: "24px", letterSpacing: "8px", marginBottom: "16px" }}
              placeholder="• • • • • •"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => { if (e.key === "Enter" && pinInput.length === 6) handleVerifyPin(); }}
              autoFocus
            />
            {pinError && (
              <p style={{ color: "hsl(var(--error))", fontSize: "13px", marginBottom: "12px" }}>{pinError}</p>
            )}
            <button
              className="btn btn-primary btn-block btn-lg"
              disabled={pinInput.length !== 6}
              onClick={handleVerifyPin}
            >
              Verifikasi PIN
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Verifikasi Shift (Abaikan jika SUPERADMIN karena biasanya test run)
  if (shifts !== undefined && !activeShift && user && user.role !== "SUPERADMIN") {
    return (
      <DashboardLayout title="Buka Shift">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "70vh" }}>
          <div className="card" style={{ width: "100%", maxWidth: "400px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>👋</div>
            <h2 style={{ marginBottom: "8px", fontSize: "20px", fontWeight: 700 }}>Hai, {user.name.split(" ")[0]}!</h2>
            <p style={{ color: "hsl(var(--text-secondary))", marginBottom: "24px", fontSize: "14px" }}>
              Silakan masukkan total uang modal awal di laci kasir untuk memulai shift.
            </p>
            <CurrencyInput
              label="Modal Awal (Opsional)"
              value={openingCash}
              onChange={setOpeningCash}
              autoFocus
            />
            <button 
              className="btn btn-primary btn-block btn-lg" 
              style={{ marginTop: "24px" }}
              onClick={handleStartShift}
            >
              Mulai Bertugas
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Tombol Tutup Shift untuk header
  const headerActions = activeShift ? (
    <button
      className="btn btn-sm btn-ghost"
      style={{ color: "hsl(var(--error))", fontSize: "12px", border: "1px solid hsl(var(--error) / 0.3)" }}
      onClick={() => setShowShiftSummary(true)}
    >
      🔚 Tutup Shift
    </button>
  ) : undefined;

  return (
    <DashboardLayout title="Kasir (POS)" headerActions={headerActions}>
      <div className="pos-grid">
        {/* KIRI: Daftar Produk */}
        <div className="pos-products">
          {error && (
            <div className="badge badge-error" style={{ marginBottom: "16px", display: "block", width: "fit-content" }}>
              Warning: {error} (Menggunakan data offline terakhir)
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
             <input
                type="text"
                className="input-field"
                placeholder="Cari produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>

          <div className="product-grid-container">
            {filteredProducts.map((p) => {
              const isEmpty = p.stock <= 0;
              const cartItem = cart.find(c => c.product.localId === p.localId);
              const qtyInCart = cartItem ? cartItem.qty : 0;
              
              return (
                <div 
                  key={p.localId} 
                  className={`product-card ${isEmpty ? "out-of-stock" : ""}`}
                  onClick={() => !isEmpty && addToCart(p)}
                >
                  {qtyInCart > 0 && (
                     <div style={{ position: "absolute", top: "8px", right: "8px", background: "hsl(var(--primary))", color: "white", minWidth: "24px", height: "24px", padding: "0 6px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, zIndex: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.3)", animation: "fadeIn 0.2s ease" }}>
                        {qtyInCart}
                     </div>
                  )}
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

        {/* KANAN: Keranjang (Tampil dikanan pada Desktop/Tablet, Bottom Sheet pada Mobile) */}
        <div className={`pos-cart ${isCartOpen ? "open" : ""}`}>
          {/* Drawer Handle (Mobile Only) */}
          <div className="mobile-drawer-handle" style={{ width: "100%", justifyContent: "center", paddingTop: "12px", paddingBottom: "0px", cursor: "pointer" }} onClick={() => setIsCartOpen(false)}>
             <div style={{ width: "40px", height: "5px", background: "rgba(0,0,0,0.15)", borderRadius: "10px" }} />
          </div>
          <div style={{ 
            padding: "20px", 
            background: "linear-gradient(to bottom, hsl(var(--bg-elevated)), hsl(var(--bg-surface)))", 
            borderBottom: "1px solid hsl(var(--border))", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center" 
          }}>
            <h2 style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "-0.01em", textTransform: "uppercase", opacity: 0.9 }}>
              🛒 Keranjang Belanja
            </h2>
            <button className="btn btn-ghost btn-icon btn-sm mobile-close-btn" style={{ width: "32px", height: "32px", display: "none" }} onClick={() => setIsCartOpen(false)}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: "center", color: "hsl(var(--text-muted))", marginTop: "40px" }}>Keranjang masih kosong</div>
            ) : (
              cart.map((item) => (
                <div key={item.product.localId} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600 }}>{item.product.name}</div>
                    <div style={{ fontSize: "13px", color: "hsl(var(--text-secondary))" }}>{formatRupiahFull(item.product.price)}</div>
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
             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "hsl(var(--text-secondary))" }}>
               <span>Subtotal:</span><span>{formatRupiahFull(subtotal)}</span>
             </div>
             {discountAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "hsl(var(--error))" }}>
                  <span>Diskon:</span><span>- {formatRupiahFull(discountAmount)}</span>
                </div>
             )}
             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", fontSize: "18px", fontWeight: 700 }}>
               <span>Total Bayar:</span>
               <span style={{ color: "hsl(var(--primary))" }}>{formatRupiahFull(totalAmount)}</span>
             </div>
             <div style={{ marginBottom: "14px" }}>
               <button className="btn btn-ghost btn-sm" style={{ fontSize: "12px", width: "100%", marginBottom: "8px" }} onClick={() => setShowCustomerForm((v) => !v)}>
                 {showCustomerForm ? "▲ Sembunyikan Info/Voucher" : "💬 Tambah Info Pelanggan & Diskon"}
               </button>
               {showCustomerForm && (
                 <div style={{ display: "grid", gap: "8px", padding: "12px", background: "hsl(var(--bg-card))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}>
                   <CurrencyInput label="Diskon / Voucher (Rp)" value={discountAmount} onChange={setDiscountAmount} />
                   <div style={{ height: "4px" }} />
                   <input className="input-field" style={{ fontSize: "13px", padding: "8px 12px" }} placeholder="Nama pelanggan (opsional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                   <input className="input-field" style={{ fontSize: "13px", padding: "8px 12px" }} placeholder="No. WA untuk struk" type="tel" value={customerWa} onChange={(e) => setCustomerWa(e.target.value)} />
                   {customerWa && <p style={{ fontSize: "11px", color: "hsl(var(--text-muted))" }}>📩 Struk akan dikirim via WhatsApp setelah transaksi berhasil.</p>}
                 </div>
               )}
             </div>
             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
               <button className={`btn ${paymentMethod === "CASH" ? "btn-primary" : "btn-ghost"}`} onClick={() => setPaymentMethod("CASH")}>💵 Tunai</button>
               <button className={`btn ${paymentMethod === "QRIS" ? "btn-primary" : "btn-ghost"}`} onClick={() => { setPaymentMethod("QRIS"); setPaidAmount(0); }}>📲 QRIS</button>
             </div>
             {/* QRIS Image */}
             {paymentMethod === "QRIS" && storeQrisImage && (
               <div style={{ textAlign: "center", marginBottom: "14px" }}>
                 <img
                   src={storeQrisImage}
                   alt="QRIS Pembayaran"
                   style={{ maxWidth: "200px", width: "100%", borderRadius: "12px", border: "1px solid hsl(var(--border))", display: "inline-block" }}
                 />
               </div>
             )}
             {paymentMethod === "CASH" && (
                <div style={{ marginBottom: "16px" }}>
                  <CurrencyInput label="Tunai Diterima" value={paidAmount} onChange={setPaidAmount} autoFocus />
                  {totalAmount > 0 && (
                     <div style={{ display: "flex", gap: "8px", marginTop: "12px", overflowX: "auto", paddingBottom: "4px" }}>
                        {getSuggestedAmounts(totalAmount).map((amt) => (
                           <button key={amt} className="btn btn-sm btn-ghost" onClick={() => setPaidAmount(amt)} style={{ flexShrink: 0, fontSize: "12px" }}>
                              {amt === totalAmount ? "Uang Pas" : formatRupiah(amt)}
                           </button>
                        ))}
                     </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", fontSize: "14px" }}>
                    <span style={{ color: "hsl(var(--text-secondary))" }}>Kembalian:</span>
                    <span style={{ fontWeight: 600, color: changeAmount > 0 ? "hsl(var(--success))" : "inherit" }}>{formatRupiahFull(changeAmount)}</span>
                  </div>
                </div>
             )}
             <button className="btn btn-primary btn-xl btn-block" disabled={cart.length === 0 || !isPaidSufficient} onClick={handleCheckout}>Bayar</button>
          </div>
        </div>
      </div>

      {/* MOBILE ONLY: Sticky Bar & Overlay */}
      <FixedPortal>
        {/* Sticky Bar – muncul ketika cart tertutup pada mobile */}
        {cart.length > 0 && (
          <div className="cart-sticky-bar animate-slide-up" onClick={() => setIsCartOpen(true)}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "8px", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              </div>
              <div style={{ display: "flex", flexDirection: "column", color: "white" }}>
                <span style={{ fontSize: "12px", opacity: 0.9, lineHeight: 1 }}>{cart.reduce((a,c)=>a+c.qty, 0)} Item</span>
                <span style={{ fontSize: "16px", fontWeight: 800 }}>{formatRupiahFull(totalAmount)}</span>
              </div>
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: "6px" }}>
              Check Out <span style={{ fontSize: "18px" }}>›</span>
            </div>
          </div>
        )}

        {/* Overlay gelap saat cart terbuka pada mobile */}
        <div className={`cart-overlay ${isCartOpen ? "open" : ""}`} onClick={() => setIsCartOpen(false)} />
      </FixedPortal>

      {/* SHIFT SUMMARY MODAL */}
      {showShiftSummary && activeShift && user && (
        <div className="lock-screen" style={{ zIndex: 9999 }}>
          <div className="card" id="print-area" style={{ width: "100%", maxWidth: "420px", background: "white", color: "black" }}>
            <div style={{ textAlign: "center", marginBottom: "24px", borderBottom: "2px dashed #ccc", paddingBottom: "16px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 800, color: "black" }}>MbaKasir</h2>
              <h3 style={{ fontSize: "16px", color: "#444" }}>Ringkasan Sesi Kasir</h3>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px", color: "#333", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Kasir Bertugas:</span>
                <span style={{ fontWeight: 600 }}>{user.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Waktu Buka:</span>
                <span style={{ fontWeight: 600 }}>{new Date(activeShift.startedAt).toLocaleString("id-ID")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Waktu Tutup:</span>
                <span style={{ fontWeight: 600 }}>{new Date().toLocaleString("id-ID")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                <span>Modal Awal (Tunai):</span>
                <span style={{ fontWeight: 600 }}>{formatRupiahFull(activeShift.openingCash)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Total Penjualan:</span>
                <span style={{ fontWeight: 600 }}>{formatRupiahFull(activeShift.totalSales)}</span>
              </div>
            </div>

            <div style={{ background: "#f5f5f5", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: 700, color: "black" }}>
                <span>Total Uang Laci Seharusnya:</span>
                <span>{formatRupiahFull(Number(activeShift.openingCash) + Number(activeShift.totalSales))}</span>
              </div>
            </div>

            {/* Optional Inventory Summary */}
            {includeInventory && (
              <div style={{ marginBottom: "24px", borderTop: "1px solid #eee", paddingTop: "16px" }}>
                <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "10px", color: "black" }}>Sisa Stok Produk:</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {products.map(p => (
                    <div key={p.localId} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#444" }}>
                      <span>{p.name}</span>
                      <span style={{ fontWeight: 600 }}>{p.stock} {p.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#666", marginBottom: "10px", cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  checked={includeInventory} 
                  onChange={(e) => setIncludeInventory(e.target.checked)}
                />
                Lampirkan Rekap Stok Produk
              </label>
              <button 
                className="btn" 
                style={{ background: "#111", color: "white" }} 
                onClick={() => window.print()}
              >
                🖨️ Cetak Rekap (Print)
              </button>
              <button 
                className="btn btn-primary" 
                onClick={confirmCloseShift}
              >
                Akhiri & Tutup Shift
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={() => setShowShiftSummary(false)}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STRUK CETAK — hanya tampil saat window.print() */}
      {lastReceipt && (
        <div id="print-receipt" style={{ display: "none" }}>
          <div style={{ fontFamily: "monospace", fontSize: "13px", width: "280px", margin: "0 auto", padding: "16px 0" }}>
            {/* ── Header Toko ── */}
            <div style={{ textAlign: "center", marginBottom: "12px", borderBottom: "1px dashed #000", paddingBottom: "12px" }}>
              <div style={{ fontSize: "18px", fontWeight: 800 }}>{storeName || "MbaKasir"}</div>
              {storeAddress && <div style={{ fontSize: "10px", marginTop: "2px", whiteSpace: "pre-wrap" }}>{storeAddress}</div>}
              {storePhone && <div style={{ fontSize: "10px" }}>📞 {storePhone}</div>}
              <div style={{ fontSize: "10px", marginTop: "6px" }}>Struk Pembelian</div>
              <div style={{ fontSize: "10px" }}>No. {lastReceipt.invoiceNo}</div>
              <div style={{ fontSize: "10px" }}>{new Date().toLocaleString("id-ID")}</div>
              {lastReceipt.customerName && <div style={{ fontSize: "10px" }}>Pelanggan: {lastReceipt.customerName}</div>}
            </div>

            {/* ── Item List ── */}
            {lastReceipt.items.map((item, i) => (
              <div key={i} style={{ marginBottom: "4px" }}>
                <div>{item.name}</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#555" }}>
                  <span style={{ paddingLeft: "8px" }}>{item.qty} × {formatRupiahFull(item.price)}</span>
                  <span>{formatRupiahFull(item.price * item.qty)}</span>
                </div>
              </div>
            ))}

            {/* ── Ringkasan ── */}
            <div style={{ borderTop: "1px dashed #000", marginTop: "8px", paddingTop: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Subtotal</span><span>{formatRupiahFull(lastReceipt.subtotal)}</span>
              </div>
              {lastReceipt.discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Diskon</span><span>-{formatRupiahFull(lastReceipt.discount)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "15px", marginTop: "4px" }}>
                <span>TOTAL</span><span>{formatRupiahFull(lastReceipt.total)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                <span>Metode</span><span>{lastReceipt.method === "CASH" ? "Tunai" : lastReceipt.method}</span>
              </div>
              {lastReceipt.change > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Kembalian</span><span>{formatRupiahFull(lastReceipt.change)}</span>
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div style={{ textAlign: "center", marginTop: "16px", fontSize: "10px", borderTop: "1px dashed #000", paddingTop: "12px", whiteSpace: "pre-wrap" }}>
              {storeFooter}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
