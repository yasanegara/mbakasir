import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StoreRegistrationLinkCard from "@/components/agent/StoreRegistrationLinkCard";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureTokenConfig } from "@/lib/token-settings";
import {
  formatTokenConversion,
  getTokenConversion,
} from "@/lib/token-settings-shared";
import {
  buildStoreRegistrationPath,
  buildStoreTrackingPath,
} from "@/lib/store-registration-shared";
import TenantListClient from "./TenantListClient";

export const dynamic = "force-dynamic";

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

export default async function AgentStoresPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "AGENT" || !session.agentId) {
    redirect("/dashboard");
  }

  const [tokenConfig, agent, activeRegistrationLink] = await Promise.all([
    ensureTokenConfig(),
    prisma.agent.findUnique({
      where: { id: session.agentId },
      select: {
        name: true,
        tokenBalance: true,
        tenants: {
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          select: {
            id: true,
            name: true,
            businessType: true,
            address: true,
            phone: true,
            status: true,
            premiumUntil: true,
            tokenUsed: true,
            createdAt: true,
            _count: {
              select: {
                users: true,
                products: true,
                sales: true,
                posTerminals: true,
              },
            },
          },
        },
      },
    }),
    prisma.storeRegistrationLink.findFirst({
      where: {
        agentId: session.agentId,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        token: true,
        defaultLinkType: true,
        pixelUrl: true,
        clickCount: true,
        lastClickedAt: true,
        useCount: true,
        createdAt: true,
        lastUsedAt: true,
      },
    }),
  ]);

  if (!agent) {
    redirect("/login");
  }

  const licenseConversion = getTokenConversion(tokenConfig, "LICENSE_MONTH");

  const totals = agent.tenants.reduce(
    (acc, tenant) => {
      const licenseState = getLicenseState(tenant);

      acc.total += 1;
      acc.tokensUsed += tenant.tokenUsed;
      acc.totalSales += tenant._count.sales;

      if (licenseState.kind === "ACTIVE") {
        acc.active += 1;
      }

      if (licenseState.kind === "SUSPENDED") {
        acc.suspended += 1;
      }

      if (licenseState.kind === "DORMANT") {
        acc.dormant += 1;
      }

      if (licenseState.kind === "NEVER_ACTIVATED") {
        acc.neverActivated += 1;
      }

      if (licenseState.kind === "LOCKED") {
        acc.locked += 1;
      }

      if (licenseState.kind !== "ACTIVE") {
        acc.needsAttention += 1;
      }

      return acc;
    },
    {
      total: 0,
      active: 0,
      locked: 0,
      suspended: 0,
      dormant: 0,
      neverActivated: 0,
      needsAttention: 0,
      tokensUsed: 0,
      totalSales: 0,
    }
  );

  const activationCapacity = licenseConversion
    ? Math.floor(agent.tokenBalance / Math.max(1, licenseConversion.tokenCost)) *
      Math.max(1, licenseConversion.rewardQuantity)
    : 0;

  return (
    <DashboardLayout title="Kelola Toko">
      <div style={{ display: "grid", gap: "24px" }}>
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
          }}
        >
          <div className="stat-card">
            <span
              style={{
                fontSize: "14px",
                color: "hsl(var(--text-secondary))",
                fontWeight: 600,
              }}
            >
              Total Toko
            </span>
            <span className="stat-value">{totals.total}</span>
            <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
              Portofolio toko yang Anda pegang
            </span>
          </div>

          <div className="stat-card">
            <span
              style={{
                fontSize: "14px",
                color: "hsl(var(--text-secondary))",
                fontWeight: 600,
              }}
            >
              Lisensi Aktif
            </span>
            <span className="stat-value">{totals.active}</span>
            <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
              {totals.neverActivated} toko belum pernah diaktivasi
            </span>
          </div>

          <div className="stat-card">
            <span
              style={{
                fontSize: "14px",
                color: "hsl(var(--text-secondary))",
                fontWeight: 600,
              }}
            >
              Perlu Tindak Lanjut
            </span>
            <span className="stat-value">{totals.needsAttention}</span>
            <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
              {totals.locked} terkunci, {totals.dormant} dorman, {totals.suspended} suspend
            </span>
          </div>

          <div
            className="stat-card"
            style={{ background: "var(--gradient-primary)" }}
          >
            <span
              style={{
                fontSize: "14px",
                color: "white",
                opacity: 0.8,
                fontWeight: 600,
              }}
            >
              Saldo {tokenConfig.tokenSymbol}
            </span>
            <span
              className="stat-value"
              style={{ color: "white", WebkitTextFillColor: "white" }}
            >
              {agent.tokenBalance.toLocaleString("id-ID")}
            </span>
            <span style={{ fontSize: "12px", color: "white", opacity: 0.82 }}>
              {licenseConversion
                ? `Setara sekitar ${activationCapacity.toLocaleString("id-ID")} ${licenseConversion.rewardUnit} aktivasi`
                : "Rule lisensi belum aktif dari pusat"}
            </span>
          </div>
        </section>

        <section
          className="card"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ fontSize: "18px" }}>Portofolio Toko {agent.name}</h2>
            <p
              style={{
                marginTop: "6px",
                fontSize: "14px",
                color: "hsl(var(--text-secondary))",
              }}
            >
              Pantau kesehatan lisensi, jejak operasional, dan toko yang perlu
              follow-up tanpa pindah-pindah layar.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {totals.needsAttention > 0 ? (
              <span className="badge badge-warning">
                {totals.needsAttention} toko perlu follow-up
              </span>
            ) : (
              <span className="badge badge-success">Lisensi stabil</span>
            )}

            <Link href="/tokens" className="btn btn-primary">
              Buka Aktivasi Lisensi
            </Link>
          </div>
        </section>

        <StoreRegistrationLinkCard
          initialLink={
            activeRegistrationLink
              ? {
                  id: activeRegistrationLink.id,
                  token: activeRegistrationLink.token,
                  path: buildStoreRegistrationPath(activeRegistrationLink.token),
                  directPath: buildStoreTrackingPath(activeRegistrationLink.token, "DIRECT"),
                  landingPath: buildStoreTrackingPath(activeRegistrationLink.token, "LANDING"),
                  defaultLinkType:
                    activeRegistrationLink.defaultLinkType === "LANDING"
                      ? "LANDING"
                      : "DIRECT",
                  pixelUrl: activeRegistrationLink.pixelUrl,
                  clickCount: activeRegistrationLink.clickCount,
                  lastClickedAt:
                    activeRegistrationLink.lastClickedAt?.toISOString() ?? null,
                  useCount: activeRegistrationLink.useCount,
                  createdAt: activeRegistrationLink.createdAt.toISOString(),
                  lastUsedAt:
                    activeRegistrationLink.lastUsedAt?.toISOString() ?? null,
                }
              : null
          }
        />

        <section className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "18px 20px",
              borderBottom: "1px solid hsl(var(--border))",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ fontSize: "18px" }}>Daftar Toko Kelolaan</h2>
              <p
                style={{
                  marginTop: "4px",
                  fontSize: "13px",
                  color: "hsl(var(--text-secondary))",
                }}
              >
                {licenseConversion
                  ? `Rule aktif: ${formatTokenConversion(licenseConversion)}.`
                  : "Rule aktivasi lisensi belum tersedia."}{" "}
                Total transaksi tercatat:{" "}
                {totals.totalSales.toLocaleString("id-ID")} penjualan dan{" "}
                {totals.tokensUsed.toLocaleString("id-ID")} token sudah
                dialokasikan.
              </p>
            </div>

            <span className="badge badge-primary">
              {agent.tenants.length} toko
            </span>
          </div>

          <TenantListClient tenants={agent.tenants} />
        </section>
      </div>
    </DashboardLayout>
  );
}

function getLicenseState(tenant: AgentTenantRow) {
  if (tenant.status === "SUSPENDED") {
    return {
      kind: "SUSPENDED" as const,
    };
  }

  if (tenant.status === "DORMANT") {
    return {
      kind: "DORMANT" as const,
    };
  }

  if (!tenant.premiumUntil) {
    return {
      kind: "NEVER_ACTIVATED" as const,
    };
  }

  if (tenant.status === "LOCKED" || tenant.premiumUntil.getTime() < Date.now()) {
    return {
      kind: "LOCKED" as const,
    };
  }

  return {
    kind: "ACTIVE" as const,
  };
}
