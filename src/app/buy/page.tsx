import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureTokenConfig } from "@/lib/token-settings";
import PurchaseFormClient from "./PurchaseFormClient";

export const dynamic = "force-dynamic";

export default async function BuyPage() {
  const session = await getSession();

  if (!session || session.role !== "TENANT" || !session.tenantId) {
    redirect("/dashboard");
  }

  const [tenant, tokenConfig, lastPurchase] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: session.tenantId },
      include: {
        agent: true,
      },
    }),
    ensureTokenConfig(),
    prisma.tokenPurchaseRequest.findFirst({
      where: { tenantId: session.tenantId, status: "APPROVED" },
      orderBy: { createdAt: "desc" }
    })
  ]);

  if (!tenant) {
    redirect("/login");
  }

  const { agent } = tenant;
  const tokenPrice = Number(agent.tokenResalePrice) || 0;

  // hitung harga historis terakhir 
  let lastPurchasePrice = null;
  if (lastPurchase && lastPurchase.amount > 0) {
    lastPurchasePrice = Number(lastPurchase.totalPrice) / lastPurchase.amount;
  }

  return (
    <DashboardLayout title="Pembelian Add-on & Lisensi">
      <div style={{ maxWidth: "600px", display: "grid", gap: "20px", margin: "0 auto" }}>
        
        <section className="card" style={{ textAlign: "center" }}>
          <div style={{ marginBottom: "16px", color: "hsl(var(--primary))" }}>
             <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                <path d="M12 18V6" />
             </svg>
          </div>
          <h2 style={{ fontSize: "22px" }}>Beli Token {tokenConfig.tokenSymbol}</h2>
          <p style={{ marginTop: "8px", color: "hsl(var(--text-secondary))", fontSize: "14px", lineHeight: "1.6" }}>
            Token digunakan sebagai alat ukur penambahan fitur premium (seperti Aktivasi Toko atau Terminal POS Tambahan). Konfirmasi pembelian ditangani secara langsung oleh agen {agent.name}.
          </p>

          <PurchaseFormClient 
            tokenPrice={tokenPrice}
            tokenSymbol={tokenConfig.tokenSymbol}
            agentName={agent.name}
            agentPhone={agent.whatsappNumber || ""}
            tenantName={tenant.name}
            agentBankDetails={agent.bankDetails || ""}
            lastPurchasePrice={lastPurchasePrice}
          />
        </section>

        <Link href="/dashboard" className="btn btn-ghost" style={{ justifyContent: "center" }}>
          Kembali ke Dashboard
        </Link>
      </div>
    </DashboardLayout>
  );
}
