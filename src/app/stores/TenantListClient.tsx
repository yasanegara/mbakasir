"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDateShort } from "@/lib/utils";

interface AgentTenantRow {
  id: string;
  name: string;
  businessType: string | null;
  address: string | null;
  phone: string | null;
  status: "ACTIVE" | "LOCKED" | "SUSPENDED" | "DORMANT";
  premiumUntil: Date | null;
  tokenUsed: number;
  createdAt: Date;
  _count: {
    users: number;
    products: number;
    sales: number;
    posTerminals: number;
  };
}

interface LicenseState {
  kind: "ACTIVE" | "LOCKED" | "SUSPENDED" | "DORMANT" | "NEVER_ACTIVATED";
  badgeClass: string;
  label: string;
  helper: string;
  expiryNote: string;
  accentColor: string;
  actionLabel: string;
}

export default function TenantListClient({
  tenants,
}: {
  tenants: AgentTenantRow[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (tenants.length === 0) {
    return (
      <div style={{ padding: "28px 20px" }}>
        <p style={{ fontSize: "14px", color: "hsl(var(--text-secondary))" }}>
          Belum ada toko yang terhubung ke akun agen ini.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "16px",
        padding: "20px",
      }}
    >
      {tenants.map((tenant) => {
        const licenseState = getLicenseState(tenant);
        const isExpanded = expandedId === tenant.id;

        return (
          <div
            key={tenant.id}
            style={{
              background: "hsl(var(--bg-card))",
              border: isExpanded
                ? "1px solid hsl(var(--primary) / 0.5)"
                : "1px solid hsl(var(--border))",
              borderRadius: "12px",
              padding: "18px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: isExpanded ? "0 4px 20px rgba(0,0,0,0.08)" : "none",
            }}
            onClick={() => setExpandedId(isExpanded ? null : tenant.id)}
          >
            {/* Header / Summary */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>
                  {tenant.name}
                </h3>
                <p style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", marginTop: "4px" }}>
                  {tenant.businessType || "Jenis usaha belum diisi"}
                </p>
              </div>
              <span className={`badge ${licenseState.badgeClass}`}>
                {licenseState.label}
              </span>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div
                style={{
                  marginTop: "20px",
                  paddingTop: "16px",
                  borderTop: "1px solid hsl(var(--border))",
                  display: "grid",
                  gap: "14px",
                  cursor: "default", // avoid pointer cursor everywhere inside
                }}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside content
              >
                <div>
                  <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>Kontak / Lokasi</div>
                  <div style={{ fontSize: "14px", fontWeight: 500, marginTop: "4px" }}>
                    {tenant.phone || tenant.address || "-"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>Status Lisensi</div>
                  <div style={{ fontSize: "14px", fontWeight: 500, marginTop: "4px", color: licenseState.accentColor }}>
                    {licenseState.expiryNote}
                  </div>
                  <div style={{ fontSize: "12px", color: "hsl(var(--text-secondary))", marginTop: "4px" }}>
                    {licenseState.helper}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                   <div style={{ background: "hsl(var(--bg-elevated))", padding: "10px", borderRadius: "8px" }}>
                     <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>Transaksi</div>
                     <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "2px" }}>
                       {tenant._count.sales.toLocaleString("id-ID")}
                     </div>
                   </div>
                   <div style={{ background: "hsl(var(--bg-elevated))", padding: "10px", borderRadius: "8px" }}>
                     <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>Token Terpakai</div>
                     <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "2px" }}>
                       {tenant.tokenUsed.toLocaleString("id-ID")}
                     </div>
                   </div>
                </div>

                <div style={{ fontSize: "12px", color: "hsl(var(--text-secondary))" }}>
                   {tenant._count.users} user • {tenant._count.products} produk • {tenant._count.posTerminals} POS • Bergabung {formatDateShort(tenant.createdAt)}
                </div>

                <Link
                  href="/tokens"
                  className={`btn ${licenseState.kind === "ACTIVE" ? "btn-ghost" : "btn-primary"}`}
                  style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}
                >
                  {licenseState.actionLabel}
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getLicenseState(tenant: AgentTenantRow): LicenseState {
  const isSuspended = tenant.status === "SUSPENDED";

  if (isSuspended) {
    return {
      kind: "SUSPENDED",
      badgeClass: "badge-error",
      label: "Suspend",
      helper: "Perlu review dari pusat sebelum bisa diaktifkan lagi",
      expiryNote: tenant.premiumUntil
        ? `Terakhir aktif sampai ${formatDateShort(tenant.premiumUntil)}`
        : "Belum ada masa aktif",
      accentColor: "hsl(var(--error))",
      actionLabel: "Cek Lisensi",
    };
  }

  if (tenant.status === "DORMANT") {
    return {
      kind: "DORMANT",
      badgeClass: "badge-warning",
      label: "Dorman",
      helper: "Toko sedang tidak aktif dan perlu follow-up dari agen",
      expiryNote: tenant.premiumUntil
        ? `Lisensi terakhir tercatat sampai ${formatDateShort(tenant.premiumUntil)}`
        : "Belum ada masa aktif",
      accentColor: "hsl(var(--warning))",
      actionLabel: "Tindak Lanjuti",
    };
  }

  if (!tenant.premiumUntil) {
    return {
      kind: "NEVER_ACTIVATED",
      badgeClass: "badge-warning",
      label: "Belum aktif",
      helper: "Belum pernah memakai lisensi toko",
      expiryNote: "Aktivasi awal diperlukan",
      accentColor: "hsl(var(--warning))",
      actionLabel: "Aktivasi",
    };
  }

  if (tenant.status === "LOCKED" || new Date(tenant.premiumUntil).getTime() < Date.now()) {
    return {
      kind: "LOCKED",
      badgeClass: "badge-warning",
      label: "Terkunci",
      helper: "Perlu aktivasi atau perpanjangan lisensi",
      expiryNote: `Masa aktif terakhir ${formatDateShort(tenant.premiumUntil)}`,
      accentColor: "hsl(var(--error))",
      actionLabel: "Perpanjang",
    };
  }

  return {
    kind: "ACTIVE",
    badgeClass: "badge-success",
    label: "Aktif",
    helper: "Toko siap beroperasi sesuai status lisensi",
    expiryNote: `Aktif sampai ${formatDateShort(tenant.premiumUntil)}`,
    accentColor: "hsl(var(--text-secondary))",
    actionLabel: "Atur Lisensi",
  };
}
