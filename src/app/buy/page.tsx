import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import TokenMark from "@/components/ui/TokenMark";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureTokenConfig } from "@/lib/token-settings";
import { getBrandConfig } from "@/lib/brand-config";
import PurchaseFormClient from "./PurchaseFormClient";

export const dynamic = "force-dynamic";

export default async function BuyPage() {
  const session = await getSession();

  if (!session || session.role !== "TENANT" || !session.tenantId) {
    redirect("/dashboard");
  }

  const [tenant, tokenConfig, brandConfig, lastPurchase] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: session.tenantId },
      include: {
        agent: true,
      },
    }),
    ensureTokenConfig(),
    getBrandConfig(),
    prisma.tokenPurchaseRequest.findFirst({
      where: { tenantId: session.tenantId, status: "APPROVED" },
      orderBy: { createdAt: "desc" }
    })
  ]);

  if (!tenant) {
    redirect("/login");
  }

  const { agent } = tenant;
  // Ambil harga agen, jika 0 atau belum disetel, fallback ke harga standar pusat
  const tokenPrice = agent.tokenResalePrice && Number(agent.tokenResalePrice) > 0 
    ? Number(agent.tokenResalePrice) 
    : Number(tokenConfig.pricePerToken);

  // hitung harga historis terakhir 
  let lastPurchasePrice = null;
  if (lastPurchase && lastPurchase.amount > 0) {
    lastPurchasePrice = Number(lastPurchase.totalPrice) / lastPurchase.amount;
  }

  // Cek apakah agen adalah Pusat
  const isAgentPusat = agent.email === "pusat@mbakasir.local";
  
  // Ambil detail bank: Prioritas bankDetails Agen, fallback ke bankDetails Pusat jika agen adalah Pusat
  const effectiveBankDetails = agent.bankDetails || (isAgentPusat ? brandConfig.bankDetails : "");

  return (
    <DashboardLayout title="Pembelian Add-on & Lisensi">
      <div style={{ maxWidth: "600px", display: "grid", gap: "20px", margin: "0 auto" }}>
        
        <section className="card" style={{ textAlign: "center" }}>
          <div style={{ marginBottom: "16px", color: "hsl(var(--primary))" }}>
            <TokenMark size={48} strokeWidth={1.75} />
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
            agentBankDetails={effectiveBankDetails || ""}
            agentQrisUrl={agent.qrisUrl}
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
