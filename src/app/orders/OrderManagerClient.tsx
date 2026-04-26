"use client";

import { useState, useEffect } from "react";
import { formatRupiahFull } from "@/lib/utils";

type OrderStatus = "PENDING" | "CONFIRMED" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes?: string | null;
  shippingCost: number;
  subtotal: number;
  totalAmount: number;
  status: OrderStatus;
  trackingNumber?: string | null;
  paymentProofUrl?: string | null;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; next?: OrderStatus; nextLabel?: string }> = {
  PENDING:    { label: "Menunggu",      color: "#d97706", bg: "#fef3c7", next: "CONFIRMED",  nextLabel: "✅ Konfirmasi" },
  CONFIRMED:  { label: "Dikonfirmasi",  color: "#2563eb", bg: "#dbeafe", next: "PAID",       nextLabel: "💰 Tandai Lunas" },
  PAID:       { label: "Lunas",         color: "#7c3aed", bg: "#ede9fe", next: "PROCESSING", nextLabel: "📦 Proses" },
  PROCESSING: { label: "Diproses",      color: "#0891b2", bg: "#cffafe", next: "SHIPPED",    nextLabel: "🚚 Kirim" },
  SHIPPED:    { label: "Dikirim",       color: "#059669", bg: "#d1fae5", next: "DELIVERED",  nextLabel: "✔️ Terima" },
  DELIVERED:  { label: "Terkirim",      color: "#16a34a", bg: "#dcfce7" },
  CANCELLED:  { label: "Dibatalkan",    color: "#dc2626", bg: "#fee2e2" },
};

const FILTER_TABS: { key: string; label: string }[] = [
  { key: "ALL", label: "Semua" },
  { key: "PENDING", label: "Menunggu" },
  { key: "CONFIRMED", label: "Dikonfirmasi" },
  { key: "PAID", label: "Lunas" },
  { key: "PROCESSING", label: "Diproses" },
  { key: "SHIPPED", label: "Dikirim" },
  { key: "DELIVERED", label: "Selesai" },
];

