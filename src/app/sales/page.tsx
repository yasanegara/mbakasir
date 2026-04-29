"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb, type LocalPosTerminal, type LocalSale, type LocalSaleItem } from "@/lib/db";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatRupiahFull } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useAuth, useToast } from "@/contexts/AppProviders";
import SalesReturnModal from "@/components/common/SalesReturnModal";

type OnlineOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

type PaymentMethod = "CASH" | "TRANSFER" | "QRIS" | "CREDIT";

interface OnlineOrderItem {
  productId?: string | null;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface OnlineOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  status: OnlineOrderStatus;
  createdAt: string;
  items: OnlineOrderItem[];
}

type UnifiedTransaction = {
  id: string;
  source: "POS" | "STOREFRONT";
  referenceNo: string;
  createdAt: number;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  changeAmount: number;
  itemCount: number;
  status: LocalSale["status"] | OnlineOrderStatus;
  syncStatus: LocalSale["syncStatus"] | "SERVER";
  primaryLabel: string;
  secondaryLabel: string;
  notes?: string;
  discountAmount?: number;
};

const REALIZED_ONLINE_ORDER_STATUSES = new Set<OnlineOrderStatus>([
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
]);

const ONLINE_STATUS_META: Record<
  OnlineOrderStatus,
  { label: string; tone: string }
> = {
  PENDING: { label: "Menunggu", tone: "var(--warning)" },
  CONFIRMED: { label: "Dikonfirmasi", tone: "var(--primary)" },
  PAID: { label: "Lunas", tone: "var(--success)" },
  PROCESSING: { label: "Diproses", tone: "var(--primary)" },
  SHIPPED: { label: "Dikirim", tone: "var(--primary)" },
  DELIVERED: { label: "Selesai", tone: "var(--success)" },
  CANCELLED: { label: "Dibatalkan", tone: "var(--error)" },
};

const POS_STATUS_META: Record<
  LocalSale["status"],
  { label: string; tone: string }
> = {
  COMPLETED: { label: "Selesai", tone: "var(--success)" },
  VOIDED: { label: "Dibatalkan", tone: "var(--error)" },
  PENDING: { label: "Pending", tone: "var(--warning)" },
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Tunai",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
  CREDIT: "Kredit",
};

// ============================================================
// RIWAYAT TRANSAKSI POS — Dilihat Owner & Kasir
// ============================================================

