import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardLayout from "@/components/layout/DashboardLayout";
import MarketplaceClient from "@/components/marketplace/MarketplaceClient";
import { ensureTokenConfig } from "@/lib/token-settings";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const session = await getSession();

  if (!session || session.role !== "TENANT") {
    redirect("/login");
  }

  const tokenConfig = await ensureTokenConfig();
  const activeAddons = tokenConfig.conversions.filter(c => c.isActive && c.targetKey !== "POS_SLOT");

  const tenant = (await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    include: {
      modules: true,
      storefront: true
    } as any
  })) as any;

  if (!tenant) redirect("/login");

  const activeModulesMap: Record<string, string> = {};
  
  // 1. Sync from TenantModules table
  tenant.modules.forEach((m: { moduleKey: string, activeUntil: Date }) => {
    activeModulesMap[m.moduleKey] = m.activeUntil.toISOString();
  });

  // 2. Sync from Legacy fields (License & Storefront)
  const now = new Date();
  if (tenant.premiumUntil && tenant.premiumUntil > now) {
    if (!activeModulesMap["LICENSE_MONTH"] || new Date(activeModulesMap["LICENSE_MONTH"]) < tenant.premiumUntil) {
      activeModulesMap["LICENSE_MONTH"] = tenant.premiumUntil.toISOString();
    }
  }
  if (tenant.storefront?.activeUntil && tenant.storefront.activeUntil > now) {
    if (!activeModulesMap["STOREFRONT_MONTH"] || new Date(activeModulesMap["STOREFRONT_MONTH"]) < tenant.storefront.activeUntil) {
      activeModulesMap["STOREFRONT_MONTH"] = tenant.storefront.activeUntil.toISOString();
    }
  }

  return (
    <DashboardLayout title="Add On">
      <MarketplaceClient 
        addons={activeAddons}
        activeModules={activeModulesMap}
      />
    </DashboardLayout>
  );
}
