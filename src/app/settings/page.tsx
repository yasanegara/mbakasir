import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AgentSettingsClient from "@/components/settings/AgentSettingsClient";
import AgentVoucherManager from "@/components/settings/AgentVoucherManager";
import TokenSettingsClient from "@/components/settings/TokenSettingsClient";
import AgentPackageManager from "@/components/admin/AgentPackageManager";
import BrandConfigClient from "@/components/admin/BrandConfigClient";
import StoreProfileClient from "@/components/settings/StoreProfileClient";
import CashierCredentialsClient from "@/components/settings/CashierCredentialsClient";
import { getSession } from "@/lib/auth";
import { ensureDefaultPosTerminal } from "@/lib/pos-terminals";
import { prisma } from "@/lib/prisma";
import { ensureTokenConfig } from "@/lib/token-settings";
import { formatRupiahFull } from "@/lib/utils";
import { getBrandConfig } from "@/lib/brand-config";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const tokenConfig = await ensureTokenConfig();

  if (session.role === "SUPERADMIN") {
    const brandConfig = await getBrandConfig();
    return (
      <DashboardLayout title="Pengaturan">
        <div style={{ display: "grid", gap: "24px" }}>
          <BrandConfigClient initialConfig={brandConfig} />
          <TokenSettingsClient initialConfig={tokenConfig} />
          <AgentPackageManager tokenSymbol={tokenConfig.tokenSymbol} />
        </div>
      </DashboardLayout>
    );
  }

  if (session.role === "TENANT" && session.tenantId) {
    await ensureDefaultPosTerminal(prisma, session.tenantId);

    const tenant = await prisma.tenant.findUnique({
      where: {
        id: session.tenantId,
      },
      select: {
        name: true,
        tokenUsed: true,
        agent: {
          select: {
            name: true,
            tokenBalance: true,
          },
        },
        posTerminals: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
          select: {
            id: true,
            name: true,
            code: true,
            isDefault: true,
            isActive: true,
            tokenCost: true,
            createdAt: true,
          },
        },
      },
    });

    if (!tenant) {
      redirect("/login");
    }

    return (
      <DashboardLayout title="Pengaturan Toko">
        <div style={{ display: "grid", gap: "24px" }}>
          <StoreProfileClient
            tenantId={session.tenantId}
            initialStoreName={tenant.name}
          />
        </div>
      </DashboardLayout>
    );
  }

  if (session.role === "AGENT" && session.agentId) {
    const agentData = await prisma.agent.findUnique({
      where: { id: session.agentId },
      select: { tokenResalePrice: true, whatsappNumber: true, bankDetails: true },
    });

    if (!agentData) redirect("/login");

    return (
      <DashboardLayout title="Pengaturan Agen">
        <div style={{ display: "grid", gap: "24px" }}>
          <AgentSettingsClient
            initialResalePrice={Number(agentData.tokenResalePrice) || 0}
            initialWhatsappNumber={agentData.whatsappNumber || ""}
            initialBankDetails={agentData.bankDetails || ""}
            tokenName={tokenConfig.tokenName}
            tokenSymbol={tokenConfig.tokenSymbol}
          />
          <AgentVoucherManager />
        </div>
      </DashboardLayout>
    );
  }

  if (session.role === "CASHIER" && session.tenantId) {
    const cashier = await prisma.user.findFirst({
      where: {
        id: session.sub,
        tenantId: session.tenantId,
        role: "CASHIER",
        isActive: true,
      },
      select: {
        name: true,
        pin: true,
      },
    });

    if (!cashier) {
      redirect("/login");
    }

    return (
      <DashboardLayout title="PIN & Password">
        <CashierCredentialsClient
          cashierName={cashier.name}
          hasPin={Boolean(cashier.pin)}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Pengaturan">
      <div style={{ display: "grid", gap: "24px" }}>
        <section className="card">
          <h2 style={{ fontSize: "20px" }}>Pengaturan Umum</h2>
          <p style={{ marginTop: "8px", color: "hsl(var(--text-secondary))" }}>
            Halaman pengaturan lanjutan untuk role <strong>{session.role}</strong> belum dibuka.
          </p>
        </section>

        <section className="card">
          <h2 style={{ fontSize: "18px" }}>Ringkasan Token Saat Ini</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              marginTop: "18px",
            }}
          >
            <div className="stat-card">
              <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
                Nama Token
              </span>
              <span className="stat-value" style={{ fontSize: "24px" }}>
                {tokenConfig.tokenSymbol}
              </span>
              <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                {tokenConfig.tokenName}
              </span>
            </div>

            <div className="stat-card">
              <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
                Harga per Token
              </span>
              <span className="stat-value" style={{ fontSize: "24px" }}>
                {formatRupiahFull(tokenConfig.pricePerToken)}
              </span>
              <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                {tokenConfig.currencyCode}
              </span>
            </div>

            <div className="stat-card">
              <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
                Rule Konversi Aktif
              </span>
              <span className="stat-value" style={{ fontSize: "24px" }}>
                {tokenConfig.conversions.filter((conversion) => conversion.isActive).length}
              </span>
              <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                total {tokenConfig.conversions.length} aturan
              </span>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
