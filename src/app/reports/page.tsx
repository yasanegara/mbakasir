"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatRupiahFull } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useAuth } from "@/contexts/AppProviders";

type OnlineOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

interface OnlineOrderItem {
  productId?: string | null;
  productName: string;
  quantity: number;
  subtotal: number;
}

interface OnlineOrder {
  id: string;
  totalAmount: number;
  status: OnlineOrderStatus;
  items: OnlineOrderItem[];
}

const REALIZED_ONLINE_ORDER_STATUSES = new Set<OnlineOrderStatus>([
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
]);

// ============================================================
// HALAMAN: LAPORAN (Laba Rugi & Pareto 80/20)
// CMO: Menampilkan performa toko secara instan dari lokal db
// ============================================================

export default function ReportsPage() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [period] = useState("Semua Waktu");
  const [activeTab, setActiveTab] = useState<"summary" | "pl" | "cashflow" | "balance">("summary");
  const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>([]);
  
  const sales = useLiveQuery(() => tenantId ? getDb().sales.where("tenantId").equals(tenantId).and(s => s.status === "COMPLETED").toArray() : [], [tenantId]) || [];
  const saleItems = useLiveQuery(() => tenantId ? getDb().saleItems.toArray() : [], [tenantId]) || [];
  const posTerminals = useLiveQuery(() => tenantId ? getDb().posTerminals.where("tenantId").equals(tenantId).toArray() : [], [tenantId]) || [];
  const products = useLiveQuery(() => tenantId ? getDb().products.where("tenantId").equals(tenantId).toArray() : [], [tenantId]) || [];
  const shoppingList = useLiveQuery(() => tenantId ? getDb().shoppingList.where("tenantId").equals(tenantId).and(s => s.status === "done").toArray() : [], [tenantId]) || [];
  const returns = useLiveQuery(() => tenantId ? getDb().salesReturns.where("tenantId").equals(tenantId).toArray() : [], [tenantId]) || [];
  const shifts = useLiveQuery(() => tenantId ? getDb().shifts.where("tenantId").equals(tenantId).toArray() : [], [tenantId]) || [];
  const allExpenses = useLiveQuery(() => tenantId ? getDb().expenses.where("tenantId").equals(tenantId).toArray() : [], [tenantId]) || [];
  const storeProfile = useLiveQuery(async () => {
    const pDefault = await getDb().storeProfile.get("default");
    if (!tenantId) return pDefault;
    const pTenant = await getDb().storeProfile.get(tenantId);
    return pTenant || pDefault;
  }, [tenantId]);
  
  const initialCapitalValue = useLiveQuery(async () => {
    const pDefault = await getDb().storeProfile.get("default");
    if (!tenantId) return pDefault?.initialCapital || 0;
    const pTenant = await getDb().storeProfile.get(tenantId);
    return pTenant?.initialCapital || pDefault?.initialCapital || 0;
  }, [tenantId]) || 0;
  const rawMaterials = useLiveQuery(() => tenantId ? getDb().rawMaterials.where("tenantId").equals(tenantId).toArray() : [], [tenantId]) || [];
  const allAssets = useLiveQuery(() => tenantId ? getDb().assets.where("tenantId").equals(tenantId).toArray() : [], [tenantId]) || [];
  const returnItems = useLiveQuery(() => tenantId ? getDb().salesReturnItems.toArray() : [], [tenantId]) || [];
  const initialCapital = initialCapitalValue;

  useEffect(() => {
    let cancelled = false;

    async function loadOnlineOrders() {
      try {
        const res = await fetch("/api/tenant/orders?status=ALL");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Gagal memuat pesanan online");
        }

        if (!cancelled) {
          setOnlineOrders(data.orders || []);
        }
      } catch (error) {
        console.error("Reports online orders error:", error);
        if (!cancelled) {
          setOnlineOrders([]);
        }
      }
    }

    void loadOnlineOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  const realizedOnlineOrders = useMemo(
    () => onlineOrders.filter((order) => REALIZED_ONLINE_ORDER_STATUSES.has(order.status)),
    [onlineOrders]
  );

  const productCostMap = useMemo(() => {
    const costMap = new Map<string, number>();

    for (const product of products) {
      costMap.set(product.id, product.costPrice);
      costMap.set(product.localId, product.costPrice);
    }

    return costMap;
  }, [products]);

  // ==========================
  // KALKULASI LABA / RUGI
  // ==========================
  const profitLoss = useMemo(() => {
    let revenue = 0;
    let cogs = 0; // Cost of Goods Sold (HPP)

    for (const sale of sales) {
      revenue += sale.totalAmount;
      // Cari items
      const itemsInSale = saleItems.filter(i => i.saleLocalId === sale.localId);
      for (const item of itemsInSale) {
         cogs += (item.costPrice * item.quantity);
      }
    }

    for (const order of realizedOnlineOrders) {
      revenue += Number(order.totalAmount);

      for (const item of order.items) {
        const matchedCost = item.productId ? productCostMap.get(item.productId) ?? 0 : 0;
        cogs += matchedCost * Number(item.quantity);
      }
    }

    const netProfit = revenue - cogs;
    const returnTotal = returns.reduce((sum, r) => sum + r.totalAmount, 0);
    
    // Kurangi COGS dari item yang dikembalikan (jika kondisi baik/masuk stok lagi)
    let returnedCogs = 0;
    for (const rItem of returnItems) {
      if (rItem.condition === "GOOD") {
        const cost = productCostMap.get(rItem.productId) || 0;
        returnedCogs += (cost * rItem.quantity);
      }
    }

    const finalRevenue = revenue - returnTotal;
    const finalCogs = cogs - returnedCogs;
    const finalNetProfit = finalRevenue - finalCogs;

    const expenseTotal = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    const bottomLine = finalNetProfit - expenseTotal;
    
    return { revenue: finalRevenue, cogs: finalCogs, netProfit: finalNetProfit, expenseTotal, bottomLine };
  }, [allExpenses, productCostMap, realizedOnlineOrders, saleItems, sales, returns, returnItems]);

  // ==========================
  // ANALISIS PARETO 80/20
  // ==========================
  // Prinsip: 80% revenue dihasilkan oleh 20% produk top
  const paretoAnalysis = useMemo(() => {
    const productSalesMap: Record<string, { name: string, revenue: number, qty: number }> = {};
    let totalRevenue = 0;

    for (const item of saleItems) {
       // Hanya hitung jika berada dalam "COMPLETED" sales (disederhanakan)
       const parentSale = sales.find(s => s.localId === item.saleLocalId);
       if (!parentSale) continue;

       if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = { name: item.productName, revenue: 0, qty: 0 };
       }
       productSalesMap[item.productId].revenue += item.subtotal;
       productSalesMap[item.productId].qty += item.quantity;
       totalRevenue += item.subtotal;
    }

    for (const order of realizedOnlineOrders) {
      for (const item of order.items) {
        const productKey = item.productId || item.productName;

        if (!productSalesMap[productKey]) {
          productSalesMap[productKey] = {
            name: item.productName,
            revenue: 0,
            qty: 0,
          };
        }

        productSalesMap[productKey].revenue += Number(item.subtotal);
        productSalesMap[productKey].qty += Number(item.quantity);
        totalRevenue += Number(item.subtotal);
      }
    }

    // Sort Descending berdasarkan revenue
    const sortedProducts = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue);
    
    // Kumulatif persen
    let cumulative = 0;
    return sortedProducts.map(p => {
       cumulative += p.revenue;
       const pct = totalRevenue === 0 ? 0 : (cumulative / totalRevenue) * 100;
       return { ...p, cumulativePct: pct };
    });
  }, [realizedOnlineOrders, saleItems, sales]);

  const posPerformance = useMemo(() => {
    const stats: Record<string, { name: string, revenue: number, count: number }> = {};
    for (const sale of sales) {
      const tid = sale.terminalId || "default";
      if (!stats[tid]) {
        const terminal = posTerminals.find(t => t.id === tid);
        stats[tid] = { name: terminal?.name || "Gudang Utama", revenue: 0, count: 0 };
      }
      stats[tid].revenue += sale.totalAmount;
      stats[tid].count += 1;
    }

    if (realizedOnlineOrders.length > 0) {
      stats.storefront = {
        name: "Storefront Online",
        revenue: realizedOnlineOrders.reduce(
          (sum, order) => sum + Number(order.totalAmount),
          0
        ),
        count: realizedOnlineOrders.length,
      };
    }

    return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
  }, [posTerminals, realizedOnlineOrders, sales]);

  // ==========================
  // ARUS KAS (CASH FLOW)
  // ==========================
  const cashFlow = useMemo(() => {
    const masuk = sales.reduce((sum, s) => sum + s.totalAmount, 0) + realizedOnlineOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const belanja = shoppingList.reduce((sum, item) => sum + (item.qtyToBuy * (item.costPrice || item.costPerUnit || 0)), 0);
    const retur = returns.reduce((sum, r) => sum + r.totalAmount, 0);
    const operasional = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    const pembelianAset = allAssets.reduce((sum, a) => sum + a.purchasePrice, 0);
    
    // Klasifikasi Arus Kas
    const operating = masuk - belanja - retur - operasional;
    const investing = -pembelianAset;
    const financing = initialCapital; // Kita asumsikan modal awal adalah pendanaan masuk di awal
    
    return { 
      masuk, belanja, retur, operasional, pembelianAset,
      operating,
      investing,
      financing,
      saldo: operating + investing + financing
    };
  }, [allExpenses, realizedOnlineOrders, returns, sales, shoppingList, allAssets, initialCapital]);

  // ==========================
  // NERACA (BALANCE SHEET)
  // ==========================
  const balanceSheet = useMemo(() => {
    // 1. EKUITAS (MODAL & LABA)
    // Modal Awal adalah angka yang diinput user sebagai total investasi awal
    const modalAwal = initialCapital;
    const labaBerjalan = profitLoss.bottomLine;
    const totalEkuitas = modalAwal + labaBerjalan;

    // 2. ASET (KEKAYAAN)
    // Nilai Persediaan & Aset Tetap saat ini
    const persediaanProduk = products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0);
    const persediaanBahan = rawMaterials.reduce((sum, m) => sum + (m.stock * m.costPerUnit), 0);
    const totalPersediaan = persediaanProduk + persediaanBahan;
    const asetTetap = allAssets.reduce((sum, a) => sum + a.purchasePrice, 0);
    
    // Kas dihitung sebagai penyeimbang (Balancer) agar Aset = Ekuitas
    // Kas = Total Ekuitas - Aset Non-Kas
    const kasSekarang = totalEkuitas - totalPersediaan - asetTetap;
    
    const totalAset = kasSekarang + totalPersediaan + asetTetap;

    // Check if HPP is missing
    const productHppMissing = products.some(p => p.stock > 0 && (!p.costPrice || p.costPrice === 0));
    const materialHppMissing = rawMaterials.some(m => m.stock > 0 && (!m.costPerUnit || m.costPerUnit === 0));

    return { 
      kasDiLaci: kasSekarang, 
      persediaan: totalPersediaan, 
      persediaanProduk,
      persediaanBahan,
      asetTetap, 
      totalAset, 
      modalAwal, 
      labaBerjalan, 
      totalEkuitas,
      productHppMissing,
      materialHppMissing
    };
  }, [initialCapital, products, rawMaterials, allAssets, profitLoss.bottomLine]);

  // ==========================
  // EXPORT FUNCTIONS
  // ==========================
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet Laba Rugi
    const plData = [
      ["LAPORAN LABA RUGI"],
      ["Periode", period],
      [],
      ["Keterangan", "Nilai"],
      ["Pendapatan (Revenue)", profitLoss.revenue],
      ["HPP (COGS)", profitLoss.cogs],
      ["Laba Kotor", profitLoss.netProfit],
      ["Biaya Operasional", profitLoss.expenseTotal],
      ["Laba Bersih", profitLoss.bottomLine],
    ];
    const wsPL = XLSX.utils.aoa_to_sheet(plData);
    XLSX.utils.book_append_sheet(wb, wsPL, "Laba Rugi");

    // Sheet Neraca
    const bsData = [
      ["LAPORAN NERACA (BALANCE SHEET)"],
      [],
      ["ASET"],
      ["Kas di Tangan", balanceSheet.kasDiLaci],
      ["Persediaan Barang", balanceSheet.persediaan],
      ["TOTAL ASET", balanceSheet.totalAset],
      [],
      ["EKUITAS"],
      ["Modal Pemilik", balanceSheet.modalAwal],
      ["Laba Berjalan", balanceSheet.labaBerjalan],
      ["TOTAL EKUITAS", balanceSheet.totalEkuitas],
    ];
    const wsBS = XLSX.utils.aoa_to_sheet(bsData);
    XLSX.utils.book_append_sheet(wb, wsBS, "Neraca");

    // Sheet Arus Kas
    const cfData = [
      ["LAPORAN ARUS KAS (CASH FLOW)"],
      ["Periode", period],
      [],
      ["A. AKTIVITAS OPERASI"],
      ["Pemasukan Penjualan", cashFlow.masuk],
      ["Pengeluaran Belanja Stok", -cashFlow.belanja],
      ["Biaya Operasional", -cashFlow.operasional],
      ["Retur Penjualan", -cashFlow.retur],
      ["Total Arus Kas Operasi", cashFlow.operating],
      [],
      ["B. AKTIVITAS INVESTASI"],
      ["Pembelian Aset Tetap", -cashFlow.pembelianAset],
      ["Total Arus Kas Investasi", cashFlow.investing],
      [],
      ["C. AKTIVITAS PENDANAAN"],
      ["Modal Awal Pemilik", cashFlow.financing],
      ["Total Arus Kas Pendanaan", cashFlow.financing],
      [],
      ["SALDO KAS AKHIR", cashFlow.saldo],
    ];
    const wsCF = XLSX.utils.aoa_to_sheet(cfData);
    XLSX.utils.book_append_sheet(wb, wsCF, "Arus Kas");

    XLSX.writeFile(wb, `Laporan_Mbakasir_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("LAPORAN KEUANGAN MBAKASIR", 14, 15);
    doc.setFontSize(10);
    doc.text(`Periode: ${period} | Dicetak: ${new Date().toLocaleString()}`, 14, 22);

    // Laba Rugi Table
    autoTable(doc, {
      startY: 30,
      head: [["LAPORAN LABA RUGI", "NILAI"]],
      body: [
        ["Pendapatan Kotor", formatRupiahFull(profitLoss.revenue)],
        ["Harga Pokok Penjualan (HPP)", formatRupiahFull(profitLoss.cogs)],
        ["Laba Kotor", formatRupiahFull(profitLoss.netProfit)],
        ["Biaya Operasional", formatRupiahFull(profitLoss.expenseTotal)],
        ["Laba Bersih (Final)", formatRupiahFull(profitLoss.bottomLine)],
      ],
      theme: "striped",
    });

    // Neraca Table
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [["NERACA (BALANCE SHEET)", "NILAI"]],
      body: [
        ["ASET: Kas & Setara Kas", formatRupiahFull(balanceSheet.kasDiLaci)],
        ["ASET: Persediaan Barang", formatRupiahFull(balanceSheet.persediaan)],
        ["TOTAL ASET", formatRupiahFull(balanceSheet.totalAset)],
        ["---", "---"],
        ["EKUITAS: Modal", formatRupiahFull(balanceSheet.modalAwal)],
        ["EKUITAS: Laba Ditahan", formatRupiahFull(balanceSheet.labaBerjalan)],
        ["TOTAL EKUITAS", formatRupiahFull(balanceSheet.totalEkuitas)],
      ],
      theme: "grid",
    });

    // Arus Kas Table
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [["LAPORAN ARUS KAS (CASH FLOW)", "NILAI"]],
      body: [
        ["A. AKTIVITAS OPERASI", ""],
        ["   Pemasukan Penjualan", formatRupiahFull(cashFlow.masuk)],
        ["   Pengeluaran Belanja Stok", `(${formatRupiahFull(cashFlow.belanja)})`],
        ["   Biaya Operasional", `(${formatRupiahFull(cashFlow.operasional)})`],
        ["   Retur Penjualan", `(${formatRupiahFull(cashFlow.retur)})`],
        ["   Total Arus Kas Operasi", formatRupiahFull(cashFlow.operating)],
        ["B. AKTIVITAS INVESTASI", ""],
        ["   Pembelian Aset Tetap", `(${formatRupiahFull(cashFlow.pembelianAset)})`],
        ["   Total Arus Kas Investasi", formatRupiahFull(cashFlow.investing)],
        ["C. AKTIVITAS PENDANAAN", ""],
        ["   Modal Awal Pemilik", formatRupiahFull(cashFlow.financing)],
        ["   Total Arus Kas Pendanaan", formatRupiahFull(cashFlow.financing)],
        ["SALDO KAS AKHIR", formatRupiahFull(cashFlow.saldo)],
      ],
      theme: "striped",
    });

    doc.save(`Laporan_Keuangan_${new Date().getTime()}.pdf`);
  };

  return (
    <DashboardLayout title={`Laporan Keuangan`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", gap: "8px", background: "hsl(var(--bg-elevated))", padding: "4px", borderRadius: "12px", border: "1px solid hsl(var(--border))" }}>
          {[
            { id: "summary", label: "Ringkasan", icon: "📊" },
            { id: "pl", label: "Laba Rugi", icon: "💰" },
            { id: "cashflow", label: "Arus Kas", icon: "💸" },
            { id: "balance", label: "Neraca", icon: "⚖️" },
          ].map(tab => (
            <button 
              key={tab.id}
              className={`btn btn-sm ${activeTab === tab.id ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab(tab.id as any)}
              style={{ borderRadius: "8px" }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-outline btn-sm" onClick={exportToExcel}>📗 Excel</button>
          <button className="btn btn-primary btn-sm" onClick={exportToPDF}>📕 PDF</button>
        </div>
      </div>

      {activeTab === "summary" && (
        <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginBottom: "30px" }}>
        
        {/* REVENUE CARD */}
        <div className="stat-card" style={{ borderLeft: "4px solid hsl(var(--primary))" }}>
           <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>Total Pendapatan (Omzet)</span>
           <span className="stat-value" style={{ color: "hsl(var(--primary))", background: "none", WebkitTextFillColor: "hsl(var(--primary))" }}>
              {formatRupiahFull(profitLoss.revenue)}
           </span>
           <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "8px" }}>
             Dari {sales.length + realizedOnlineOrders.length} transaksi selesai
           </span>
        </div>

        {/* COGS CARD */}
        <div className="stat-card" style={{ borderLeft: "4px solid hsl(var(--warning))" }}>
           <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>Harga Pokok Penjualan (HPP)</span>
           <span className="stat-value" style={{ color: "hsl(var(--warning))", background: "none", WebkitTextFillColor: "hsl(var(--warning))" }}>
              {formatRupiahFull(profitLoss.cogs)}
           </span>
           <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "8px" }}>Modal keluar</span>
        </div>

        {/* PROFIT CARD */}
        <div className="stat-card" style={{ background: "var(--gradient-primary)" }}>
           <span style={{ fontSize: "14px", color: "white", opacity: 0.9, fontWeight: 600 }}>Laba Bersih (Net Profit)</span>
           <span className="stat-value" style={{ color: "white", WebkitTextFillColor: "white", textShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
              {formatRupiahFull(profitLoss.bottomLine)}
           </span>
           <span style={{ fontSize: "12px", color: "white", opacity: 0.8, marginTop: "8px" }}>Margin: {profitLoss.revenue === 0 ? "0" : Math.round((profitLoss.bottomLine / profitLoss.revenue) * 100)}%</span>
        </div>

      </div>

      {/* POS PERFORMANCE BREAKDOWN */}
      <div style={{ marginBottom: "30px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          🖥️ Performa per POS Terminal
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          {posPerformance.map((p, i) => (
            <div key={i} className="card" style={{ padding: "16px", borderLeft: "4px solid hsl(var(--primary))" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>{p.name}</div>
              <div style={{ fontSize: "20px", fontWeight: 800, margin: "8px 0", color: "hsl(var(--primary))" }}>{formatRupiahFull(p.revenue)}</div>
              <div style={{ fontSize: "11px", color: "hsl(var(--text-muted))" }}>{p.count} Transaksi Berhasil</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
         <div style={{ padding: "20px", borderBottom: "1px solid hsl(var(--border))" }}>
            <h2 style={{ fontSize: "18px" }}>Analisis Pareto 80/20 (Produk Terlaris)</h2>
            <p style={{ fontSize: "13px", color: "hsl(var(--text-secondary))" }}>Produk mana saja yang menghasilkan 80% pemasukan toko?</p>
         </div>

         <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border))" }}>
              <tr>
                 <th style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Nama Produk</th>
                 <th style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Qty Terjual</th>
                 <th style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Revenue</th>
                 <th style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))", textAlign: "right" }}>% Kumulatif</th>
              </tr>
            </thead>
            <tbody>
              {paretoAnalysis.length === 0 ? (
                 <tr>
                    <td colSpan={4} style={{ padding: "30px", textAlign: "center", color: "hsl(var(--text-muted))" }}>Belum ada data penjualan valid.</td>
                 </tr>
              ) : (
                 paretoAnalysis.map((p, index) => {
                    const isTop80 = p.cumulativePct <= 80;
                    return (
                       <tr key={index} style={{ borderBottom: "1px solid hsl(var(--border))", background: isTop80 ? "hsl(var(--primary) / 0.05)" : "transparent" }}>
                          <td style={{ padding: "14px 20px", fontSize: "14px", fontWeight: isTop80 ? 700 : 500 }}>
                            {p.name}
                            {isTop80 && <span className="badge badge-success" style={{ marginLeft: "8px" }}>Pilar Kas</span>}
                          </td>
                          <td style={{ padding: "14px 20px", fontSize: "14px" }}>{p.qty}</td>
                          <td style={{ padding: "14px 20px", fontSize: "14px", fontWeight: 600 }}>{formatRupiahFull(p.revenue)}</td>
                          <td style={{ padding: "14px 20px", fontSize: "14px", textAlign: "right", color: isTop80 ? "hsl(var(--success))" : "hsl(var(--text-secondary))" }}>
                             {p.cumulativePct.toFixed(1)}%
                          </td>
                       </tr>
                    );
                 })
              )}
            </tbody>
         </table>
      </div>
        </>
      )}

      {activeTab === "pl" && (
        <div className="card" style={{ maxWidth: "600px", margin: "0 auto", padding: "40px" }}>
           <h2 style={{ textAlign: "center", marginBottom: "30px", fontSize: "24px", fontWeight: 900 }}>LAPORAN LABA RUGI</h2>
           <div style={{ display: "grid", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", borderBottom: "1px solid hsl(var(--border))", paddingBottom: "10px" }}>
                 <span style={{ fontWeight: 600 }}>Pendapatan Kotor (Omzet)</span>
                 <span style={{ color: "hsl(var(--success))", fontWeight: 800 }}>{formatRupiahFull(profitLoss.revenue)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", borderBottom: "1px solid hsl(var(--border))", paddingBottom: "10px" }}>
                 <span style={{ fontWeight: 600 }}>Harga Pokok Penjualan (HPP)</span>
                 <span style={{ color: "hsl(var(--error))", fontWeight: 800 }}>({formatRupiahFull(profitLoss.cogs)})</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", borderBottom: "1px solid hsl(var(--border))", paddingBottom: "10px" }}>
                 <span style={{ fontWeight: 600 }}>Biaya Operasional</span>
                 <span style={{ color: "hsl(var(--error))", fontWeight: 800 }}>({formatRupiahFull(profitLoss.expenseTotal)})</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "22px", marginTop: "20px", background: "hsl(var(--primary)/0.05)", padding: "16px", borderRadius: "12px" }}>
                 <span style={{ fontWeight: 800 }}>LABA BERSIH</span>
                 <span style={{ color: "hsl(var(--primary))", fontWeight: 900 }}>{formatRupiahFull(profitLoss.bottomLine)}</span>
              </div>
           </div>
        </div>
      )}

      {activeTab === "cashflow" && (
        <div className="card" style={{ maxWidth: "600px", margin: "0 auto", padding: "40px" }}>
           <h2 style={{ textAlign: "center", marginBottom: "30px", fontSize: "24px", fontWeight: 900 }}>LAPORAN ARUS KAS</h2>
           
           {/* OPERATING */}
           <div style={{ marginBottom: "24px" }}>
             <h3 style={{ fontSize: "14px", fontWeight: 800, color: "hsl(var(--primary))", borderBottom: "2px solid hsl(var(--primary))", marginBottom: "12px" }}>
               A. AKTIVITAS OPERASI (OPERATING)
             </h3>
             <div style={{ display: "grid", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Pemasukan Penjualan</span><span style={{ color: "hsl(var(--success))" }}>{formatRupiahFull(cashFlow.masuk)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Pengeluaran Belanja Stok</span><span style={{ color: "hsl(var(--error))" }}>({formatRupiahFull(cashFlow.belanja)})</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Biaya Operasional</span><span style={{ color: "hsl(var(--error))" }}>({formatRupiahFull(cashFlow.operasional)})</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Retur Penjualan</span><span style={{ color: "hsl(var(--error))" }}>({formatRupiahFull(cashFlow.retur)})</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: "1px solid hsl(var(--border))", paddingTop: "8px", marginTop: "4px" }}>
                  <span>Total Arus Kas Operasi</span>
                  <span style={{ color: cashFlow.operating >= 0 ? "hsl(var(--success))" : "hsl(var(--error))" }}>{formatRupiahFull(cashFlow.operating)}</span>
                </div>
             </div>
           </div>

           {/* INVESTING */}
           <div style={{ marginBottom: "24px" }}>
             <h3 style={{ fontSize: "14px", fontWeight: 800, color: "hsl(var(--warning))", borderBottom: "2px solid hsl(var(--warning))", marginBottom: "12px" }}>
               B. AKTIVITAS INVESTASI (INVESTING)
             </h3>
             <div style={{ display: "grid", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Pembelian Aset Tetap</span><span style={{ color: "hsl(var(--error))" }}>({formatRupiahFull(cashFlow.pembelianAset)})</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: "1px solid hsl(var(--border))", paddingTop: "8px", marginTop: "4px" }}>
                  <span>Total Arus Kas Investasi</span>
                  <span style={{ color: cashFlow.investing >= 0 ? "hsl(var(--success))" : "hsl(var(--error))" }}>{formatRupiahFull(cashFlow.investing)}</span>
                </div>
             </div>
           </div>

           {/* FINANCING */}
           <div style={{ marginBottom: "24px" }}>
             <h3 style={{ fontSize: "14px", fontWeight: 800, color: "hsl(var(--success))", borderBottom: "2px solid hsl(var(--success))", marginBottom: "12px" }}>
               C. AKTIVITAS PENDANAAN (FINANCING)
             </h3>
             <div style={{ display: "grid", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Modal Awal Pemilik</span><span style={{ color: "hsl(var(--success))" }}>{formatRupiahFull(cashFlow.financing)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: "1px solid hsl(var(--border))", paddingTop: "8px", marginTop: "4px" }}>
                  <span>Total Arus Kas Pendanaan</span>
                  <span style={{ color: cashFlow.financing >= 0 ? "hsl(var(--success))" : "hsl(var(--error))" }}>{formatRupiahFull(cashFlow.financing)}</span>
                </div>
             </div>
           </div>

           {/* SALDO AKHIR */}
           <div style={{ display: "flex", justifyContent: "space-between", fontSize: "22px", marginTop: "20px", background: "hsl(var(--success)/0.05)", padding: "16px", borderRadius: "12px", border: "2px solid hsl(var(--success)/0.2)" }}>
              <span style={{ fontWeight: 800 }}>SALDO KAS AKHIR</span>
              <span style={{ color: "hsl(var(--success))", fontWeight: 900 }}>{formatRupiahFull(cashFlow.saldo)}</span>
           </div>
        </div>
      )}

      {activeTab === "balance" && (
        <div className="card" style={{ maxWidth: "600px", margin: "0 auto", padding: "40px" }}>
           <h2 style={{ textAlign: "center", marginBottom: "30px", fontSize: "24px", fontWeight: 900 }}>LAPORAN NERACA</h2>
           
           <div style={{ marginBottom: "30px" }}>
             <h3 style={{ fontSize: "14px", fontWeight: 800, color: "hsl(var(--primary))", marginBottom: "12px", borderBottom: "2px solid hsl(var(--primary))" }}>ASET (KEKAYAAN)</h3>
             <div style={{ display: "grid", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Kas di Tangan / Laci</span><span>{formatRupiahFull(balanceSheet.kasDiLaci)}</span></div>
                 <div style={{ display: "flex", justifyContent: "space-between" }}>
                   <span>Persediaan Barang (Nilai Modal)</span>
                   <div style={{ textAlign: "right" }}>
                     <div>{formatRupiahFull(balanceSheet.persediaan)}</div>
                     {balanceSheet.productHppMissing && (
                       <div style={{ fontSize: "10px", color: "hsl(var(--error))", fontWeight: 600 }}>⚠️ Sebagian produk belum ada HPP</div>
                     )}
                     {balanceSheet.materialHppMissing && (
                       <div style={{ fontSize: "10px", color: "hsl(var(--error))", fontWeight: 600 }}>⚠️ Sebagian bahan belum ada HPP</div>
                     )}
                   </div>
                 </div>
                 <div style={{ display: "flex", justifyContent: "space-between" }}><span>Aset Tetap (Peralatan/Mesin)</span><span>{formatRupiahFull(balanceSheet.asetTetap)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "18px", marginTop: "10px", borderTop: "1px solid hsl(var(--border))", paddingTop: "10px" }}>
                  <span>TOTAL ASET</span><span>{formatRupiahFull(balanceSheet.totalAset)}</span>
                </div>
             </div>
           </div>

           <div>
             <h3 style={{ fontSize: "14px", fontWeight: 800, color: "hsl(var(--success))", marginBottom: "12px", borderBottom: "2px solid hsl(var(--success))" }}>EKUITAS (MODAL & LABA)</h3>
             <div style={{ display: "grid", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Modal Awal (Tunai + Stok + Aset)</span>
                  <span>{formatRupiahFull(balanceSheet.modalAwal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Laba Berjalan</span>
                  <span style={{ color: balanceSheet.labaBerjalan >= 0 ? "hsl(var(--success))" : "hsl(var(--error))", fontWeight: 700 }}>
                    {formatRupiahFull(balanceSheet.labaBerjalan)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "18px", marginTop: "10px", borderTop: "1px solid hsl(var(--border))", paddingTop: "10px" }}>
                  <span>TOTAL EKUITAS</span><span>{formatRupiahFull(balanceSheet.totalEkuitas)}</span>
                </div>
             </div>
           </div>

           <div style={{ marginTop: "40px", padding: "12px", background: "hsl(var(--bg-elevated))", borderRadius: "8px", textAlign: "center", fontSize: "12px", color: "hsl(var(--text-muted))", border: "1px dashed hsl(var(--border))" }}>
             Neraca Seimbang: Aset = Liabilitas + Ekuitas
           </div>
        </div>
      )}
    </DashboardLayout>
  );
}
