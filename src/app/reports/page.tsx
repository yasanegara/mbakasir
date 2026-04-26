"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatRupiahFull } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

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
  const [period] = useState("Hari Ini"); // Filter dummy utk prototype
  const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>([]);
  
  const sales = useLiveQuery(() => getDb().sales.where("status").equals("COMPLETED").toArray()) || [];
  const saleItems = useLiveQuery(() => getDb().saleItems.toArray()) || [];
  const posTerminals = useLiveQuery(() => getDb().posTerminals.toArray()) || [];
  const products = useLiveQuery(() => getDb().products.toArray()) || [];

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
    return { revenue, cogs, netProfit };
  }, [productCostMap, realizedOnlineOrders, saleItems, sales]);

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

  return (
    <DashboardLayout title={`Laporan Transaksi - ${period}`}>
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
           <span style={{ fontSize: "14px", color: "white", opacity: 0.9, fontWeight: 600 }}>Laba Kotor (Net Profit)</span>
           <span className="stat-value" style={{ color: "white", WebkitTextFillColor: "white", textShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
              {formatRupiahFull(profitLoss.netProfit)}
           </span>
           <span style={{ fontSize: "12px", color: "white", opacity: 0.8, marginTop: "8px" }}>Margin: {profitLoss.revenue === 0 ? "0" : Math.round((profitLoss.netProfit / profitLoss.revenue) * 100)}%</span>
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
    </DashboardLayout>
  );
}
