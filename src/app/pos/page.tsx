"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import ReactDOM from "react-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth, useToast } from "@/contexts/AppProviders";
import { getDb, enqueueSyncOp } from "@/lib/db";
import type {
  LocalPosTerminal,
  LocalProduct,
  LocalProductAssignment,
  LocalSaleItem,
  LocalSale,
  LocalShift,
  LocalStoreProfile,
} from "@/lib/db";
import BarcodeScanner from "@/components/common/BarcodeScanner";
import SalesReturnModal from "@/components/common/SalesReturnModal";
import { useInitialSync } from "@/hooks/useInitialSync";
import { useLiveQuery } from "dexie-react-hooks";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { calculateCashFlowSnapshot } from "@/lib/accounting";
import {
  formatRupiah,
  formatRupiahFull,
  generateInvoiceNo,
  generateUUID,
  formatDate,
} from "@/lib/utils";
import { playPaymentSuccess } from "@/lib/sounds";
import { renderWaTemplate } from "@/hooks/useStoreProfile";

function getSuggestedAmounts(total: number): number[] {
  if (total <= 0) return [];
  const suggestions = new Set<number>();
  suggestions.add(total);
  const steps = [5000, 10000, 20000, 50000, 100000];
  for (const step of steps) {
    const rounded = Math.ceil(total / step) * step;
    if (rounded >= total) suggestions.add(rounded);
  }
  return Array.from(suggestions).sort((a, b) => a - b).slice(0, 4);
}

function FixedPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return ReactDOM.createPortal(children, document.body);
}