export default function SalesHistoryPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>([]);
  const [onlineOrdersLoading, setOnlineOrdersLoading] = useState(false);
  const [returnTargetId, setReturnTargetId] = useState<string | null>(null);
  const { toast } = useToast();

  const tenantId = user?.tenantId;

  const sales = useLiveQuery<LocalSale[]>(() => {
    if (!tenantId) return [];
    return getDb().sales.where("tenantId").equals(tenantId).reverse().sortBy("createdAt").then(arr => arr.slice(0, 200));
  }, [tenantId]) ?? [];

  const saleItems = useLiveQuery<LocalSaleItem[]>(() => {
    if (!tenantId || sales.length === 0) return [];
    const saleIds = sales.map(s => s.localId);
    return getDb().saleItems.where("saleLocalId").anyOf(saleIds).toArray();
  }, [tenantId, sales.length]) ?? [];

  const posTerminals = useLiveQuery<LocalPosTerminal[]>(
    () => (tenantId ? getDb().posTerminals.where("tenantId").equals(tenantId).toArray() : []),
    [tenantId]
  ) ?? [];

  const returns = useLiveQuery(
    () => (tenantId ? getDb().salesReturns.where("tenantId").equals(tenantId).toArray() : []),
    [tenantId]
  ) ?? [];

  useEffect(() => {
    if (!tenantId) {
      setOnlineOrders([]);
      return;
    }

    let cancelled = false;

    async function loadOnlineOrders() {
      setOnlineOrdersLoading(true);
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
        console.error("Sales history online orders error:", error);
        if (!cancelled) {
          setOnlineOrders([]);
        }
      } finally {
        if (!cancelled) {
          setOnlineOrdersLoading(false);
        }
      }
    }

    void loadOnlineOrders();

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const unifiedTransactions = useMemo<UnifiedTransaction[]>(() => {
    const posTransactions = sales.map((sale) => {
      const itemsInSale = saleItems.filter((item) => item.saleLocalId === sale.localId);
      const terminalName = posTerminals.find((terminal) => terminal.id === sale.terminalId)?.name || "Gudang Utama";

      return {
        id: sale.localId,
        source: "POS" as const,
        referenceNo: sale.invoiceNo,
        createdAt: sale.createdAt,
        paymentMethod: sale.paymentMethod,
        totalAmount: sale.totalAmount,
        changeAmount: sale.changeAmount,
        itemCount: itemsInSale.length,
        status: sale.status,
        syncStatus: sale.syncStatus,
        primaryLabel: terminalName,
        secondaryLabel: sale.customerName || sale.customerWa || "Transaksi kasir lokal",
        notes: sale.notes,
        discountAmount: sale.discountAmount,
      };
    });

    const storefrontTransactions = onlineOrders.map((order) => ({
      id: order.id,
      source: "STOREFRONT" as const,
      referenceNo: `WEB-${order.id.slice(-6).toUpperCase()}`,
      createdAt: new Date(order.createdAt).getTime(),
      paymentMethod: "TRANSFER" as const,
      totalAmount: Number(order.totalAmount),
      changeAmount: 0,
      itemCount: order.items.length,
      status: order.status,
      syncStatus: "SERVER" as const,
      primaryLabel: order.customerName,
      secondaryLabel: order.customerPhone || "Pesanan online storefront",
      notes: "Pesanan dari storefront online",
    }));

    return [...storefrontTransactions, ...posTransactions].sort(
      (a, b) => b.createdAt - a.createdAt
    );
  }, [onlineOrders, posTerminals, saleItems, sales]);

  const returnTargetSale = useMemo(() => {
    if (!returnTargetId) return null;
    return sales.find(s => s.localId === returnTargetId);
  }, [returnTargetId, sales]);

  const returnTargetItems = useMemo(() => {
    if (!returnTargetId) return [];
    return saleItems.filter(i => i.saleLocalId === returnTargetId);
  }, [returnTargetId, saleItems]);

  const filtered = useMemo(() => {
    if (!search.trim()) return unifiedTransactions;
    const q = search.toLowerCase();
    return unifiedTransactions.filter(
      (transaction) =>
        transaction.referenceNo.toLowerCase().includes(q) ||
        transaction.paymentMethod.toLowerCase().includes(q) ||
        transaction.status.toLowerCase().includes(q) ||
        transaction.primaryLabel.toLowerCase().includes(q) ||
        transaction.secondaryLabel.toLowerCase().includes(q) ||
        transaction.source.toLowerCase().includes(q)
    );
  }, [search, unifiedTransactions]);

  const totalRevenue =
    sales
      .filter((sale) => sale.status === "COMPLETED")
      .reduce((sum, sale) => sum + sale.totalAmount, 0) +
    onlineOrders
      .filter((order) => REALIZED_ONLINE_ORDER_STATUSES.has(order.status))
      .reduce((sum, order) => sum + Number(order.totalAmount), 0);

  const totalVoided =
    sales.filter((sale) => sale.status === "VOIDED").length +
    onlineOrders.filter((order) => order.status === "CANCELLED").length;

  const pendingSyncCount = sales.filter((sale) => sale.syncStatus === "PENDING").length;

  const isLoading = onlineOrdersLoading && unifiedTransactions.length === 0;

  return (
    <DashboardLayout title="Riwayat Transaksi">
      <div style={{ display: "grid", gap: "24px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <div className="stat-card">
            <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>Total Transaksi</span>
            <span className="stat-value">{unifiedTransactions.length}</span>
            <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "4px" }}>
              {pendingSyncCount} POS belum tersinkron • {onlineOrders.length} dari storefront
            </span>
          </div>
          <div className="stat-card">
            <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>Total Omzet</span>
            <span className="stat-value" style={{ fontSize: "22px" }}>{formatRupiahFull(totalRevenue)}</span>
          </div>
          <div className="stat-card">
            <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>Dibatalkan</span>
            <span className="stat-value" style={{ fontSize: "28px", color: totalVoided > 0 ? "hsl(var(--error))" : "inherit" }}>
              {totalVoided}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="card" style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            className="input-field"
            style={{ maxWidth: "320px" }}
            placeholder="Cari ref, pelanggan, metode bayar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span style={{ fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
            Menampilkan {filtered.length} dari {unifiedTransactions.length} transaksi
          </span>
        </div>

        {/* Tabel */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {isLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "hsl(var(--text-muted))" }}>
              Memuat data transaksi...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "hsl(var(--text-muted))" }}>
              Belum ada data transaksi.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                <thead style={{ background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border))" }}>
                  <tr>
                    {["Ref", "Sumber", "Pelanggan / POS", "Waktu", "Metode", "Total", "Kembalian", "Status", "Sync"].map((h) => (
                      <th key={h} style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "hsl(var(--text-secondary))", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((transaction) => {
                    const statusMeta =
                      transaction.source === "POS"
                        ? POS_STATUS_META[transaction.status as LocalSale["status"]]
                        : ONLINE_STATUS_META[transaction.status as OnlineOrderStatus];

                    return (
                      <tr key={transaction.id} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                        <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "13px", fontWeight: 600 }}>
                          {transaction.referenceNo}
                          <div style={{ fontSize: "11px", color: "hsl(var(--text-muted))", fontFamily: "inherit", fontWeight: 400, marginTop: "2px" }}>
                            {transaction.itemCount} item produk
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            className="badge"
                            style={{
                              fontSize: "11px",
                              background:
                                transaction.source === "POS"
                                  ? "hsl(var(--primary)/0.12)"
                                  : "hsl(var(--success)/0.12)",
                              color:
                                transaction.source === "POS"
                                  ? "hsl(var(--primary))"
                                  : "hsl(var(--success))",
                            }}
                          >
                            {transaction.source === "POS" ? "POS Lokal" : "Storefront"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "hsl(var(--primary))" }}>
                            {transaction.primaryLabel}
                          </div>
                          <div style={{ fontSize: "11px", color: "hsl(var(--text-muted))", marginTop: "2px" }}>
                            {transaction.secondaryLabel}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: "12px", color: "hsl(var(--text-secondary))", whiteSpace: "nowrap" }}>
                          {new Date(transaction.createdAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                          <div style={{ marginTop: "2px" }}>
                            {new Date(transaction.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span className="badge badge-info" style={{ fontSize: "11px" }}>
                            {PAYMENT_METHOD_LABEL[transaction.paymentMethod] || transaction.paymentMethod}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 700, fontSize: "14px", color: "hsl(var(--primary))", whiteSpace: "nowrap" }}>
                          {formatRupiahFull(transaction.totalAmount)}
                          {(transaction.discountAmount || 0) > 0 && (
                            <div style={{ fontSize: "10px", color: "hsl(var(--error))", fontWeight: 600, marginTop: "2px" }}>
                              Diskon: {formatRupiahFull(transaction.discountAmount || 0)}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: "13px", color: "hsl(var(--text-secondary))", whiteSpace: "nowrap" }}>
                          {transaction.changeAmount > 0 ? formatRupiahFull(transaction.changeAmount) : "—"}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            className="badge"
                            style={{
                              fontSize: "11px",
                              background: `hsl(${statusMeta.tone} / 0.12)`,
                              color: `hsl(${statusMeta.tone})`,
                              border: `1px solid hsl(${statusMeta.tone} / 0.3)`,
                            }}
                          >
                            {statusMeta.label}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            className="badge"
                            style={{
                              fontSize: "11px",
                              background:
                                transaction.syncStatus === "SYNCED" || transaction.syncStatus === "SERVER"
                                  ? "hsl(var(--success)/0.12)"
                                  : "hsl(var(--warning)/0.12)",
                              color:
                                transaction.syncStatus === "SYNCED" || transaction.syncStatus === "SERVER"
                                  ? "hsl(var(--success))"
                                  : "hsl(var(--warning))",
                            }}
                          >
                            {transaction.syncStatus === "SERVER"
                              ? "☁ Server"
                              : transaction.syncStatus === "SYNCED"
                                ? "✓ Synced"
                                : "⏳ Pending"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
