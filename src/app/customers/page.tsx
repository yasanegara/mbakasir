"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatRupiahFull } from "@/lib/utils";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AppProviders";

// ============================================================
// DATA PELANGGAN — Khusus Owner (TENANT)
// ============================================================

interface CustomerSummary {
  wa: string;
  name: string;
  totalSpent: number;
  lastPurchase: number;
  items: Set<string>;
  transactionCount: number;
}

export default function CustomersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  // Ambil data sales & items sesuai tenant
  const sales = useLiveQuery(async () => {
    const tenantId = user?.tenantId;
    if (!tenantId) return [];
    return await getDb().sales.where("tenantId").equals(tenantId).toArray();
  }, [user?.sub]) || [];

  const saleItems = useLiveQuery(async () => {
    if (!user?.tenantId) return [];
    return await getDb().saleItems.toArray();
  }, [user?.sub]) || [];

  const customerData = useMemo(() => {
    const map = new Map<string, CustomerSummary>();

    sales.forEach((sale) => {
      // DEBUG: console.log("Checking sale:", sale.invoiceNo, sale.customerName, sale.customerWa);
      
      // Ambil Nama & WA (Gunakan WA sebagai key utama jika ada)
      const cName = sale.customerName?.trim();
      const cWa = sale.customerWa?.trim();

      if (!cName && !cWa) return;

      const key = cWa || cName || "Unknown";
      const existing = map.get(key);

      const itemsInSale = saleItems
        .filter((si) => si.saleLocalId === sale.localId)
        .map((si) => si.productName);

      if (existing) {
        existing.totalSpent += (sale.totalAmount || 0);
        existing.transactionCount += 1;
        if (sale.createdAt > existing.lastPurchase) {
          existing.lastPurchase = sale.createdAt;
          if (cName) existing.name = cName;
          if (cWa) existing.wa = cWa;
        }
        itemsInSale.forEach((item) => existing.items.add(item));
      } else {
        map.set(key, {
          wa: cWa || "",
          name: cName || "Pelanggan Tanpa Nama",
          totalSpent: sale.totalAmount || 0,
          lastPurchase: sale.createdAt,
          transactionCount: 1,
          items: new Set(itemsInSale),
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [sales, saleItems]);

  const filtered = useMemo(() => {
    if (!search.trim()) return customerData;
    const q = search.toLowerCase();
    return customerData.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.wa.toLowerCase().includes(q)
    );
  }, [customerData, search]);

  return (
    <DashboardLayout title="Data Pelanggan">
      <div style={{ display: "grid", gap: "24px" }}>
        {/* Header & Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <div className="stat-card">
            <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>Total Pelanggan</span>
            <span className="stat-value">{customerData.length} Orang</span>
          </div>
          <div className="stat-card">
            <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>Total Loyalitas (Omzet)</span>
            <span className="stat-value" style={{ fontSize: "22px", color: "hsl(var(--primary))" }}>
              {formatRupiahFull(customerData.reduce((a, b) => a + b.totalSpent, 0))}
            </span>
          </div>
        </div>

        {/* Search & Debug Info */}
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <input
            className="input-field"
            style={{ maxWidth: "400px" }}
            placeholder="🔍 Cari nama atau WA..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
            Menganalisa {sales.length} transaksi terakhir
          </div>
        </div>

        {/* List Pelanggan */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {filtered.length === 0 ? (
            <div className="card" style={{ gridColumn: "1/-1", textAlign: "center", padding: "80px", color: "hsl(var(--text-muted))" }}>
              {sales.length === 0 ? "Belum ada transaksi di database toko Anda." : "Tidak ada data pelanggan yang ditemukan (Pastikan kasir mengisi Nama/WA saat transaksi)."}
            </div>
          ) : (
            filtered.map((customer) => (
              <div key={customer.wa || customer.name} className="card" style={{ display: "flex", flexDirection: "column", gap: "16px", border: "1px solid hsl(var(--border))", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "4px" }}>{customer.name}</h3>
                    {customer.wa && (
                      <a
                        href={`https://wa.me/${customer.wa.replace(/\D/g, "").replace(/^0/, "62")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: "13px",
                          color: "hsl(var(--success))",
                          fontWeight: 700,
                          textDecoration: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 8px",
                          background: "hsl(var(--success) / 0.1)",
                          borderRadius: "6px",
                          width: "fit-content"
                        }}
                      >
                        📲 Hubungi WA
                      </a>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "10px", color: "hsl(var(--text-muted))", textTransform: "uppercase", fontWeight: 700 }}>Total Belanja</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "hsl(var(--primary))" }}>{formatRupiahFull(customer.totalSpent)}</div>
                  </div>
                </div>

                <div style={{ padding: "12px", background: "hsl(var(--bg-elevated))", borderRadius: "8px", fontSize: "12px" }}>
                  <div style={{ color: "hsl(var(--text-secondary))", fontWeight: 600, marginBottom: "8px" }}>Item Terakhir Dibeli:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {Array.from(customer.items).slice(0, 8).map((item) => (
                      <span key={item} style={{ padding: "2px 8px", background: "hsl(var(--bg-card))", border: "1px solid hsl(var(--border))", borderRadius: "4px", fontSize: "11px" }}>
                        {item}
                      </span>
                    ))}
                    {customer.items.size > 8 && <span style={{ opacity: 0.6 }}>...</span>}
                  </div>
                </div>

                <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "hsl(var(--text-secondary))", borderTop: "1px solid hsl(var(--border))", paddingTop: "12px" }}>
                  <span>Kunjungan: <b>{customer.transactionCount}x</b></span>
                  <span>Terakhir: <b>{new Date(customer.lastPurchase).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</b></span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <style jsx>{`
        .stat-card {
          padding: 20px;
          background: hsl(var(--bg-card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        }
        .stat-value {
          font-size: 24px;
          font-weight: 900;
          margin-top: 8px;
        }
      `}</style>
    </DashboardLayout>
  );
}
