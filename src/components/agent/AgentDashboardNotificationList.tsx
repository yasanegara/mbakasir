"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRupiahFull } from "@/lib/utils";

interface RequestItem {
  id: string;
  amount: number;
  totalPrice: any;
  voucherCode?: string | null;
  tenant: {
    name: string;
  };
}

interface AgentDashboardNotificationListProps {
  initialRequests: RequestItem[];
}

export default function AgentDashboardNotificationList({ initialRequests }: AgentDashboardNotificationListProps) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  async function handleReject(id: string) {
    if (!confirm("Hapus notifikasi ini? (Permintaan akan dibatalkan)")) return;
    
    setIsSubmitting(id);
    try {
      const res = await fetch(`/api/agent/purchase-requests/${id}/reject`, {
        method: "POST",
      });
      
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== id));
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Gagal menghapus notifikasi");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat menghapus");
    } finally {
      setIsSubmitting(null);
    }
  }

  if (requests.length === 0) return null;

  return (
    <section className="card" style={{ border: "1px solid hsl(var(--primary)/0.4)", background: "hsl(var(--primary)/0.03)" }}>
      <h3 style={{ fontSize: "16px", fontWeight: 700, color: "hsl(var(--primary))", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ display: "flex", width: "8px", height: "8px", background: "hsl(var(--primary))", borderRadius: "50%", boxShadow: "0 0 0 3px hsl(var(--primary)/0.2)" }} />
        Notifikasi Pembelian Baru ({requests.length})
      </h3>
      <div style={{ display: "grid", gap: "10px" }}>
        {requests.map((req) => (
          <div key={req.id} style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 16px",
            background: "hsl(var(--bg-card))",
            borderRadius: "10px",
            border: "1px solid hsl(var(--border))",
            gap: "12px",
            flexWrap: "wrap",
            opacity: isSubmitting === req.id ? 0.6 : 1,
            pointerEvents: isSubmitting === req.id ? "none" : "auto",
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: "15px" }}>{req.tenant.name}</div>
              <div style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", marginTop: "4px" }}>
                Meminta {req.amount} Token · Rp {Number(req.totalPrice).toLocaleString("id-ID")}
              </div>
              {req.voucherCode && (
                <div style={{ fontSize: "12px", color: "hsl(var(--warning))", marginTop: "4px", fontWeight: 600 }}>
                  Voucher: {req.voucherCode}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              <button 
                onClick={() => handleReject(req.id)}
                className="btn btn-sm"
                style={{ 
                  background: "transparent", 
                  color: "hsl(var(--error))", 
                  border: "1px solid hsl(var(--error)/0.3)" 
                }}
              >
                Hapus
              </button>
              <Link href="/agent/transaksi" className="btn btn-primary btn-sm">
                Proses →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
