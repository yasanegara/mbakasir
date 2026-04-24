import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureTokenConfig } from "@/lib/token-settings";
import ActionManagerClient from "./ActionManagerClient";

export const dynamic = "force-dynamic";

export default async function TransaksiAgenPage() {
  const session = await getSession();

  if (!session || session.role !== "AGENT") {
    redirect("/login");
  }

  // Ambil token config untuk menghitung harga/konversi
  const tokenConfig = await ensureTokenConfig();

  // Ambil tenant yang ada di bawah agen ini
  const tenants = await prisma.tenant.findMany({
    where: { agentId: session.agentId },
    select: {
      id: true,
      name: true,
      premiumUntil: true,
      tokenUsed: true,
      posTerminals: {
        select: { id: true, name: true, isActive: true, isDefault: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // Ambil notifikasi request pembelian
  const requests = await prisma.tokenPurchaseRequest.findMany({
    where: { agentId: session.agentId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      tenant: { select: { id: true, name: true } }
    }
  });

  // Ambil data agen untuk saldo saat ini
  const agent = await prisma.agent.findUnique({
    where: { id: session.agentId },
    select: { tokenBalance: true, tokenResalePrice: true }
  });

  const serializedTenants = tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    premiumUntil: tenant.premiumUntil?.toISOString() ?? null,
    tokenUsed: tenant.tokenUsed,
    posTerminals: tenant.posTerminals.map((pos) => ({
      id: pos.id,
      name: pos.name,
      isActive: pos.isActive,
      isDefault: pos.isDefault,
    })),
  }));

  const serializedRequests = requests.map((request) => ({
    id: request.id,
    agentId: request.agentId,
    tenantId: request.tenantId,
    amount: request.amount,
    totalPrice: Number(request.totalPrice),
    voucherCode: request.voucherCode,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    tenant: request.tenant,
  }));

  return (
    <DashboardLayout title="Manajemen Pembelian & Aktivasi">
      
      <div style={{ display: "grid", gap: "24px" }}>
        {/* Info Saldo */}
        <div className="card" style={{ background: "hsl(var(--primary)/0.05)", border: "1px solid hsl(var(--primary)/0.2)" }}>
          <h2 style={{ fontSize: "16px", color: "hsl(var(--text-secondary))" }}>Sisa Jatah Token Anda</h2>
          <div style={{ fontSize: "32px", fontWeight: 700, color: "hsl(var(--primary))", marginTop: "8px" }}>
            {agent?.tokenBalance.toLocaleString("id-ID")} {tokenConfig.tokenSymbol}
          </div>
        </div>

        {/* Client component yang merender Request (Approve) & Manual Activate (Mint) */}
        <ActionManagerClient 
          requests={serializedRequests} 
          tenants={serializedTenants}
          tokenConfig={tokenConfig}
          agentId={session.agentId as string}
        />

      </div>
    </DashboardLayout>
  );
}