export default function OrderManagerClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/orders?status=${filter}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, [filter]);

  const updateStatus = async (orderId: string, status: OrderStatus, trackingNumber?: string) => {
    setSubmitting(orderId);
    try {
      const res = await fetch(`/api/tenant/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(trackingNumber ? { trackingNumber } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status, ...(trackingNumber ? { trackingNumber } : {}) } : o));
    } finally {
      setSubmitting(null);
    }
  };

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;

  return (
    <div>
      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: "8px 16px",
              borderRadius: "999px",
              border: "none",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              background: filter === tab.key ? "hsl(var(--primary))" : "hsl(var(--bg-elevated))",
              color: filter === tab.key ? "white" : "hsl(var(--text-secondary))",
              transition: "all 0.15s",
            }}
          >
            {tab.label}
            {tab.key === "PENDING" && pendingCount > 0 && (
              <span style={{ marginLeft: "6px", background: "#ef4444", color: "white", borderRadius: "999px", padding: "1px 6px", fontSize: "11px" }}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "hsl(var(--text-muted))" }}>Memuat pesanan...</div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", border: "1px dashed hsl(var(--border))", borderRadius: "16px", color: "hsl(var(--text-muted))" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
          <div>Belum ada pesanan.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {orders.map((order) => {
            const cfg = STATUS_CONFIG[order.status];
            const isExpanded = expandedId === order.id;

            return (
              <div key={order.id} className="card" style={{ padding: 0, overflow: "hidden", border: order.status === "PENDING" ? "1px solid hsl(var(--warning)/0.5)" : "1px solid hsl(var(--border))" }}>
                {/* Order Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  style={{ padding: "16px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "15px" }}>{order.customerName}</div>
                    <div style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", marginTop: "2px" }}>
                      {order.customerPhone} · {new Date(order.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 800 }}>{formatRupiahFull(Number(order.totalAmount))}</span>
                    <span style={{ padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    <span style={{ color: "hsl(var(--text-muted))" }}>{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div style={{ padding: "0 20px 20px", borderTop: "1px solid hsl(var(--border))" }}>
                    {/* Items */}
                    <div style={{ marginTop: "16px", marginBottom: "16px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "hsl(var(--text-muted))", marginBottom: "8px" }}>PRODUK DIPESAN</div>
                      <div style={{ display: "grid", gap: "6px" }}>
                        {order.items.map((item, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                            <span>{item.productName} ×{item.quantity}</span>
                            <span style={{ fontWeight: 600 }}>{formatRupiahFull(Number(item.subtotal))}</span>
                          </div>
                        ))}
                        {Number(order.shippingCost) > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
                            <span>Ongkir</span><span>{formatRupiahFull(Number(order.shippingCost))}</span>
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, paddingTop: "8px", borderTop: "1px solid hsl(var(--border))" }}>
                          <span>Total</span><span style={{ color: "hsl(var(--primary))" }}>{formatRupiahFull(Number(order.totalAmount))}</span>
                        </div>
                      </div>
                    </div>

                    {/* Address & Notes */}
                    <div style={{ background: "hsl(var(--bg-elevated))", borderRadius: "10px", padding: "12px", marginBottom: "16px", fontSize: "13px" }}>
                      <div style={{ fontWeight: 600, marginBottom: "4px" }}>📍 {order.customerAddress}</div>
                      {order.notes && <div style={{ color: "hsl(var(--text-secondary))", marginTop: "4px" }}>📝 {order.notes}</div>}
                    </div>

                    {/* Payment Proof */}
                    {order.paymentProofUrl && (
                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "hsl(var(--text-muted))", marginBottom: "8px" }}>BUKTI TRANSFER</div>
                        <a href={order.paymentProofUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block" }}>
                          <img 
                            src={order.paymentProofUrl} 
                            alt="Bukti Transfer" 
                            style={{ 
                              maxWidth: "200px", 
                              borderRadius: "12px", 
                              border: "1px solid hsl(var(--border))",
                              cursor: "pointer",
                              transition: "transform 0.2s"
                            }} 
                            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                          />
                        </a>
                      </div>
                    )}

                    {/* Tracking Number (if SHIPPED) */}
                    {order.trackingNumber && (
                      <div style={{ background: "hsl(var(--primary)/0.06)", borderRadius: "10px", padding: "12px", marginBottom: "16px", border: "1px solid hsl(var(--primary)/0.2)" }}>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "hsl(var(--primary))", marginBottom: "4px" }}>NOMOR RESI</div>
                        <div style={{ fontWeight: 700, fontSize: "15px" }}>{order.trackingNumber}</div>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {/* Next Status Button */}
                      {cfg.next && (
                        <>
                          {cfg.next === "SHIPPED" ? (
                            <div style={{ display: "flex", gap: "8px", flex: 1, minWidth: "240px" }}>
                              <input
                                type="text"
                                placeholder="Nomor resi pengiriman..."
                                value={trackingInputs[order.id] || ""}
                                onChange={(e) => setTrackingInputs((p) => ({ ...p, [order.id]: e.target.value }))}
                                style={{ flex: 1, padding: "8px 12px", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "13px" }}
                              />
                              <button
                                disabled={submitting === order.id || !trackingInputs[order.id]}
                                onClick={() => updateStatus(order.id, "SHIPPED", trackingInputs[order.id])}
                                className="btn btn-primary btn-sm"
                              >
                                🚚 Kirim
                              </button>
                            </div>
                          ) : (
                            <button
                              disabled={submitting === order.id}
                              onClick={() => updateStatus(order.id, cfg.next!)}
                              className="btn btn-primary btn-sm"
                            >
                              {submitting === order.id ? "Memproses..." : cfg.nextLabel}
                            </button>
                          )}
                        </>
                      )}

                      {/* Cancel Button */}
                      {!["DELIVERED", "CANCELLED"].includes(order.status) && (
                        <button
                          disabled={submitting === order.id}
                          onClick={() => { if (confirm("Batalkan pesanan ini?")) updateStatus(order.id, "CANCELLED"); }}
                          className="btn btn-ghost btn-sm"
                          style={{ color: "hsl(var(--error))", border: "1px solid hsl(var(--error)/0.3)" }}
                        >
                          Batalkan
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
