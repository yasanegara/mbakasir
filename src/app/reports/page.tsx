"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  calculateBalanceSheetSnapshot,
  calculateCashFlowSnapshot,
  calculateProfitLossSnapshot,
} from "@/lib/accounting";
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
  const saleItems = useLiveQuery(async () => {
    if (!tenantId) return [];
    const db = getDb();
    const saleIds = await db.sales.where("tenantId").equals(tenantId).primaryKeys();
    return db.saleItems.where("saleLocalId").anyOf(saleIds).toArray();
  }, [tenantId]) || [];
  const posTerminals = useLiveQuery(() => tenantId ? getDb().posTerminals.where("tenantId").equals(tenantId).toArray() : [], [tenantId]) || [];
  const products = useLiveQuery(() => tenantId ? getDb().products.where("tenantId").equals(tenantId).toArray() : [], [tenantId]) || [];
  const productAssignments = useLiveQuery(async () => {
    if (!tenantId) return [];
    const tenantProducts = await getDb().products.where("tenantId").equals(tenantId).toArray();
    const productIds = tenantProducts.map((product) => product.localId);
    if (productIds.length === 0) return [];
    return getDb().productAssignments.where("productId").anyOf(productIds).toArray();
  }, [tenantId]) || [];
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
  const rawMaterials = useLiveQuery(() => tenantId ? getDb().rawMaterials.where("tenantId").equals(tenantId).toArray() : [], [tenantId]) || [];
  const allAssets = useLiveQuery(() => tenantId ? getDb().assets.where("tenantId").equals(tenantId).toArray() : [], [tenantId]) || [];
  const returnItems = useLiveQuery(async () => {
    if (!tenantId || returns.length === 0) return [];
    const returnIds = returns.map((entry) => entry.localId);
    return getDb().salesReturnItems.where("returnLocalId").anyOf(returnIds).toArray();
  }, [tenantId, returns]) || [];
  const activeAssets = useMemo(
    () => allAssets.filter((asset) => !asset.archivedAt),
    [allAssets]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadOnlineOrders() {
      try {
        const res = await fetch("/api/tenant/orders?status=ALL");
        // 403 = role tidak punya akses ke storefront (misal SUPERADMIN) — skip senyap
        if (res.status === 403) return;
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
  const realizedOnlineRevenue = useMemo(
    () =>
      realizedOnlineOrders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0
      ),
    [realizedOnlineOrders]
  );

  // ==========================
  // KALKULASI LABA / RUGI
  // ==========================
  const profitLoss = useMemo(() => {
    return calculateProfitLossSnapshot({
      sales,
      saleItems,
      expenses: allExpenses,
      returns,
      returnItems,
      onlineRevenue: realizedOnlineRevenue,
      onlineOrderCount: realizedOnlineOrders.length,
    });
  }, [
    allExpenses,
    realizedOnlineOrders.length,
    realizedOnlineRevenue,
    returnItems,
    returns,
    saleItems,
    sales,
  ]);

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

    return sortedProducts.reduce<{
      cumulativeRevenue: number;
      items: Array<typeof sortedProducts[number] & { cumulativePct: number }>;
    }>(
      (state, product) => {
        const cumulativeRevenue = state.cumulativeRevenue + product.revenue;
        const cumulativePct =
          totalRevenue === 0 ? 0 : (cumulativeRevenue / totalRevenue) * 100;

        return {
          cumulativeRevenue,
          items: [
            ...state.items,
            {
              ...product,
              cumulativePct,
            },
          ],
        };
      },
      { cumulativeRevenue: 0, items: [] }
    ).items;
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
    return calculateCashFlowSnapshot({
      storeProfile,
      sales,
      expenses: allExpenses,
      returns,
      assets: allAssets,
      stockPurchases: shoppingList,
      onlineRevenue: realizedOnlineRevenue,
      onlineOrderCount: realizedOnlineOrders.length,
    });
  }, [
    allAssets,
    allExpenses,
    realizedOnlineOrders.length,
    realizedOnlineRevenue,
    returns,
    sales,
    shoppingList,
    storeProfile,
  ]);

  // ==========================
  // NERACA (BALANCE SHEET)
  // ==========================
  const balanceSnapshot = useMemo(() => {
    const assignedQtyByProduct = productAssignments.reduce<Map<string, number>>((acc, assignment) => {
      acc.set(
        assignment.productId,
        (acc.get(assignment.productId) ?? 0) + assignment.stock
      );
      return acc;
    }, new Map());

    // Check if HPP is missing
    const productHppMissing = products.some((product) => {
      const totalQty =
        product.stock + (assignedQtyByProduct.get(product.localId) ?? 0);
      return totalQty > 0 && (!product.costPrice || product.costPrice === 0);
    });
    const materialHppMissing = rawMaterials.some(m => m.stock > 0 && (!m.costPerUnit || m.costPerUnit === 0));
    const snapshot = calculateBalanceSheetSnapshot({
      storeProfile,
      sales,
      saleItems,
      expenses: allExpenses,
      returns,
      returnItems,
      assets: allAssets,
      stockPurchases: shoppingList,
      products,
      productAssignments,
      rawMaterials,
      currentAssets: activeAssets,
      onlineRevenue: realizedOnlineRevenue,
      onlineOrderCount: realizedOnlineOrders.length,
    });

    return { 
      kasDiLaci: snapshot.endingCash,
      kasDigital: snapshot.endingDigitalCash,
      piutangUsaha: snapshot.endingReceivables,
      asetLancar: snapshot.totalCurrentAssets,
      liabilitasTercatat: snapshot.recordedLiabilities,
      persediaan: snapshot.totalInventory,
      persediaanProduk: snapshot.productInventory,
      persediaanProdukGudang: snapshot.warehouseProductInventory,
      persediaanProdukTerminal: snapshot.terminalProductInventory,
      persediaanBahan: snapshot.materialInventory,
      asetTetap: snapshot.totalFixedAssets,
      totalAset: snapshot.totalAssets,
      modalAwal: snapshot.openingEquity,
      modalTunaiAwal: snapshot.openingCash,
      modalNonTunaiAwal: snapshot.openingNonCashCapital,
      labaBerjalan: snapshot.profitBottomLine,
      referensiEkuitas: snapshot.referenceEquity,
      totalEkuitas: snapshot.totalEquity,
      selisihRekonsiliasi: snapshot.equityGap,
      persediaanRollforward: snapshot.expectedInventory,
      selisihPersediaan: snapshot.inventoryGap,
      setupType: snapshot.setupType,
      productHppMissing,
      materialHppMissing,
      onlineRevenueTambahan: snapshot.supplementalOnlineRevenue,
      onlineOrderTambahanCount: snapshot.supplementalOnlineOrderCount,
      diagnostics: snapshot.diagnostics,
    };
  }, [
    allAssets,
    activeAssets,
    allExpenses,
    productAssignments,
    products,
    rawMaterials,
    realizedOnlineOrders.length,
    realizedOnlineRevenue,
    returnItems,
    returns,
    saleItems,
    sales,
    shoppingList,
    storeProfile,
  ]);

  const balanceSheet = balanceSnapshot;

  const reconciliationGapLabel = "Selisih Rekonsiliasi Data";
  const reconciliationGapHint =
    "Ini bukan akun penyeimbang. Angka ini hanya menunjukkan bahwa aset tercatat belum sepenuhnya bisa dijelaskan oleh modal awal dan laba berjalan yang berhasil dibuktikan dari transaksi.";

  const inventoryGapHint =
    "Jika selisih persediaan tidak nol, biasanya ada opname manual, koreksi stok, model BoM hybrid, atau transaksi lama yang belum lengkap.";

  const reportDiagnostics = balanceSheet.diagnostics;

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
      ["Pendapatan POS Tercatat", profitLoss.grossSales],
      ["Retur Penjualan", -profitLoss.salesReturns],
      ["Pendapatan Bersih POS", profitLoss.revenue],
      ["HPP POS Tercatat", profitLoss.cogs],
      ["Laba Kotor", profitLoss.netProfit],
      ["Biaya Operasional", profitLoss.expenseTotal],
      ["Laba Bersih", profitLoss.bottomLine],
      ...(profitLoss.supplementalOnlineRevenue > 0
        ? [
            [],
            [
              "Catatan",
              `${profitLoss.supplementalOnlineOrderCount} pesanan online senilai ${formatRupiahFull(
                profitLoss.supplementalOnlineRevenue
              )} belum masuk laba rugi inti`,
            ],
          ]
        : []),
    ];
    const wsPL = XLSX.utils.aoa_to_sheet(plData);
    XLSX.utils.book_append_sheet(wb, wsPL, "Laba Rugi");

    // Sheet Neraca
    const bsData = [
      ["LAPORAN NERACA (BALANCE SHEET)"],
      [],
      ["ASET"],
      ["Kas Laci Tercatat", balanceSheet.kasDiLaci],
      ["Saldo Digital / Bank Tercatat", balanceSheet.kasDigital],
      ["Piutang Usaha", balanceSheet.piutangUsaha],
      ["Persediaan Barang", balanceSheet.persediaan],
      ["Aset Tetap Bruto", balanceSheet.asetTetap],
      ["TOTAL ASET", balanceSheet.totalAset],
      [],
      ["LIABILITAS"],
      ["Liabilitas Tercatat", balanceSheet.liabilitasTercatat],
      [],
      ["EKUITAS"],
      ["Ekuitas Residu dari Aset Tercatat", balanceSheet.totalEkuitas],
      ["Modal Awal Tercatat", balanceSheet.modalAwal],
      ["Laba Berjalan Tercatat", balanceSheet.labaBerjalan],
      ...(balanceSheet.selisihRekonsiliasi !== 0
        ? [[reconciliationGapLabel, balanceSheet.selisihRekonsiliasi]]
        : []),
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
      ["Pemasukan Penjualan Tunai", cashFlow.cashSalesInflow],
      ["Pengeluaran Belanja Stok", -cashFlow.stockPurchases],
      ["Biaya Operasional", -cashFlow.operatingExpenses],
      ["Retur Penjualan", -cashFlow.salesReturns],
      ["Total Arus Kas Operasi", cashFlow.operating],
      [],
      ["B. AKTIVITAS INVESTASI"],
      ["Pembelian Aset Tetap", -cashFlow.assetPurchases],
      ["Total Arus Kas Investasi", cashFlow.investing],
      [],
      ["C. AKTIVITAS PENDANAAN"],
      ["Modal Tunai Awal Pemilik", cashFlow.financing],
      ...(cashFlow.openingNonCashCapital > 0
        ? [["Modal Non-Tunai Awal (Info)", cashFlow.openingNonCashCapital]]
        : []),
      ["Total Arus Kas Pendanaan", cashFlow.financing],
      [],
      ["D. SALDO NON-TUNAI TERCATAT"],
      ["QRIS / Transfer", cashFlow.endingDigitalCash],
      ["Piutang Kredit", cashFlow.endingReceivables],
      [],
      ["KAS LACI AKHIR", cashFlow.endingCash],
      ["LIKUIDITAS TERCATAT", cashFlow.endingLiquidity],
    ];
    const wsCF = XLSX.utils.aoa_to_sheet(cfData);
    XLSX.utils.book_append_sheet(wb, wsCF, "Arus Kas");

    XLSX.writeFile(wb, `Laporan_Mbakasir_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pdfDoc = doc as jsPDF & {
      lastAutoTable?: {
        finalY?: number;
      };
    };
    doc.text("LAPORAN KEUANGAN MBAKASIR", 14, 15);
    doc.setFontSize(10);
    doc.text(`Periode: ${period} | Dicetak: ${new Date().toLocaleString()}`, 14, 22);

    // Laba Rugi Table
    autoTable(doc, {
      startY: 30,
      head: [["LAPORAN LABA RUGI", "NILAI"]],
      body: [
        ["Pendapatan POS Tercatat", formatRupiahFull(profitLoss.grossSales)],
        ["Retur Penjualan", `(${formatRupiahFull(profitLoss.salesReturns)})`],
        ["Pendapatan Bersih POS", formatRupiahFull(profitLoss.revenue)],
        ["Harga Pokok Penjualan (HPP)", formatRupiahFull(profitLoss.cogs)],
        ["Laba Kotor", formatRupiahFull(profitLoss.netProfit)],
        ["Biaya Operasional", formatRupiahFull(profitLoss.expenseTotal)],
        ["Laba Bersih (Final)", formatRupiahFull(profitLoss.bottomLine)],
        ...(profitLoss.supplementalOnlineRevenue > 0
          ? [[
              "Catatan",
              `${profitLoss.supplementalOnlineOrderCount} pesanan online belum masuk laba rugi inti`,
            ]]
          : []),
      ],
      theme: "striped",
    });

    // Neraca Table
    autoTable(doc, {
      startY: (pdfDoc.lastAutoTable?.finalY ?? 30) + 15,
      head: [["NERACA (BALANCE SHEET)", "NILAI"]],
      body: [
        ["ASET: Kas Laci Tercatat", formatRupiahFull(balanceSheet.kasDiLaci)],
        ["ASET: Saldo Digital / Bank Tercatat", formatRupiahFull(balanceSheet.kasDigital)],
        ["ASET: Piutang Usaha", formatRupiahFull(balanceSheet.piutangUsaha)],
        ["ASET: Persediaan Barang", formatRupiahFull(balanceSheet.persediaan)],
        ["ASET: Aset Tetap Bruto", formatRupiahFull(balanceSheet.asetTetap)],
        ["TOTAL ASET", formatRupiahFull(balanceSheet.totalAset)],
        ["---", "---"],
        ["LIABILITAS: Tercatat", formatRupiahFull(balanceSheet.liabilitasTercatat)],
        ["EKUITAS: Residu Aset Tercatat", formatRupiahFull(balanceSheet.totalEkuitas)],
        ["REF: Modal Awal", formatRupiahFull(balanceSheet.modalAwal)],
        ["REF: Laba Berjalan", formatRupiahFull(balanceSheet.labaBerjalan)],
        ...(balanceSheet.selisihRekonsiliasi !== 0
          ? [[`REF: ${reconciliationGapLabel}`, formatRupiahFull(balanceSheet.selisihRekonsiliasi)]]
          : []),
        ["TOTAL EKUITAS", formatRupiahFull(balanceSheet.totalEkuitas)],
      ],
      theme: "grid",
    });

    // Arus Kas Table
    autoTable(doc, {
      startY: (pdfDoc.lastAutoTable?.finalY ?? 30) + 15,
      head: [["LAPORAN ARUS KAS (CASH FLOW)", "NILAI"]],
      body: [
        ["A. AKTIVITAS OPERASI", ""],
        ["   Pemasukan Penjualan Tunai", formatRupiahFull(cashFlow.cashSalesInflow)],
        ["   Pengeluaran Belanja Stok", `(${formatRupiahFull(cashFlow.stockPurchases)})`],
        ["   Biaya Operasional", `(${formatRupiahFull(cashFlow.operatingExpenses)})`],
        ["   Retur Penjualan", `(${formatRupiahFull(cashFlow.salesReturns)})`],
        ["   Total Arus Kas Operasi", formatRupiahFull(cashFlow.operating)],
        ["B. AKTIVITAS INVESTASI", ""],
        ["   Pembelian Aset Tetap", `(${formatRupiahFull(cashFlow.assetPurchases)})`],
        ["   Total Arus Kas Investasi", formatRupiahFull(cashFlow.investing)],
        ["C. AKTIVITAS PENDANAAN", ""],
        ["   Modal Tunai Awal Pemilik", formatRupiahFull(cashFlow.financing)],
        ...(cashFlow.openingNonCashCapital > 0
          ? [["   Modal Non-Tunai Awal (Info)", formatRupiahFull(cashFlow.openingNonCashCapital)]]
          : []),
        ["   Total Arus Kas Pendanaan", formatRupiahFull(cashFlow.financing)],
        ["D. SALDO NON-TUNAI TERCATAT", ""],
        ["   QRIS / Transfer", formatRupiahFull(cashFlow.endingDigitalCash)],
        ["   Piutang Kredit", formatRupiahFull(cashFlow.endingReceivables)],
        ["KAS LACI AKHIR", formatRupiahFull(cashFlow.endingCash)],
        ["LIKUIDITAS TERCATAT", formatRupiahFull(cashFlow.endingLiquidity)],
      ],
      theme: "striped",
    });

    doc.save(`Laporan_Keuangan_${new Date().getTime()}.pdf`);
  };

  return (
    <DashboardLayout title={`Laporan Keuangan`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", gap: "8px", background: "hsl(var(--bg-elevated))", padding: "4px", borderRadius: "12px", border: "1px solid hsl(var(--border))" }}>
          {([
            { id: "summary", label: "Ringkasan", icon: "📊" },
            { id: "pl", label: "Laba Rugi", icon: "💰" },
            { id: "cashflow", label: "Arus Kas", icon: "💸" },
            { id: "balance", label: "Neraca", icon: "⚖️" },
          ] as const).map(tab => (
            <button 
              key={tab.id}
              className={`btn btn-sm ${activeTab === tab.id ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab(tab.id)}
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

      {reportDiagnostics.length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: "24px",
            padding: "18px 20px",
            border: "1px solid hsl(var(--warning) / 0.25)",
            background: "hsl(var(--warning) / 0.06)",
            display: "grid",
            gap: "10px",
          }}
        >
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "4px" }}>
              Pemeriksaan Integritas Akuntansi
            </h3>
            <p style={{ fontSize: "12px", color: "hsl(var(--text-secondary))" }}>
              Laporan sekarang hanya memakai data yang benar-benar tercatat. Jika ada celah data,
              sistem menampilkannya di sini alih-alih membuat angka penyeimbang.
            </p>
          </div>
          {reportDiagnostics.map((diagnostic) => (
            <div
              key={diagnostic.code}
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--bg-card))",
                fontSize: "12px",
                lineHeight: 1.5,
              }}
            >
              <strong
                style={{
                  color:
                    diagnostic.severity === "error"
                      ? "hsl(var(--error))"
                      : diagnostic.severity === "warning"
                        ? "hsl(var(--warning))"
                        : "hsl(var(--primary))",
                }}
              >
                {diagnostic.severity === "error"
                  ? "Error Data"
                  : diagnostic.severity === "warning"
                    ? "Perlu Dicek"
                    : "Info"}
              </strong>{" "}
              {diagnostic.message}
            </div>
          ))}
        </div>
      )}

      {activeTab === "summary" && (
        <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginBottom: "30px" }}>
        
        {/* REVENUE CARD */}
        <div className="stat-card" style={{ borderLeft: "4px solid hsl(var(--primary))" }}>
           <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>Pendapatan POS Tercatat</span>
           <span className="stat-value" style={{ color: "hsl(var(--primary))", background: "none", WebkitTextFillColor: "hsl(var(--primary))" }}>
              {formatRupiahFull(profitLoss.revenue)}
           </span>
           <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "8px" }}>
             Dari {sales.length} transaksi POS selesai
           </span>
           {profitLoss.supplementalOnlineRevenue > 0 && (
             <span style={{ fontSize: "11px", color: "hsl(var(--warning))", marginTop: "6px" }}>
               + {formatRupiahFull(profitLoss.supplementalOnlineRevenue)} penjualan online dipisahkan dulu
             </span>
           )}
        </div>

        {/* COGS CARD */}
        <div className="stat-card" style={{ borderLeft: "4px solid hsl(var(--warning))" }}>
           <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>HPP POS Tercatat</span>
           <span className="stat-value" style={{ color: "hsl(var(--warning))", background: "none", WebkitTextFillColor: "hsl(var(--warning))" }}>
              {formatRupiahFull(profitLoss.cogs)}
           </span>
           <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "8px" }}>Bersih setelah retur barang kondisi baik</span>
        </div>

        {/* PROFIT CARD */}
        <div className="stat-card" style={{ background: "var(--gradient-primary)" }}>
           <span style={{ fontSize: "14px", color: "white", opacity: 0.9, fontWeight: 600 }}>Laba Bersih Tercatat</span>
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
                 <span style={{ fontWeight: 600 }}>Pendapatan POS Tercatat</span>
                 <span style={{ color: "hsl(var(--success))", fontWeight: 800 }}>{formatRupiahFull(profitLoss.grossSales)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", borderBottom: "1px solid hsl(var(--border))", paddingBottom: "10px" }}>
                 <span style={{ fontWeight: 600 }}>Retur Penjualan</span>
                 <span style={{ color: "hsl(var(--error))", fontWeight: 800 }}>({formatRupiahFull(profitLoss.salesReturns)})</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", borderBottom: "1px solid hsl(var(--border))", paddingBottom: "10px" }}>
                 <span style={{ fontWeight: 600 }}>Pendapatan Bersih POS</span>
                 <span style={{ color: "hsl(var(--success))", fontWeight: 800 }}>{formatRupiahFull(profitLoss.revenue)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", borderBottom: "1px solid hsl(var(--border))", paddingBottom: "10px" }}>
                 <span style={{ fontWeight: 600 }}>Harga Pokok Penjualan POS</span>
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
              {profitLoss.supplementalOnlineRevenue > 0 && (
                <div style={{ fontSize: "12px", color: "hsl(var(--warning))", lineHeight: 1.6 }}>
                  Pesanan online {profitLoss.supplementalOnlineOrderCount} transaksi senilai{" "}
                  {formatRupiahFull(profitLoss.supplementalOnlineRevenue)} belum masuk laba rugi inti,
                  karena sistem online belum menyimpan snapshot HPP dan aliran kas setara POS.
                </div>
              )}
           </div>
        </div>
      )}

      {activeTab === "cashflow" && (
        <div className="card" style={{ maxWidth: "600px", margin: "0 auto", padding: "40px" }}>
           <h2 style={{ textAlign: "center", marginBottom: "30px", fontSize: "24px", fontWeight: 900 }}>LAPORAN ARUS KAS</h2>
           
           {/* OPERATING */}
           <div style={{ marginBottom: "24px" }}>
             <h3 style={{ fontSize: "14px", fontWeight: 800, color: "hsl(var(--primary))", borderBottom: "2px solid hsl(var(--primary))", marginBottom: "12px" }}>
               A. ARUS KAS OPERASI TUNAI
             </h3>
             <div style={{ display: "grid", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Penjualan Tunai</span><span style={{ color: "hsl(var(--success))" }}>{formatRupiahFull(cashFlow.cashSalesInflow)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Pengeluaran Belanja Stok</span><span style={{ color: "hsl(var(--error))" }}>({formatRupiahFull(cashFlow.stockPurchases)})</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Biaya Operasional</span><span style={{ color: "hsl(var(--error))" }}>({formatRupiahFull(cashFlow.operatingExpenses)})</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Retur Penjualan</span><span style={{ color: "hsl(var(--error))" }}>({formatRupiahFull(cashFlow.salesReturns)})</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: "1px solid hsl(var(--border))", paddingTop: "8px", marginTop: "4px" }}>
                  <span>Total Kas Operasi Tunai</span>
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
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Pembelian Aset Tetap</span><span style={{ color: "hsl(var(--error))" }}>({formatRupiahFull(cashFlow.assetPurchases)})</span></div>
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
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Modal Tunai Awal Pemilik</span><span style={{ color: "hsl(var(--success))" }}>{formatRupiahFull(cashFlow.financing)}</span></div>
                {cashFlow.openingNonCashCapital > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Modal Non-Tunai Awal (Info)</span>
                    <span style={{ color: "hsl(var(--text-secondary))" }}>{formatRupiahFull(cashFlow.openingNonCashCapital)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: "1px solid hsl(var(--border))", paddingTop: "8px", marginTop: "4px" }}>
                  <span>Total Arus Kas Pendanaan</span>
                  <span style={{ color: cashFlow.financing >= 0 ? "hsl(var(--success))" : "hsl(var(--error))" }}>{formatRupiahFull(cashFlow.financing)}</span>
                </div>
             </div>
           </div>

           <div style={{ marginBottom: "24px" }}>
             <h3 style={{ fontSize: "14px", fontWeight: 800, color: "hsl(var(--warning))", borderBottom: "2px solid hsl(var(--warning))", marginBottom: "12px" }}>
               D. SALDO NON-TUNAI TERCATAT
             </h3>
             <div style={{ display: "grid", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>QRIS / Transfer</span><span>{formatRupiahFull(cashFlow.endingDigitalCash)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Piutang Penjualan Kredit</span><span>{formatRupiahFull(cashFlow.endingReceivables)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: "1px solid hsl(var(--border))", paddingTop: "8px", marginTop: "4px" }}>
                  <span>Likuiditas Tercatat</span>
                  <span>{formatRupiahFull(cashFlow.endingLiquidity)}</span>
                </div>
             </div>
           </div>

           {/* SALDO AKHIR */}
           <div style={{ display: "flex", justifyContent: "space-between", fontSize: "22px", marginTop: "20px", background: "hsl(var(--success)/0.05)", padding: "16px", borderRadius: "12px", border: "2px solid hsl(var(--success)/0.2)" }}>
              <span style={{ fontWeight: 800 }}>KAS LACI AKHIR</span>
              <span style={{ color: "hsl(var(--success))", fontWeight: 900 }}>{formatRupiahFull(cashFlow.endingCash)}</span>
           </div>
        </div>
      )}

      {activeTab === "balance" && (
        <div className="card" style={{ maxWidth: "600px", margin: "0 auto", padding: "40px" }}>
           <h2 style={{ textAlign: "center", marginBottom: "30px", fontSize: "24px", fontWeight: 900 }}>LAPORAN NERACA</h2>
           
           <div style={{ marginBottom: "30px" }}>
             <h3 style={{ fontSize: "14px", fontWeight: 800, color: "hsl(var(--primary))", marginBottom: "12px", borderBottom: "2px solid hsl(var(--primary))" }}>ASET (KEKAYAAN)</h3>
             <div style={{ display: "grid", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Kas Laci Tercatat</span><span>{formatRupiahFull(balanceSheet.kasDiLaci)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Saldo Digital / Bank Tercatat</span><span>{formatRupiahFull(balanceSheet.kasDigital)}</span></div>
                {balanceSheet.piutangUsaha !== 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Piutang Usaha</span><span>{formatRupiahFull(balanceSheet.piutangUsaha)}</span></div>
                )}
                 <div style={{ display: "flex", justifyContent: "space-between" }}>
                   <span>Persediaan Barang (Nilai Modal)</span>
                   <div style={{ textAlign: "right" }}>
                     <div>{formatRupiahFull(balanceSheet.persediaan)}</div>
                     <div style={{ fontSize: "10px", color: "hsl(var(--text-muted))", marginTop: "4px", display: "grid", gap: "2px" }}>
                       <div>Produk jadi: {formatRupiahFull(balanceSheet.persediaanProduk)}</div>
                       <div>Gudang pusat: {formatRupiahFull(balanceSheet.persediaanProdukGudang)}</div>
                       {balanceSheet.persediaanProdukTerminal > 0 && (
                         <div>Terminal POS: {formatRupiahFull(balanceSheet.persediaanProdukTerminal)}</div>
                       )}
                       <div>Bahan baku: {formatRupiahFull(balanceSheet.persediaanBahan)}</div>
                     </div>
                     {balanceSheet.productHppMissing && (
                       <div style={{ fontSize: "10px", color: "hsl(var(--error))", fontWeight: 600 }}>⚠️ Sebagian produk belum ada HPP</div>
                     )}
                     {balanceSheet.materialHppMissing && (
                       <div style={{ fontSize: "10px", color: "hsl(var(--error))", fontWeight: 600 }}>⚠️ Sebagian bahan belum ada HPP</div>
                     )}
                     {balanceSheet.selisihPersediaan !== 0 && (
                       <div style={{ fontSize: "10px", color: "hsl(var(--warning))", fontWeight: 600, marginTop: "4px" }}>
                         Roll-forward persediaan: {formatRupiahFull(balanceSheet.persediaanRollforward)} · selisih {formatRupiahFull(balanceSheet.selisihPersediaan)}
                       </div>
                     )}
                   </div>
                 </div>
                 <div style={{ display: "flex", justifyContent: "space-between" }}><span>Aset Tetap Bruto (Peralatan/Mesin)</span><span>{formatRupiahFull(balanceSheet.asetTetap)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "18px", marginTop: "10px", borderTop: "1px solid hsl(var(--border))", paddingTop: "10px" }}>
                  <span>TOTAL ASET</span><span>{formatRupiahFull(balanceSheet.totalAset)}</span>
                </div>
             </div>
           </div>

           <div>
             <h3 style={{ fontSize: "14px", fontWeight: 800, color: "hsl(var(--success))", marginBottom: "12px", borderBottom: "2px solid hsl(var(--success))" }}>LIABILITAS & EKUITAS</h3>
             <div style={{ display: "grid", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Liabilitas Tercatat</span>
                  <span>{formatRupiahFull(balanceSheet.liabilitasTercatat)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Ekuitas Residu dari Aset Tercatat</span>
                  <span style={{ fontWeight: 700 }}>{formatRupiahFull(balanceSheet.totalEkuitas)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "18px", marginTop: "10px", borderTop: "1px solid hsl(var(--border))", paddingTop: "10px" }}>
                  <span>TOTAL EKUITAS</span><span>{formatRupiahFull(balanceSheet.totalEkuitas)}</span>
                </div>
             </div>
           </div>

           <div style={{ marginTop: "24px", display: "grid", gap: "10px", padding: "16px", background: "hsl(var(--bg-elevated))", borderRadius: "12px", border: "1px dashed hsl(var(--border))" }}>
             <div style={{ fontSize: "13px", fontWeight: 700 }}>Rekonsiliasi Modal</div>
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
               <span>Modal Awal Tercatat</span>
               <span>{formatRupiahFull(balanceSheet.modalAwal)}</span>
             </div>
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
               <span>Laba Berjalan Tercatat</span>
               <span style={{ color: balanceSheet.labaBerjalan >= 0 ? "hsl(var(--success))" : "hsl(var(--error))", fontWeight: 700 }}>
                 {formatRupiahFull(balanceSheet.labaBerjalan)}
               </span>
             </div>
             {balanceSheet.selisihRekonsiliasi !== 0 && (
               <>
                 <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "hsl(var(--text-secondary))", fontStyle: "italic" }}>
                   <span>{reconciliationGapLabel}</span>
                   <span>{formatRupiahFull(balanceSheet.selisihRekonsiliasi)}</span>
                 </div>
                 <div style={{ fontSize: "11px", color: "hsl(var(--text-muted))", lineHeight: 1.5 }}>
                   {reconciliationGapHint}
                 </div>
               </>
             )}
             {balanceSheet.selisihPersediaan !== 0 && (
               <div style={{ fontSize: "11px", color: "hsl(var(--text-muted))", lineHeight: 1.5 }}>
                 {inventoryGapHint}
               </div>
             )}
           </div>

           <div style={{ marginTop: "40px", padding: "12px", background: "hsl(var(--bg-elevated))", borderRadius: "8px", textAlign: "center", fontSize: "12px", color: "hsl(var(--text-muted))", border: "1px dashed hsl(var(--border))" }}>
             Neraca Seimbang: Aset = Liabilitas + Ekuitas
           </div>
        </div>
      )}
    </DashboardLayout>
  );
}