export default function POSPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSyncing, error } = useInitialSync();

  const [currentTerminalId, setCurrentTerminalId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("currentPosTerminalId");
    if (saved) setCurrentTerminalId(saved);
  }, []);

  const tenantId = user?.tenantId;

  const posTerminals = useLiveQuery<LocalPosTerminal[]>(
    () =>
      tenantId
        ? getDb().posTerminals
            .where("tenantId")
            .equals(tenantId)
            .and((t) => t.isActive)
            .toArray()
        : [],
    [tenantId]
  ) ?? [];

  const productAssignments = useLiveQuery<LocalProductAssignment[]>(() => {
    if (!tenantId) return [];
    // First get the local products to know which IDs to look for
    return getDb().products.where("tenantId").equals(tenantId).toArray().then(prods => {
      const ids = prods.map(p => p.localId);
      return getDb().productAssignments.where("productId").anyOf(ids).toArray();
    });
  }, [tenantId]) ?? [];

  const products = useLiveQuery<LocalProduct[]>(
    async () => {
      if (!tenantId) return [];
      const all = await getDb().products.where("tenantId").equals(tenantId).toArray();
      const activeProducts = all.filter((p) => p.isActive === true && p.showInPos !== false);

      // Filter by assignment & Merge Stock
      return activeProducts
        .map((p) => {
          // Jika kasir belum pilih terminal, tampilkan semua produk dengan stok pusat
          if (!currentTerminalId) return p;

          const assignment = productAssignments.find(
            (a) => a.productId === p.localId && a.terminalId === currentTerminalId
          );

          // Jika terminal ini punya assignment spesifik, pakai stok terminal
          if (assignment) {
            return { ...p, stock: assignment.stock };
          }

          // Jika produk ini sudah di-assign ke terminal LAIN, sembunyikan dari terminal ini
          const otherAssignments = productAssignments.filter((a) => a.productId === p.localId);
          if (otherAssignments.length > 0) return null;

          // Jika produk tidak punya assignment manapun, dia adalah produk umum (tampil di semua terminal)
          return p;
        })
        .filter(Boolean) as LocalProduct[];
    },
    [currentTerminalId, productAssignments, tenantId]
  ) ?? [];

  const currentTerminal = posTerminals.find(t => t.id === currentTerminalId);

  const storeProfile = useLiveQuery<LocalStoreProfile | null>(
    async () => {
      if (!tenantId) return null;
      return (
        (await getDb().storeProfile.get(tenantId)) ??
        (await getDb().storeProfile.get("default")) ??
        null
      );
    },
    [tenantId]
  ) ?? null;
  const storeName = storeProfile?.storeName || user?.name || "MbaKasir";
  const storeAddress = storeProfile?.address || "";
  const storePhone = storeProfile?.phone || "";
  const storeFooter = storeProfile?.footerNote || "Terima kasih sudah berbelanja! 🙏";
  const storeQrisImage = storeProfile?.qrisImageUrl || "";
  const waReceiptTemplate = storeProfile?.waReceiptTemplate || "";
  
  const shifts = useLiveQuery<LocalShift[]>(
    async () => {
      if (!user || !tenantId) return [];
      return await getDb()
        .shifts
        .where("tenantId")
        .equals(tenantId)
        .and((s) => s.userId === user.sub)
        .toArray();
    },
    [tenantId, user?.sub]
  ) ?? [];
  const activeShift = shifts?.find((s) => !s.closedAt);

  const sales = useLiveQuery(
    () => (tenantId ? getDb().sales.where("tenantId").equals(tenantId).reverse().sortBy("createdAt") : []),
    [tenantId]
  ) ?? [];

  const saleItems = useLiveQuery(
    () => {
      if (!tenantId || sales.length === 0) return [];
      const saleIds = sales.slice(0, 50).map(s => s.localId);
      return getDb().saleItems.where("saleLocalId").anyOf(saleIds).toArray();
    },
    [tenantId, sales.length]
  ) ?? [];

  const shiftSales = useLiveQuery<LocalSale[]>(
    async () => {
      if (!activeShift) return [];
      return await getDb().sales.where("shiftLocalId").equals(activeShift.localId).toArray();
    },
    [activeShift?.localId]
  ) ?? [];

  const shiftSaleItems = useLiveQuery<LocalSaleItem[]>(
    async () => {
      if (!activeShift || shiftSales.length === 0) return [];
      const saleLocalIds = shiftSales.map(s => s.localId);
      return await getDb().saleItems.where("saleLocalId").anyOf(saleLocalIds).toArray();
    },
    [activeShift?.localId, shiftSales.length]
  ) ?? [];

  const rawMaterials = useLiveQuery(() => tenantId ? getDb().rawMaterials.where("tenantId").equals(tenantId).toArray() : [], [tenantId]) || [];
  const allAssets = useLiveQuery(() => tenantId ? getDb().assets.where("tenantId").equals(tenantId).toArray() : [], [tenantId]) || [];
  const allExpenses = useLiveQuery(() => tenantId ? getDb().expenses.where("tenantId").equals(tenantId).toArray() : [], [tenantId]) || [];
  
  const returns = useLiveQuery(
    () => (tenantId ? getDb().salesReturns.where("tenantId").equals(tenantId).toArray() : []),
    [tenantId]
  ) ?? [];

  const allSaleItems = useLiveQuery(async () => {
    if (!tenantId) return [];
    const db = getDb();
    const saleIds = await db.sales.where("tenantId").equals(tenantId).primaryKeys();
    return db.saleItems.where("saleLocalId").anyOf(saleIds).toArray();
  }, [tenantId]) || [];
  const shoppingPurchases = useLiveQuery(
    () =>
      tenantId
        ? getDb().shoppingList.where("tenantId").equals(tenantId).and((item) => item.status === "done").toArray()
        : [],
    [tenantId]
  ) ?? [];

  const globalCashBalance = useMemo(() => {
    return calculateCashFlowSnapshot({
      storeProfile,
      sales: sales.filter((sale) => sale.status === "COMPLETED"),
      expenses: allExpenses,
      returns,
      assets: allAssets,
      stockPurchases: shoppingPurchases,
    }).endingCash;
  }, [allAssets, allExpenses, returns, sales, shoppingPurchases, storeProfile]);

  const isHppMissing = useMemo(() => {
    return products.some(p => p.stock > 0 && (!p.costPrice || p.costPrice === 0)) || 
           rawMaterials.some(m => m.stock > 0 && (!m.costPerUnit || m.costPerUnit === 0));
  }, [products, rawMaterials]);

  const winningProducts = useMemo(() => {
    if (!products.length || allSaleItems.length === 0) return [];
    const counts: Record<string, number> = {};
    for (const item of allSaleItems) {
      counts[item.productId] = (counts[item.productId] || 0) + item.quantity;
    }
    const sorted = [...products].sort((a, b) => (counts[b.localId] || 0) - (counts[a.localId] || 0));
    return sorted.filter(p => (counts[p.localId] || 0) > 0).slice(0, 5);
  }, [allSaleItems, products]);

  const tunaiTotal = useMemo(() => {
    return shiftSales.filter(s => s.paymentMethod === "CASH").reduce((sum, s) => sum + s.totalAmount, 0);
  }, [shiftSales]);

  const qrisTotal = useMemo(() => {
    return shiftSales.filter(s => s.paymentMethod === "QRIS").reduce((sum, s) => sum + s.totalAmount, 0);
  }, [shiftSales]);

  const shiftReturns = useMemo(() => {
    if (!activeShift) return [];
    return returns.filter(r => r.createdAt >= activeShift.startedAt);
  }, [activeShift, returns]);

  const shiftReturnTotal = useMemo(() => {
    return shiftReturns.reduce((sum, r) => sum + r.totalAmount, 0);
  }, [shiftReturns]);

  const currentCashInDrawer = useMemo(() => {
    return (activeShift?.openingCash || 0) + tunaiTotal - shiftReturnTotal;
  }, [activeShift?.openingCash, tunaiTotal, shiftReturnTotal]);

  const soldItemsSummary = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; price: number; subtotal: number }>();
    shiftSaleItems.forEach(item => {
       const existing = map.get(item.productId);
       if (existing) {
          existing.qty += item.quantity;
          existing.subtotal += item.subtotal;
       } else {
          map.set(item.productId, { name: item.productName, qty: item.quantity, price: item.price, subtotal: item.subtotal });
       }
    });
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [shiftSaleItems]);

  const lowStockProducts = useMemo(() => {
     return products.filter(p => p.stock <= 5);
  }, [products]);

  const [cart, setCart] = useState<{ product: LocalProduct; qty: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "QRIS">("CASH");
  const [paidAmount, setPaidAmount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [openingCash, setOpeningCash] = useState(0);

  // Persistence: Load State on Mount
  useEffect(() => {
    const savedCart = localStorage.getItem("pos_active_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse saved cart", e);
      }
    }

    const savedCustomer = localStorage.getItem("pos_customer_info");
    if (savedCustomer) {
      try {
        const { name, wa, discount, method } = JSON.parse(savedCustomer);
        setCustomerName(name || "");
        setCustomerWa(wa || "");
        setDiscountAmount(discount || 0);
        setPaymentMethod(method || "CASH");
      } catch (e) {}
    }

    const savedPinStatus = sessionStorage.getItem("pos_pin_verified");
    if (savedPinStatus === "true") {
      setIsPinVerified(true);
    }
  }, []);

  // Persistence: Save Cart
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem("pos_active_cart", JSON.stringify(cart));
    } else {
      localStorage.removeItem("pos_active_cart");
    }
  }, [cart]);
  
  useEffect(() => {
    if (globalCashBalance > 0 && openingCash === 0) {
      setOpeningCash(globalCashBalance);
    }
  }, [globalCashBalance]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const [showScanner, setShowScanner] = useState(false);
  
  useEffect(() => {
    // Cek apakah ada scan tertunda dari Header (saat pindah halaman ke POS)
    const pendingScan = localStorage.getItem("pending_barcode_scan");
    if (pendingScan) {
      setSearchQuery(pendingScan);
      localStorage.removeItem("pending_barcode_scan");
    }

    // Dengarkan event scan dari Header (jika sedang di halaman POS)
    const handleGlobalScan = (e: any) => {
      const code = e.detail;
      const product = products.find(p => p.sku === code.toUpperCase());
      if (product) {
        addToCart(product);
        toast(`Ditambah: ${product.name}`, "success");
      } else {
        setSearchQuery(code);
      }
    };

    // Shortcut F9 untuk Scanner
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F9") {
        e.preventDefault();
        setShowScanner(prev => !prev);
      }
    };

    window.addEventListener("global-barcode-scanned", handleGlobalScan);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("global-barcode-scanned", handleGlobalScan);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [products]);

  const [showShiftSummary, setShowShiftSummary] = useState(false);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerWa, setCustomerWa] = useState("");
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Persistence: Save Customer Info & PIN Status
  useEffect(() => {
    localStorage.setItem("pos_customer_info", JSON.stringify({
      name: customerName,
      wa: customerWa,
      discount: discountAmount,
      method: paymentMethod
    }));
  }, [customerName, customerWa, discountAmount, paymentMethod]);

  useEffect(() => {
    if (isPinVerified) {
      sessionStorage.setItem("pos_pin_verified", "true");
    } else {
      sessionStorage.removeItem("pos_pin_verified");
    }
  }, [isPinVerified]);
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [brand, setBrand] = useState<any>(null);
  const [printRekapShift, setPrintRekapShift] = useState(false);
  const [showItemDetails, setShowItemDetails] = useState(false);
  const [showReturnSelector, setShowReturnSelector] = useState(false);
  const [returnTargetId, setReturnTargetId] = useState<string | null>(null);

  const currentSaleForReturn = sales.find(s => s.localId === returnTargetId);
  const currentItemsForReturn = saleItems.filter(i => i.saleLocalId === returnTargetId);

  const handlePrintRekap = () => {
    setPrintRekapShift(true);
    setTimeout(() => {
       window.print();
       setPrintRekapShift(false);
    }, 150);
  };

  const sendRekapWa = () => {
     let msg = `*📊 REKAP SHIFT*\n*${storeName}*\n`;
     msg += `Kasir: ${user?.name || '-'}\n`;
     msg += `Waktu: ${new Date().toLocaleString('id-ID')}\n\n`;
     msg += `*Ringkasan Kas*\n`;
     msg += `Modal Awal: ${formatRupiahFull(activeShift?.openingCash || 0)}\n`;
     msg += `Tunai: ${formatRupiahFull(tunaiTotal)}\n`;
     msg += `QRIS: ${formatRupiahFull(qrisTotal)}\n`;
     if (shiftReturnTotal > 0) msg += `Retur: -${formatRupiahFull(shiftReturnTotal)}\n`;
     msg += `Total Penjualan: ${formatRupiahFull(activeShift?.totalSales || 0)}\n`;
     msg += `Ekspektasi Kas Laci: ${formatRupiahFull((activeShift?.openingCash || 0) + tunaiTotal - shiftReturnTotal)}\n\n`;
     
     if (soldItemsSummary.length > 0) {
        msg += `*Barang Laku*\n`;
        soldItemsSummary.forEach(item => {
           msg += `- ${item.name} x${item.qty} (${formatRupiahFull(item.subtotal)})\n`;
        });
        msg += `\n`;
     }

     if (lowStockProducts.length > 0) {
        msg += `*⚠️ Stok Menipis (<= 5)*\n`;
        lowStockProducts.forEach(p => {
           msg += `- ${p.name} (Sisa: ${p.stock})\n`;
        });
     }
     
     const waOwner = prompt("Masukkan Nomor WA Owner/Toko:", storePhone || "");
     if (waOwner) {
         const waNumber = waOwner.replace(/\D/g, "").replace(/^0/, "62");
         window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, "_blank");
     }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  useEffect(() => {
    fetch("/api/public/brand")
      .then(r => r.json())
      .then(data => setBrand(data.brand))
      .catch(() => {});
  }, []);

  const totalAmount = Math.max(0, subtotal - discountAmount);
  const changeAmount = paymentMethod === "CASH" ? Math.max(0, paidAmount - totalAmount) : 0;
  const isPaidSufficient = paymentMethod === "QRIS" || paidAmount >= totalAmount;

  const addToCart = (product: LocalProduct) => {
    const currentQty = cart.find((c) => c.product.localId === product.localId)?.qty || 0;
    // BLOKIR JIKA STOK HABIS
    if (product.stock <= 0) {
      toast(`Stok ${product.name} habis!`, "warning");
      return;
    }
    if (currentQty + 1 > product.stock) {
       toast(`Stok ${product.name} tidak mencukupi`, "warning");
       return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.localId === product.localId);
      if (existing) {
        return prev.map((item) => item.product.localId === product.localId ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateQty = (localId: string, delta: number) => {
    setCart((prev) => prev.map((item) => {
      if (item.product.localId === localId) {
        const newQty = item.qty + delta;
        if (newQty > item.product.stock) {
           toast(`Stok tidak mencukupi`, "warning");
           return item;
        }
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }));
  };

  const handleVerifyPin = () => {
    if (!user?.pin || pinInput === user.pin) {
      setIsPinVerified(true);
      setPinError("");
    } else {
      setPinError("PIN salah. Silakan coba lagi.");
      setPinInput("");
    }
  };

  const handleStartShift = async () => {
    if (!user || user.role === "SUPERADMIN") return;
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
    toast("Shift berhasil dibuka!", "success");
  };

  const confirmCloseShift = async () => {
    if (!activeShift) return;
    const closed = { ...activeShift, closedAt: Date.now(), syncStatus: "PENDING" as const };
    await getDb().shifts.put(closed);
    await enqueueSyncOp("shifts", closed.localId, "UPDATE", closed);
    setShowShiftSummary(false);
    toast("Shift ditutup. Sampai jumpa!", "info");
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !isPaidSufficient || !user?.tenantId) return;
    
    if (paymentMethod === "CASH" && changeAmount > currentCashInDrawer) {
      if (!confirm(`⚠️ Uang di laci (${formatRupiahFull(currentCashInDrawer)}) tidak cukup untuk kembalian (${formatRupiahFull(changeAmount)}). Tetap lanjutkan?`)) {
        return;
      }
    }

    if (isHppMissing) {
      if (!confirm(`⚠️ Beberapa produk belum ada Harga Beli (HPP). Ini akan membuat perhitungan Kas di Laci menjadi tidak akurat. Tetap lanjutkan?`)) {
        return;
      }
    }

    try {
      const db = getDb();
      const saleLocalId = generateUUID();
      const now = Date.now();
      const saleItems: LocalSaleItem[] = cart.map((item) => ({
        id: generateUUID(),
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
        customerName: customerName || undefined,
        customerWa: customerWa || undefined,
        terminalId: currentTerminalId || undefined,
        syncStatus: "PENDING",
        createdAt: now,
        updatedAt: now,
      };

      console.log("Saving sale with customer data:", { name: sale.customerName, wa: sale.customerWa });
      await db.transaction('rw', [db.sales, db.saleItems, db.products, db.rawMaterials, db.billOfMaterials, db.shifts, db.syncQueue, db.productAssignments], async () => {
        await db.sales.put(sale);
        await db.saleItems.bulkPut(saleItems);
        if (activeShift) {
           const updatedShift: LocalShift = { ...activeShift, totalSales: activeShift.totalSales + subtotal, syncStatus: "PENDING" };
           await db.shifts.put(updatedShift);
           await enqueueSyncOp("shifts", activeShift.localId, "UPDATE", updatedShift);
        }
        for (const item of cart) {
          // Reduce stock: terminal-specific first, then fallback to central warehouse
          if (currentTerminalId) {
            const assignment = await db.productAssignments.where({ productId: item.product.localId, terminalId: currentTerminalId }).first();
            if (assignment) {
              const newTerminalStock = assignment.stock - item.qty;
              await db.productAssignments.update(assignment.id, { stock: Math.max(0, newTerminalStock) });
              await enqueueSyncOp("productAssignments", assignment.id, "UPDATE", { ...assignment, stock: Math.max(0, newTerminalStock) });
            } else {
              // Fallback to global/central stock if no terminal-specific assignment
              const prod = await db.products.get(item.product.localId);
              if (prod) {
                const newStock = prod.stock - item.qty;
                await db.products.update(prod.localId, { stock: Math.max(0, newStock) });
                await enqueueSyncOp("products", prod.localId, "UPDATE", { ...prod, stock: Math.max(0, newStock) });
              }
            }
          } else {
            // No active terminal → always reduce central/warehouse stock
            const prod = await db.products.get(item.product.localId);
            if (prod) {
              const newStock = prod.stock - item.qty;
              await db.products.update(prod.localId, { stock: Math.max(0, newStock) });
              await enqueueSyncOp("products", prod.localId, "UPDATE", { ...prod, stock: Math.max(0, newStock) });
            }
          }

          // For BoM products: also deduct raw materials proportionally.
          // This is a SEPARATE deduction from the product stock above —
          // raw materials are consumed regardless of whether stock is tracked
          // at the terminal or warehouse level.
          if (item.product.hasBoM) {
            const boms = await db.billOfMaterials.where("productId").equals(item.product.localId).toArray();
            for (const bom of boms) {
              const material = await db.rawMaterials.get(bom.rawMaterialId);
              if (material) {
                const deduction = item.qty * bom.quantity;
                const newMatStock = material.stock - deduction;
                await db.rawMaterials.update(material.localId, { stock: Math.max(0, newMatStock) });
                await enqueueSyncOp("rawMaterials", material.localId, "UPDATE", { ...material, stock: Math.max(0, newMatStock) });
              }
            }
          }
        }
        await enqueueSyncOp("sales", saleLocalId, "CREATE", { ...sale, items: saleItems });
      });

      playPaymentSuccess();

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

      if (customerWa.trim()) {
        const itemLines = cart.map((i) => `• ${i.product.name} x${i.qty}  ${formatRupiahFull(i.product.price * i.qty)}`).join("\n");
        const waMsg = `*🧾 Struk Belanja*\n*${storeName}*\n\n${itemLines}\n\nSubtotal: ${formatRupiahFull(subtotal)}\nDiskon: ${formatRupiahFull(discountAmount)}\n*Total: ${formatRupiahFull(totalAmount)}*\n\n${storeFooter}`;
        const waNumber = customerWa.replace(/\D/g, "").replace(/^0/, "62");
        window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`, "_blank");
      }

      setCart([]);
      setPaidAmount(0);
      setDiscountAmount(0);
      setIsCartOpen(false);
      setCustomerName("");
      setCustomerWa("");
      setShowCustomerForm(false);
      
      // Clear Persistence after checkout
      localStorage.removeItem("pos_active_cart");
      localStorage.removeItem("pos_customer_info");
      
      toast("Transaksi Berhasil!", "success");
      setTimeout(() => window.print(), 150);
    } catch (err: any) {
      toast(`Gagal: ${err.message}`, "error");
    }
  };

  const cartJsx = (
    <div className={`pos-cart ${isCartOpen ? "open" : ""}`}>
      <div className="mobile-drawer-handle" onClick={() => setIsCartOpen(false)}>
         <div style={{ width: "40px", height: "5px", background: "rgba(0,0,0,0.15)", borderRadius: "10px" }} />
      </div>
      <div style={{ 
        padding: "clamp(16px, 4vw, 20px)", 
        background: "linear-gradient(to bottom, hsl(var(--bg-elevated)), hsl(var(--bg-surface)))", 
        borderBottom: "1px solid hsl(var(--border))", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        flexShrink: 0
      }}>
        <h2 style={{ fontSize: "16px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.01em" }}>
          🛒 Keranjang Belanja
        </h2>
        <button className="btn btn-ghost btn-icon btn-sm mobile-close-btn" onClick={() => setIsCartOpen(false)}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "clamp(16px, 4vw, 20px)", display: "flex", flexDirection: "column", gap: "16px", flex: "1 1 auto" }}>
        {cart.length === 0 ? (
          <div style={{ textAlign: "center", color: "hsl(var(--text-muted))", marginTop: "40px" }}>Keranjang masih kosong</div>
        ) : (
          cart.map((item) => (
            <div key={item.product.localId} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div 
                style={{ 
                  width: "44px", 
                  height: "44px", 
                  borderRadius: "10px", 
                  background: "hsl(var(--bg-elevated))", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  overflow: "hidden",
                  border: "1px solid hsl(var(--border))",
                  flexShrink: 0
                }}
              >
                {item.product.imageUrl ? (
                  <img src={item.product.imageUrl} alt={item.product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: "16px", opacity: 0.3 }}>📦</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 700 }}>{item.product.name}</div>
                <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>{formatRupiahFull(item.product.price)}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "hsl(var(--bg-elevated))", borderRadius: "100px", padding: "4px" }}>
                <button className="btn btn-ghost btn-icon" style={{ width: "28px", height: "28px" }} onClick={() => updateQty(item.product.localId, -1)}>-</button>
                <span style={{ fontSize: "14px", fontWeight: 600, width: "24px", textAlign: "center" }}>{item.qty}</span>
                <button className="btn btn-ghost btn-icon" style={{ width: "28px", height: "28px" }} onClick={() => updateQty(item.product.localId, 1)}>+</button>
              </div>
            </div>
          ))
        )}
        </div>
        <div style={{ padding: "clamp(16px, 4vw, 20px)", background: "hsl(var(--bg-elevated))", borderTop: "1px solid hsl(var(--border))", flexShrink: 0 }}>
         <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
           <span>Subtotal:</span><span>{formatRupiahFull(subtotal)}</span>
         </div>
         {discountAmount > 0 && (
           <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "hsl(var(--error))" }}>
             <span>Diskon:</span><span>-{formatRupiahFull(discountAmount)}</span>
           </div>
         )}
         <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", fontSize: "18px", fontWeight: 700 }}>
           <span>Total Bayar:</span>
           <span style={{ color: "hsl(var(--primary))" }}>{formatRupiahFull(totalAmount)}</span>
         </div>
         <div style={{ marginBottom: "14px" }}>
            <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: "8px" }} onClick={() => setShowCustomerForm(!showCustomerForm)}>
              {showCustomerForm ? "▲ Sembunyikan Info" : (storeProfile?.isCrmEnabled ? "💬 Info Pelanggan & Diskon" : "🏷️ Diskon Manual")}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              {currentTerminal && (
                <div style={{ 
                  background: "hsl(var(--primary) / 0.1)", 
                  color: "hsl(var(--primary))", 
                  padding: "4px 12px", 
                  borderRadius: "20px", 
                  fontSize: "12px", 
                  fontWeight: 700,
                  border: "1px solid hsl(var(--primary) / 0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <span style={{ fontSize: "14px" }}>🖥️</span> {currentTerminal.name}
                </div>
              )}
              <div style={{ 
                background: "hsl(var(--bg-card))", 
                padding: "4px 12px", 
                borderRadius: "20px", 
                fontSize: "12px", 
                color: "hsl(var(--text-muted))",
                border: "1px solid hsl(var(--border))"
              }}>
                {formatDate(currentTime)}
              </div>
            </div>
            {showCustomerForm && (
              <div style={{ display: "grid", gap: "8px", padding: "12px", background: "hsl(var(--bg-card))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}>
                <CurrencyInput label="Diskon Manual (Rp)" value={discountAmount} onChange={setDiscountAmount} />
                {storeProfile?.isCrmEnabled && (
                  <>
                    <input className="input-field" style={{ fontSize: "13px" }} placeholder="Nama pelanggan (opsional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                    <input className="input-field" style={{ fontSize: "13px" }} placeholder="Nomor WhatsApp" value={customerWa} onChange={(e) => setCustomerWa(e.target.value)} />
                  </>
                )}
              </div>
            )}
          </div>
         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
           <button className={`btn ${paymentMethod === "CASH" ? "btn-primary" : "btn-ghost"}`} onClick={() => setPaymentMethod("CASH")}>💵 Tunai</button>
           <button className={`btn ${paymentMethod === "QRIS" ? "btn-primary" : "btn-ghost"}`} onClick={() => { setPaymentMethod("QRIS"); setPaidAmount(0); }}>📲 QRIS</button>
         </div>
         {paymentMethod === "QRIS" && storeQrisImage && (
           <div style={{ textAlign: "center", marginBottom: "14px" }}>
             <img src={storeQrisImage} alt="QRIS" style={{ maxWidth: "200px", borderRadius: "12px" }} />
           </div>
         )}
         {paymentMethod === "CASH" && (
            <div style={{ marginBottom: "16px" }}>
              <CurrencyInput label="Tunai Diterima" value={paidAmount} onChange={setPaidAmount} autoFocus />
              <div style={{ display: "flex", gap: "8px", marginTop: "12px", overflowX: "auto", paddingBottom: "4px" }}>
                 {getSuggestedAmounts(totalAmount).map((amt) => (
                    <button key={amt} className="btn btn-sm btn-ghost" onClick={() => setPaidAmount(amt)} style={{ whiteSpace: "nowrap" }}>{amt === totalAmount ? "Uang Pas" : formatRupiah(amt)}</button>
                 ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", fontSize: "14px" }}>
                <span>Kembalian:</span>
                <span style={{ fontWeight: 600, color: changeAmount > currentCashInDrawer ? "hsl(var(--error))" : (changeAmount > 0 ? "hsl(var(--success))" : "inherit") }}>{formatRupiahFull(changeAmount)}</span>
              </div>
              {changeAmount > currentCashInDrawer && (
                <div style={{ fontSize: "11px", color: "hsl(var(--error))", textAlign: "right", marginTop: "4px", fontWeight: 700 }}>
                  ⚠️ Kas di laci tidak cukup ({formatRupiahFull(currentCashInDrawer)})
                </div>
              )}
            </div>
         )}
         <button className="btn btn-primary btn-xl btn-block" disabled={cart.length === 0 || !isPaidSufficient} onClick={handleCheckout} style={{ height: "auto", minHeight: "56px", padding: "12px", whiteSpace: "normal", wordWrap: "break-word" }}>Bayar Sekarang</button>
         {cart.length > 0 && (
           <button 
             className="btn btn-ghost btn-block" 
             style={{ marginTop: "12px", color: "hsl(var(--error))", fontSize: "14px", fontWeight: 600 }} 
             onClick={() => {
               if (window.confirm("Apakah Anda yakin ingin membatalkan transaksi ini?")) {
                 setCart([]);
                 setPaidAmount(0);
                 setDiscountAmount(0);
                 setIsCartOpen(false);
                 setCustomerName("");
                 setCustomerWa("");
                 setShowCustomerForm(false);
                 
                 localStorage.removeItem("pos_active_cart");
                 localStorage.removeItem("pos_customer_info");
                 
                 toast("Transaksi dibatalkan", "info");
               }
             }}
           >
             ✕ Batalkan Transaksi
           </button>
         )}
        </div>
      </div>
    </div>
  );

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isSyncing && products.length === 0) return (
    <DashboardLayout title="Kasir">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div className="animate-spin" style={{ fontSize: "40px" }}>⏳</div>
        <p style={{ marginTop: "16px" }}>Memuat Data Produk...</p>
      </div>
    </DashboardLayout>
  );

  if (user && user.role === "CASHIER" && user.pin && !isPinVerified) {
    return (
      <DashboardLayout title="Verifikasi PIN">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "70vh" }}>
          <div className="card" style={{ width: "100%", maxWidth: "380px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>🔐</div>
            <h2 style={{ marginBottom: "8px", fontWeight: 700 }}>Masukkan PIN Anda</h2>
            <p style={{ color: "hsl(var(--text-secondary))", marginBottom: "24px", fontSize: "14px" }}>Gunakan PIN 6 digit untuk membuka sesi kasir.</p>
            <input 
              type="password" 
              inputMode="numeric" 
              maxLength={6} 
              className="input-field" 
              style={{ textAlign: "center", fontSize: "28px", letterSpacing: "12px", marginBottom: "20px" }} 
              placeholder="••••••"
              value={pinInput} 
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))} 
              onKeyDown={(e) => e.key === "Enter" && pinInput.length === 6 && handleVerifyPin()} 
              autoFocus 
            />
            {pinError && <p style={{ color: "hsl(var(--error))", marginBottom: "16px" }}>{pinError}</p>}
            {user.email === "kasir@demo.id" && (
               <div style={{ padding: "10px", background: "hsl(var(--primary) / 0.1)", borderRadius: "8px", color: "hsl(var(--primary))", fontWeight: 700, marginBottom: "20px", fontSize: "13px" }}>
                  💡 PIN Demo: 123456
               </div>
            )}
            <button className="btn btn-primary btn-block btn-lg" disabled={pinInput.length !== 6} onClick={handleVerifyPin}>Masuk ke Kasir</button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (shifts !== undefined && !activeShift && user && user.role !== "SUPERADMIN") {
    return (
      <DashboardLayout title="Buka Shift">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "70vh" }}>
          <div className="card" style={{ width: "100%", maxWidth: "400px", textAlign: "center" }}>
            <h2 style={{ marginBottom: "8px" }}>Hai, {user.name}!</h2>
            <p style={{ marginBottom: "24px", color: "hsl(var(--text-secondary))" }}>Masukkan modal awal di laci kasir untuk mulai.</p>
            <CurrencyInput label="Modal Awal" value={openingCash} onChange={setOpeningCash} autoFocus />
            <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: "24px" }} onClick={handleStartShift}>Buka Shift Sekarang</button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Jika terminal belum dipilih
  if (!currentTerminalId && posTerminals.length > 0) {
    return (
      <DashboardLayout title="Pilih Terminal POS">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "70vh" }}>
          <div className="card" style={{ width: "100%", maxWidth: "500px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>🖥️</div>
            <h2 style={{ marginBottom: "8px", fontWeight: 700 }}>Pilih Terminal Kasir</h2>
            <p style={{ color: "hsl(var(--text-secondary))", marginBottom: "24px", fontSize: "14px" }}>
              Perangkat ini akan didaftarkan sebagai terminal spesifik untuk transaksi.
            </p>
            <div style={{ display: "grid", gap: "10px" }}>
              {posTerminals.map(terminal => (
                <button
                  key={terminal.id}
                  className="btn btn-outline btn-lg"
                  style={{ justifyContent: "space-between", padding: "16px 20px" }}
                  onClick={() => {
                    localStorage.setItem("currentPosTerminalId", terminal.id);
                    setCurrentTerminalId(terminal.id);
                    toast(`Terminal ${terminal.name} dipilih`, "success");
                  }}
                >
                  <span>{terminal.name}</span>
                  <span style={{ fontSize: "12px", opacity: 0.6 }}>{terminal.code}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Kasir (POS)" 
      headerActions={
        <div style={{ display: "flex", gap: "8px" }}>
          {activeShift && (
            <button className="btn btn-sm btn-ghost" onClick={() => setShowReturnSelector(true)}>
              🔄 Retur
            </button>
          )}
          {activeShift ? (
            <button className="btn btn-sm btn-ghost" style={{ color: "hsl(var(--error))" }} onClick={() => setShowShiftSummary(true)}>
              🔚 Tutup Shift
            </button>
          ) : null}
        </div>
      }
    >
      <div className="pos-layout">
        <div className="pos-products-area">
          <div style={{ padding: "16px 20px", background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border))", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <input 
                  className="input-field" 
                  placeholder="🔍 Cari nama atau SKU produk..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  style={{ paddingRight: "100px" }}
                />
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => setShowScanner(!showScanner)}
                  title="Scan Barcode (F9)"
                  style={{ 
                    position: "absolute", 
                    right: "8px", 
                    top: "50%", 
                    transform: "translateY(-50%)",
                    background: "hsl(var(--bg-elevated))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    height: "32px",
                    fontSize: "12px",
                    fontWeight: 700,
                    gap: "4px"
                  }}
                >
                  📷 <span className="hidden md:inline">Scan (F9)</span>
                </button>
              </div>
              {currentTerminal && (
                <div style={{ 
                  background: "hsl(var(--primary) / 0.1)", 
                  color: "hsl(var(--primary))", 
                  padding: "6px 12px", 
                  borderRadius: "10px", 
                  fontSize: "12px", 
                  fontWeight: 800,
                  border: "1px solid hsl(var(--primary) / 0.2)",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <span style={{ fontSize: "14px" }}>🖥️</span> {currentTerminal.name}
                </div>
              )}
          </div>

          {isHppMissing && (
            <div style={{ 
              margin: "12px 20px 0",
              background: "hsl(var(--error) / 0.1)", 
              color: "hsl(var(--error))", 
              padding: "10px 16px", 
              borderRadius: "12px", 
              fontSize: "13px", 
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "1px solid hsl(var(--error) / 0.2)"
            }}>
              ⚠️ Beberapa produk/bahan belum ada Harga Beli (HPP). Laporan kas mungkin tidak akurat!
            </div>
          )}
          
          {showScanner && (
            <div style={{ padding: "20px" }}>
              <BarcodeScanner 
                onScan={(code) => {
                  const product = products.find(p => p.sku === code.toUpperCase());
                  if (product) {
                    addToCart(product);
                    toast(`Ditambah: ${product.name}`, "success");
                  } else {
                    toast(`Produk SKU ${code} tidak ditemukan`, "warning");
                    setSearchQuery(code);
                  }
                }} 
                onClose={() => setShowScanner(false)} 
              />
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
            {searchQuery === "" && winningProducts.length > 0 && !showScanner && (
              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "20px" }}>🔥</span>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "hsl(var(--warning))" }}>Produk Winning (80/20)</h3>
                  <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginLeft: "auto", fontWeight: 600 }}>Paling Laris</span>
                </div>
                <div className="product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "16px" }}>
                  {winningProducts.map((p) => (
                    <div key={`win-${p.localId}`} className="card product-card" style={{ cursor: "pointer", padding: "12px", textAlign: "center", opacity: p.stock <= 0 ? 0.6 : 1, border: "1px solid hsl(var(--warning)/0.4)", background: "linear-gradient(to bottom, hsl(var(--bg-card)), hsl(var(--warning)/0.03))" }} onClick={() => addToCart(p)}>
                      <div style={{ aspectRatio: "1", background: "hsl(var(--bg-elevated))", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", marginBottom: "8px", overflow: "hidden" }}>
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          p.name.charAt(0)
                        )}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: "14px", lineHeight: 1.2, height: "2.4em", overflow: "hidden" }}>{p.name}</div>
                      <div style={{ color: "hsl(var(--primary))", fontWeight: 700, margin: "4px 0" }}>{formatRupiahFull(p.price)}</div>
                      <div style={{ fontSize: "11px", color: p.stock <= 0 ? "hsl(var(--error))" : "hsl(var(--text-muted))" }}>
                        {p.stock <= 0 ? "STOK HABIS" : `Stok: ${p.stock}`}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ borderBottom: "1px dashed hsl(var(--border))", margin: "20px 0" }}></div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px", color: "hsl(var(--text-secondary))" }}>Semua Produk</h3>
              </div>
            )}
            <div className="product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "16px" }}>
              {filteredProducts.map((p) => (
                <div key={p.localId} className="card product-card" style={{ cursor: "pointer", padding: "12px", textAlign: "center", opacity: p.stock <= 0 ? 0.6 : 1 }} onClick={() => addToCart(p)}>
                  <div style={{ aspectRatio: "1", background: "hsl(var(--bg-elevated))", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", marginBottom: "8px", overflow: "hidden" }}>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      p.name.charAt(0)
                    )}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "14px", lineHeight: 1.2, height: "2.4em", overflow: "hidden" }}>{p.name}</div>
                  <div style={{ color: "hsl(var(--primary))", fontWeight: 700, margin: "4px 0" }}>{formatRupiahFull(p.price)}</div>
                  <div style={{ fontSize: "11px", color: p.stock <= 0 ? "hsl(var(--error))" : "hsl(var(--text-muted))" }}>
                    {p.stock <= 0 ? "STOK HABIS" : `Stok: ${p.stock}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="pos-cart-desktop-container">{cartJsx}</div>
      </div>

      <FixedPortal>
        <div className="pos-cart-mobile-wrapper">
          <div className={`cart-overlay ${isCartOpen ? "open" : ""}`} onClick={() => setIsCartOpen(false)} />
          {cartJsx}
        </div>
        {cart.length > 0 && !isCartOpen && (
          <div className="cart-sticky-bar animate-slide-up" onClick={() => setIsCartOpen(true)}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "8px", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>🛒</div>
              <div style={{ color: "white" }}>
                <span style={{ fontSize: "12px", opacity: 0.9 }}>{cart.reduce((a,c)=>a+c.qty, 0)} Item</span><br/>
                <b>{formatRupiahFull(totalAmount)}</b>
              </div>
            </div>
            <div style={{ color: "white", fontWeight: 700 }}>Bayar ›</div>
          </div>
        )}
      </FixedPortal>

      {showShiftSummary && activeShift && (
        <div className="modal-overlay active" style={{ zIndex: 3000 }}>
          <div className="card animate-slide-up" style={{ width: "100%", maxWidth: "550px", maxHeight: "90vh", overflowY: "auto", padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "24px", background: "var(--gradient-primary)", color: "white", textAlign: "center" }}>
               <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.9, marginBottom: "4px" }}>Laporan Penutupan</div>
               <h2 style={{ fontSize: "24px", fontWeight: 900, color: "white" }}>REKAP SHIFT</h2>
               <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "4px" }}>
                 {new Date(activeShift.startedAt).toLocaleString()} — Sekarang
               </div>
            </div>

            <div style={{ padding: "clamp(16px, 5vw, 24px)", display: "grid", gap: "24px" }}>
               <div className="card" style={{ background: "hsl(var(--bg-elevated))", border: "1.5px solid hsl(var(--primary) / 0.2)", position: "relative" }}>
                 <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px", borderBottom: "1px solid hsl(var(--border))", paddingBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                   💵 Ringkasan Kas Laci
                 </div>
                 <div style={{ display: "grid", gap: "10px" }}>
                   <div style={{ display: "flex", justifyContent: "space-between" }}><span>Modal Awal:</span><span style={{ fontWeight: 600 }}>{formatRupiahFull(activeShift.openingCash)}</span></div>
                   <div style={{ display: "flex", justifyContent: "space-between" }}><span>Penjualan Tunai:</span><span style={{ fontWeight: 600, color: "hsl(var(--success))" }}>+{formatRupiahFull(tunaiTotal)}</span></div>
                   <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total Retur (Tunai):</span><span style={{ fontWeight: 600, color: "hsl(var(--error))" }}>-{formatRupiahFull(shiftReturnTotal)}</span></div>
                   <div style={{ borderTop: "1.5px solid hsl(var(--border))", paddingTop: "12px", marginTop: "4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: "15px" }}>Uang di Laci:</span>
                      <span style={{ fontWeight: 900, fontSize: "20px", color: "hsl(var(--primary))" }}>{formatRupiahFull(activeShift.openingCash + tunaiTotal - shiftReturnTotal)}</span>
                   </div>
                 </div>
               </div>

               <div className="card" style={{ background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border))" }}>
                 <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px", borderBottom: "1px solid hsl(var(--border))", paddingBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                   📱 Transaksi Non-Tunai
                 </div>
                 <div style={{ display: "flex", justifyContent: "space-between" }}>
                   <span>Pembayaran QRIS/Digital:</span>
                   <span style={{ fontWeight: 700, color: "hsl(var(--primary))" }}>{formatRupiahFull(qrisTotal)}</span>
                 </div>
               </div>

               <div>
                 <button className="btn btn-ghost btn-block" onClick={() => setShowItemDetails(!showItemDetails)} style={{ fontSize: "13px", height: "40px" }}>
                   {showItemDetails ? "Hide Item Details ▲" : "Show Item Details & Stock Warnings ▼"}
                 </button>
                 
                 {showItemDetails && (
                   <div style={{ marginTop: "16px", display: "grid", gap: "16px", animation: "fadeIn 0.3s ease" }}>
                      <div className="card" style={{ padding: "16px", background: "hsl(var(--bg-card))" }}>
                        <div style={{ fontWeight: 800, fontSize: "13px", marginBottom: "12px", textTransform: "uppercase", color: "hsl(var(--text-secondary))" }}>📦 Barang Terjual ({soldItemsSummary.length})</div>
                        {soldItemsSummary.length === 0 ? <div style={{ fontSize: "13px", opacity: 0.6, padding: "10px", textAlign: "center" }}>Belum ada penjualan.</div> : null}
                        <div style={{ maxHeight: "200px", overflowY: "auto", display: "grid", gap: "8px" }}>
                          {soldItemsSummary.map(item => (
                            <div key={item.name} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", borderBottom: "1px solid hsl(var(--border) / 0.5)", paddingBottom: "6px" }}>
                              <span style={{ flex: 1 }}>{item.name} <span style={{ fontWeight: 700, color: "hsl(var(--primary))" }}>x{item.qty}</span></span>
                              <span style={{ fontWeight: 600 }}>{formatRupiahFull(item.subtotal)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {lowStockProducts.length > 0 && (
                        <div className="card" style={{ padding: "16px", background: "hsl(var(--error) / 0.05)", border: "1px solid hsl(var(--error) / 0.2)" }}>
                          <div style={{ fontWeight: 800, fontSize: "13px", marginBottom: "12px", textTransform: "uppercase", color: "hsl(var(--error))" }}>⚠️ Stok Menipis</div>
                          <div style={{ display: "grid", gap: "8px" }}>
                            {lowStockProducts.map(p => (
                              <div key={p.localId} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                                <span>{p.name}</span>
                                <span style={{ fontWeight: 800, color: "hsl(var(--error))" }}>{p.stock} {p.unit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                   </div>
                 )}
               </div>

               <div style={{ display: "grid", gap: "12px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                    <button className="btn btn-outline" onClick={sendRekapWa} style={{ flex: "1 1 120px", minHeight: "48px", height: "auto" }}>📲 WhatsApp</button>
                    <button className="btn btn-outline" onClick={handlePrintRekap} style={{ flex: "1 1 120px", minHeight: "48px", height: "auto" }}>🖨️ Cetak Struk</button>
                  </div>
                  <button className="btn btn-primary btn-lg" onClick={confirmCloseShift} style={{ height: "56px", fontSize: "18px", fontWeight: 900 }}>Tutup & Akhiri Shift</button>
                  <button className="btn btn-ghost" onClick={() => setShowShiftSummary(false)}>Batal</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {printRekapShift && (
        <div id="print-receipt" style={{ display: "none" }}>
          <div style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: "12px", width: "300px", margin: "0 auto", padding: "10px", color: "#000" }}>
            <div style={{ textAlign: "center", marginBottom: "15px" }}>
              <div style={{ fontSize: "16px", fontWeight: 800, textTransform: "uppercase" }}>REKAP SHIFT</div>
              <div style={{ fontSize: "14px", fontWeight: 800 }}>{storeName || "MbaKasir"}</div>
              {storeAddress && <div style={{ fontSize: "10px" }}>{storeAddress}</div>}
              <div style={{ borderTop: "1px dashed #000", marginTop: "10px", paddingTop: "5px", fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
                <span>Kasir: {user?.name || '-'}</span>
                <span>{new Date().toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
            <div style={{ borderTop: "1px dashed #000", borderBottom: "1px dashed #000", padding: "8px 0", display: "grid", gap: "4px", marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Modal Awal</span><span>{formatRupiahFull(activeShift?.openingCash || 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Total Tunai (+)</span><span>{formatRupiahFull(tunaiTotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Total Retur (-)</span><span>{formatRupiahFull(shiftReturnTotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, marginTop: "4px", borderTop: "1px solid #000", paddingTop: "4px", fontSize: "13px" }}>
                <span>KAS DI LACI</span><span>{formatRupiahFull((activeShift?.openingCash || 0) + tunaiTotal - shiftReturnTotal)}</span>
              </div>
            </div>
            <div style={{ display: "grid", gap: "4px", marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Non-Tunai (QRIS)</span><span>{formatRupiahFull(qrisTotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                <span>TOTAL OMZET</span><span>{formatRupiahFull((activeShift?.totalSales || 0))}</span>
              </div>
            </div>
            {soldItemsSummary.length > 0 && (
              <div style={{ marginBottom: "10px", borderTop: "1px dashed #000", paddingTop: "8px" }}>
                <div style={{ fontWeight: 800, marginBottom: "6px", textAlign: "center" }}>--- DETAIL PRODUK ---</div>
                {soldItemsSummary.map((item: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "2px" }}>
                    <span style={{ flex: 1 }}>{item.name} x{item.qty}</span>
                    <span>{formatRupiahFull(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ textAlign: "center", marginTop: "20px", borderTop: "1px dashed #000", paddingTop: "10px", fontSize: "10px" }}>
              Laporan Shift Selesai
            </div>
            <div style={{ textAlign: "center", fontSize: "9px", opacity: 0.5 }}>
              {brand?.footerPoweredByText || "Powered by MbaKasir Intelligence"}
            </div>
          </div>
        </div>
      )}

      {lastReceipt && (
        <div id="print-receipt" style={{ display: "none" }}>
          <div style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: "12px", width: "300px", margin: "0 auto", padding: "10px", color: "#000" }}>
            <div style={{ textAlign: "center", marginBottom: "15px" }}>
              <div style={{ fontSize: "16px", fontWeight: 800, textTransform: "uppercase" }}>{storeName || "MbaKasir"}</div>
              {storeAddress && <div style={{ fontSize: "11px", marginTop: "2px" }}>{storeAddress}</div>}
              {storePhone && <div style={{ fontSize: "11px" }}>Telp: {storePhone}</div>}
              <div style={{ borderTop: "1px dashed #000", marginTop: "10px", paddingTop: "5px", fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
                <span>{lastReceipt.invoiceNo}</span>
                <span>{new Date().toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
            <div style={{ marginBottom: "10px" }}>
              {lastReceipt.items.map((item: any, i: number) => (
                <div key={i} style={{ marginBottom: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                    <span>{item.qty} x {formatRupiahFull(item.price)}</span>
                    <span>{formatRupiahFull(item.price * item.qty)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: "1px dashed #000", paddingTop: "8px", display: "grid", gap: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Subtotal</span><span>{formatRupiahFull(lastReceipt.subtotal)}</span>
              </div>
              {lastReceipt.discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Diskon</span><span>-{formatRupiahFull(lastReceipt.discount)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "14px", marginTop: "4px", borderTop: "1px solid #000", paddingTop: "4px" }}>
                <span>TOTAL</span><span>{formatRupiahFull(lastReceipt.total)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginTop: "4px" }}>
                <span>Metode: {lastReceipt.method}</span>
                {lastReceipt.change > 0 && <span>Kembali: {formatRupiahFull(lastReceipt.change)}</span>}
              </div>
            </div>
            <div style={{ textAlign: "center", marginTop: "20px", borderTop: "1px dashed #000", paddingTop: "10px", fontSize: "11px", fontStyle: "italic" }}>
              {storeFooter || "Terima kasih atas kunjungan Anda!"}
            </div>
            {brand?.showFooterPoweredBy !== false && (
              <div style={{ textAlign: "center", marginTop: "10px", fontSize: "9px", opacity: 0.5 }}>
                {brand?.footerPoweredByText || "Powered by MbaKasir Intelligence"}
              </div>
            )}
          </div>
        </div>
      )}

      {showReturnSelector && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)", padding: "20px", backdropFilter: "blur(4px)" }}>
          <div className="card animate-slide-up" style={{ width: "100%", maxWidth: "500px", maxHeight: "80vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontWeight: 800 }}>Pilih Transaksi untuk Retur</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowReturnSelector(false)}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
              {sales.filter(s => s.status === "COMPLETED").slice(0, 20).map(sale => (
                <button 
                  key={sale.localId}
                  className="btn btn-ghost"
                  style={{ width: "100%", justifyContent: "space-between", marginBottom: "8px", height: "auto", padding: "12px", border: "1px solid hsl(var(--border))" }}
                  onClick={() => {
                    setReturnTargetId(sale.localId);
                    setShowReturnSelector(false);
                  }}
                >
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 700, fontSize: "13px" }}>{sale.invoiceNo}</div>
                    <div style={{ fontSize: "11px", opacity: 0.6 }}>{new Date(sale.createdAt).toLocaleString()}</div>
                  </div>
                  <div style={{ fontWeight: 800, color: "hsl(var(--primary))" }}>{formatRupiahFull(sale.totalAmount)}</div>
                </button>
              ))}
              {sales.filter(s => s.status === "COMPLETED").length === 0 && (
                <div style={{ padding: "40px", textAlign: "center", color: "hsl(var(--text-muted))" }}>
                  Belum ada transaksi yang bisa diretur.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {returnTargetId && currentSaleForReturn && (
        <SalesReturnModal 
          sale={currentSaleForReturn}
          items={currentItemsForReturn}
          currentCash={currentCashInDrawer}
          onClose={() => setReturnTargetId(null)}
          onSuccess={() => {
            setReturnTargetId(null);
            toast("Stok telah diperbarui.", "success");
          }}
        />
      )}
    </DashboardLayout>
  );
}
