"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth, useToast } from "@/contexts/AppProviders";
import { formatDateShort } from "@/lib/utils";
import OrderTokenClient from "./OrderTokenClient";
import TokenLedgerModal from "@/components/ui/TokenLedgerModal";
import {
  calculateTokenCostForQuantity,
  formatTokenConversion,
  type TokenConversionSnapshot,
} from "@/lib/token-settings-shared";

interface AgentTenant {
  id: string;
  name: string;
  status: "ACTIVE" | "LOCKED" | "SUSPENDED" | "DORMANT";
  premiumUntil: string | null;
  addonsCostPerMonth: number;
}

interface AgentTokenConfig {
  tokenName: string;
  tokenSymbol: string;
}

// ============================================================
// AGENT DASHBOARD: SALDO & AKTIVASI TOKO (Client Side)
// ============================================================

export default function AgentTokensPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<AgentTenant[]>([]);
  const [balance, setBalance] = useState(0);
  const [tokenConfig, setTokenConfig] = useState<AgentTokenConfig>({
    tokenName: "SuperToken",
    tokenSymbol: "T.",
  });
  const [licenseConversion, setLicenseConversion] = useState<TokenConversionSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  function applyAgentData(data: {
    tenants?: AgentTenant[];
    balance?: number;
    tokenConfig?: AgentTokenConfig;
    licenseConversion?: TokenConversionSnapshot | null;
  }) {
    setTenants(data.tenants || []);
    setBalance(data.balance || 0);
    setTokenConfig(data.tokenConfig || { tokenName: "SuperToken", tokenSymbol: "T." });
    setLicenseConversion(data.licenseConversion || null);
  }

  async function readAgentData() {
    const res = await fetch("/api/agent/tenants");
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Gagal mengambil data toko");
    }

    return data;
  }

  const fetchAgentData = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const data = await readAgentData();
      applyAgentData(data);
    } catch {
       toast("Gagal mengambil data toko", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    async function loadInitialData() {
      try {
        const data = await readAgentData();
        if (isCancelled) return;
        applyAgentData(data);
      } catch {
        if (isCancelled) return;
        toast("Gagal mengambil data toko", "error");
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      isCancelled = true;
    };
  }, [toast]);

  const handleActivate = async (tenantId: string, duration: number) => {
    if (!licenseConversion) {
       toast("Rule lisensi belum aktif. Hubungi Super Admin.", "error");
       return;
    }

    const tokenCost = calculateTokenCostForQuantity(licenseConversion, duration);

    try {
      // Find the cost from local state to verify
      const tenant = tenants.find(t => t.id === tenantId);
      const expectedBase = licenseConversion ? calculateTokenCostForQuantity(licenseConversion, duration) : duration;
      const expectedAddons = (tenant?.addonsCostPerMonth || 0) * duration;
      const expectedTotal = expectedBase + expectedAddons;

      if (balance < expectedTotal) {
         toast(`Saldo ${tokenConfig.tokenSymbol} tidak mencukupi`, "error");
         return;
      }
      
      if (!confirm(`Potong ${expectedTotal} ${tokenConfig.tokenSymbol} untuk aktivasi (${duration} ${licenseConversion.rewardUnit} + Add-ons Aktif)?`)) return;

      const res = await fetch("/api/agent/activate-tenant", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ tenantId, durationMonths: duration })
      });
      const data = await res.json();

      if (res.ok) {
         toast(`Aktivasi sukses sampai ${formatDateShort(data.premiumUntil)}`, "success");
         void fetchAgentData(); // Reload data
      } else {
         toast(data.error || "Gagal aktivasi", "error");
      }
    } catch {
      toast("Terjadi kesalahan jaringan", "error");
    }
  };

  function getTenantStatusBadge(tenant: AgentTenant) {
    if (tenant.status === "SUSPENDED") {
      return { className: "badge-error", label: "Suspend" };
    }

    if (tenant.status === "DORMANT") {
      return { className: "badge-warning", label: "Dorman" };
    }

    if (!tenant.premiumUntil) {
      return { className: "badge-warning", label: "Belum aktif" };
    }

    if (tenant.status === "LOCKED" || new Date(tenant.premiumUntil) < new Date()) {
      return { className: "badge-warning", label: "Kedaluwarsa" };
    }

    return { className: "badge-success", label: "Aktif" };
  }

  return (
    <DashboardLayout title="Manajemen Lisensi (Agen)">
      <div 
        className="stat-card" 
        style={{ 
          marginBottom: "24px", 
          maxWidth: "400px"
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>Saldo {tokenConfig.tokenName} Anda</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setIsLedgerOpen(true)}
            style={{ whiteSpace: "nowrap", flexShrink: 0 }}
          >
            Lihat Riwayat
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
           <span className="stat-value">
             {user?.email === "pusat@mbakasir.local" ? "∞ Unmetered" : balance.toLocaleString()}
           </span>
           <span style={{ fontSize: "14px", color: "hsl(var(--text-muted))" }}>{tokenConfig.tokenSymbol}</span>
        </div>
        {licenseConversion && (
          <span style={{ marginTop: "8px", fontSize: "12px", color: "hsl(var(--text-muted))" }}>
            Rule aktif: {formatTokenConversion(licenseConversion)}
          </span>
        )}
        
        <OrderTokenClient 
          agentName={user?.name || "Agen"} 
          tokenSymbol={tokenConfig.tokenSymbol} 
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
         <div style={{ padding: "20px", borderBottom: "1px solid hsl(var(--border))" }}>
            <h2 style={{ fontSize: "18px" }}>Daftar Toko Pelanggan</h2>
            {licenseConversion && (
              <p style={{ marginTop: "6px", fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
                Aktivasi lisensi memakai rule: {licenseConversion.tokenCost} {tokenConfig.tokenSymbol} untuk {licenseConversion.rewardQuantity} {licenseConversion.rewardUnit}.
              </p>
            )}
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
                   const isExpired =
                     t.status === "LOCKED" ||
                     t.status === "SUSPENDED" ||
                     !t.premiumUntil ||
                     new Date(t.premiumUntil) < new Date();
                   const statusBadge = getTenantStatusBadge(t);
                   const base1M = licenseConversion ? calculateTokenCostForQuantity(licenseConversion, 1) : 1;
                   const base6M = licenseConversion ? calculateTokenCostForQuantity(licenseConversion, 6) : 6;
                   const base12M = licenseConversion ? calculateTokenCostForQuantity(licenseConversion, 12) : 12;

                   const cost1Month = base1M + (t.addonsCostPerMonth * 1);
                   const cost6Months = base6M + (t.addonsCostPerMonth * 6);
                   const cost12Months = base12M + (t.addonsCostPerMonth * 12);
                   return (
                    <tr key={t.id} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                       <td style={{ padding: "16px 20px", fontSize: "14px", fontWeight: 600 }}>{t.name}</td>
                       <td style={{ padding: "16px 20px" }}>
                          <span className={`badge ${statusBadge.className}`}>{statusBadge.label}</span>
                       </td>
                       <td style={{ padding: "16px 20px", fontSize: "14px", color: isExpired ? "hsl(var(--error))" : "inherit" }}>
                          {t.premiumUntil ? formatDateShort(t.premiumUntil) : "-"}
                       </td>
                       <td style={{ padding: "16px 20px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                             <button className={`btn btn-sm ${isExpired ? 'btn-primary' : 'btn-ghost'}`} onClick={() => handleActivate(t.id, 1)}>
                                + 1 Bln ({cost1Month})
                             </button>
                             <button className="btn btn-ghost btn-sm" onClick={() => handleActivate(t.id, 6)}>
                                + 6 Bln ({cost6Months})
                             </button>
                             <button className="btn btn-ghost btn-sm" onClick={() => handleActivate(t.id, 12)}>
                                + 1 Thn ({cost12Months})
                             </button>
                          </div>
                       </td>
                    </tr>
                )})
              )}
            </tbody>
         </table>
      </div>

      <TokenLedgerModal 
        isOpen={isLedgerOpen} 
        onClose={() => setIsLedgerOpen(false)} 
        title={`Riwayat ${tokenConfig.tokenName}`}
      />
    </DashboardLayout>
  );
}
