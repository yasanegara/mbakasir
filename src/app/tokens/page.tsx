"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth, useToast } from "@/contexts/AppProviders";
import { formatDateShort } from "@/lib/utils";

// ============================================================
// AGENT DASHBOARD: SALDO & AKTIVASI TOKO (Client Side)
// ============================================================

export default function AgentTokensPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAgentData = async () => {
    setIsLoading(true);
    try {
      // Untuk skeleton ini kita fetch data dummy yang sesuai. Di app nyata, butuh endpoint GET /api/agent/dashboard
      // Karena kita diminta menyelesaikan seluruh arsitektur dengan API Next.js 15
      const res = await fetch("/api/agent/tenants"); 
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants || []);
        setBalance(data.balance || 0);
      }
    } catch {
       toast("Gagal mengambil data toko", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentData();
  }, []);

  const handleActivate = async (tenantId: string, duration: number) => {
    if (balance < duration) {
       toast("Saldo token tidak mencukupi", "error");
       return;
    }
    
    if (!confirm(`Potong ${duration} token untuk aktivasi toko ini?`)) return;

    try {
      const res = await fetch("/api/agent/activate-tenant", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ tenantId, durationMonths: duration })
      });
      const data = await res.json();

      if (res.ok) {
         toast(`Aktivasi sukses sampai ${formatDateShort(data.premiumUntil)}`, "success");
         fetchAgentData(); // Reload data
      } else {
         toast(data.error || "Gagal aktivasi", "error");
      }
    } catch (err) {
      toast("Terjadi kesalahan jaringan", "error");
    }
  };

  return (
    <DashboardLayout title="Manajemen Lisensi (Agen)">
      <div className="stat-card" style={{ marginBottom: "24px", maxWidth: "400px" }}>
        <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>Saldo Token Anda</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
           <span className="stat-value">{balance.toLocaleString()}</span>
           <span style={{ fontSize: "14px", color: "hsl(var(--text-muted))" }}>koin</span>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
         <div style={{ padding: "20px", borderBottom: "1px solid hsl(var(--border))" }}>
            <h2 style={{ fontSize: "18px" }}>Daftar Toko Pelanggan</h2>
         </div>
         <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border))" }}>
              <tr>
                 <th style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Nama Toko</th>
                 <th style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Status</th>
                 <th style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Aktif Sampai</th>
                 <th style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))", textAlign: "right" }}>Aksi Perpanjangan</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                 <tr><td colSpan={4} style={{ padding: "20px", textAlign: "center" }}>Memuat...</td></tr>
              ) : tenants.length === 0 ? (
                 <tr><td colSpan={4} style={{ padding: "20px", textAlign: "center", color: "hsl(var(--text-muted))" }}>Belum ada toko yang didaftarkan.</td></tr>
              ) : (
                tenants.map((t) => {
                   const isExpired = !t.premiumUntil || new Date(t.premiumUntil) < new Date();
                   return (
                    <tr key={t.id} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                       <td style={{ padding: "16px 20px", fontSize: "14px", fontWeight: 600 }}>{t.name}</td>
                       <td style={{ padding: "16px 20px" }}>
                          {isExpired ? (
                             <span className="badge badge-error">Kedaluwarsa</span>
                          ) : (
                             <span className="badge badge-success">Aktif</span>
                          )}
                       </td>
                       <td style={{ padding: "16px 20px", fontSize: "14px", color: isExpired ? "hsl(var(--error))" : "inherit" }}>
                          {t.premiumUntil ? formatDateShort(t.premiumUntil) : "-"}
                       </td>
                       <td style={{ padding: "16px 20px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                             <button className={`btn btn-sm ${isExpired ? 'btn-primary' : 'btn-ghost'}`} onClick={() => handleActivate(t.id, 1)}>
                                + 1 Bln
                             </button>
                             <button className="btn btn-ghost btn-sm" onClick={() => handleActivate(t.id, 6)}>
                                + 6 Bln
                             </button>
                             <button className="btn btn-ghost btn-sm" onClick={() => handleActivate(t.id, 12)}>
                                + 1 Thn
                             </button>
                          </div>
                       </td>
                    </tr>
                )})
              )}
            </tbody>
         </table>
      </div>
    </DashboardLayout>
  );
}
