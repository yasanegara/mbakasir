import {
  getAgentTokenPurchaseRequestDelegate,
  prisma,
} from "@/lib/prisma";
import { ensureTokenConfig } from "@/lib/token-settings";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AgentTokenRequestList from "@/components/admin/AgentTokenRequestList";
import { formatRupiahFull } from "@/lib/utils";
import AgentDistributionTable from "./AgentDistributionTable";
import BurnRatePanel from "./BurnRatePanel";

export const dynamic = "force-dynamic";

type PendingAgentTokenRequest = {
  id: string;
  packageName: string;
  tokenAmount: number;
  totalPrice: number | { toString(): string };
  createdAt: Date;
  agent: {
    name: string;
    email: string;
  };
};

// ============================================================
// SUPERADMIN DASHBOARD: MINT TOKEN + BURN RATE ANALYTICS
// ============================================================

export default async function AdminTokensPage({
  searchParams,
}: {
  searchParams: Promise<{ agentId?: string; amount?: string; reqId?: string }>;
}) {
  const params = await searchParams;
  const targetAgentId = params.agentId;
  const targetAmount = params.amount ? Number(params.amount) : undefined;

  const tokenConfig = await ensureTokenConfig();
  const agentTokenRequestDelegate = getAgentTokenPurchaseRequestDelegate(prisma);

  const [agents, ledger, rawPendingRequests, completedRequestsSummary] = await Promise.all([
    prisma.agent.findMany({
      where: { 
        email: { 
          notIn: ["agen.demo@mbakasir.id", "pusat@mbakasir.local"] 
        } 
      },
      orderBy: { createdAt: "desc" },
      include: {
        tenants: { select: { id: true } },
        agentTokenPurchaseRequests: {
          where: { status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { packageName: true }
        }
      },
    }),
    // Ledger transaksi konsumsi token (ACTIVATE, POS_ADD, ADJUST negatif)
    prisma.tokenLedger.findMany({
      where: { 
        type: { in: ["ACTIVATE", "POS_ADD", "ADJUST"] },
        agent: { 
          email: { 
            notIn: ["agen.demo@mbakasir.id", "pusat@mbakasir.local"] 
          } 
        }
      },
      select: {
        amount: true,
        createdAt: true,
        durationMonths: true,
        conversionQuantity: true,
        agentId: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    agentTokenRequestDelegate
      ? agentTokenRequestDelegate.findMany({
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            packageName: true,
            tokenAmount: true,
            totalPrice: true,
            agentId: true,
            createdAt: true,
            agent: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    // Ambil total harga nyata dari semua request yang sudah COMPLETED
    agentTokenRequestDelegate
      ? agentTokenRequestDelegate.aggregate({
          where: {
            status: "COMPLETED",
            agent: { 
              email: { 
                notIn: ["agen.demo@mbakasir.id", "pusat@mbakasir.local"] 
              } 
            },
          },
          _sum: { totalPrice: true },
        })
      : Promise.resolve({ _sum: { totalPrice: null } }),
  ]);
  const pendingRequests = rawPendingRequests as PendingAgentTokenRequest[];

  const tokenPrice = Number(tokenConfig.pricePerToken);
  const sym = tokenConfig.tokenSymbol;
  const activeConversions = tokenConfig.conversions.filter((c) => c.isActive);

  // ── Kalkulasi Global ────────────────────────────────────────
  // Filter agents for accounting (Exclude Family package and those who haven't bought tokens)
  const accountingAgents = agents.filter(a => {
    const pkg = a.agentTokenPurchaseRequests[0]?.packageName || "Family"; // Fallback to Family for keepers
    return pkg !== "Family" && pkg !== "Belum Membeli Token";
  });

  // Total token ter-mint (deposit masuk = pembelian agen ke pusat)
  const totalMinted = accountingAgents.reduce((s, a) => s + a.totalMinted, 0);
  // Total token terpakai (burn = aktivasi/perpanjangan toko)
  const totalBurned = accountingAgents.reduce((s, a) => s + a.totalUsed, 0);
  // Saldo sisa belum terpakai
  const totalBalance = accountingAgents.reduce((s, a) => s + a.tokenBalance, 0);

  // Nilai rupiah
  // Gunakan harga nyata dari transaksi COMPLETED (bukan estimasi berdasarkan harga token saat ini)
  // Filter out Family requests from revenue
  const totalDepositValue = Number(completedRequestsSummary._sum?.totalPrice ?? 0);
  // We need to re-calculate totalDepositValue if it includes Family.
  // Actually, I deleted most COMPLETED requests earlier.
  // Let's ensure we only count non-Family requests.
  const realDepositAggregate = await (agentTokenRequestDelegate as any).aggregate({
    where: {
      status: "COMPLETED",
      packageName: { notIn: ["Family", "Belum Membeli Token"] },
      agent: { 
        email: { 
          notIn: ["agen.demo@mbakasir.id", "pusat@mbakasir.local"] 
        } 
      },
    },
    _sum: { totalPrice: true },
  });
  const totalDepositValueFinal = Number(realDepositAggregate._sum?.totalPrice ?? 0) || (totalMinted * tokenPrice);

  const totalBurnedValue  = totalBurned  * tokenPrice;       // Nilai token terpakai
  const totalIdleValue    = totalBalance  * tokenPrice;      // Nilai saldo tidur belum dipakai

  // Persentase HPP dari DB (dapat diubah di Pengaturan Token)
  const HPP_RATIO = ((tokenConfig as any).hppRatio ?? 40) / 100;
  const estimatedRevenue   = totalBurnedValue;              // Revenue recognised dari token yang SUDAH dipakai
  const estimatedCogs      = estimatedRevenue * HPP_RATIO;  // Estimasi biaya operasional
  const estimatedGrossProfit = estimatedRevenue - estimatedCogs;
  const grossMarginPct     = estimatedRevenue > 0
    ? Math.round((estimatedGrossProfit / estimatedRevenue) * 100)
    : 0;

  // Burn rate per bulan (rata-rata 3 bulan terakhir)
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  
  // Filter ledger to exclude Family agents
  const accountingAgentIds = new Set(accountingAgents.map(a => a.id));
  const accountingLedger = ledger.filter(l => accountingAgentIds.has(l.agentId));

  const recent = accountingLedger.filter((l) => new Date(l.createdAt) >= threeMonthsAgo);
  const recentBurned = recent.reduce((s, l) => s + Math.abs(l.amount), 0);
  const burnRatePerMonth = Math.round(recentBurned / 3);

  // Runway bulan: berapa lama saldo sisa bisa "menghidupi" konsumsi
  const runwayMonths = burnRatePerMonth > 0
    ? Math.round(totalBalance / burnRatePerMonth)
    : null;

  // Breakdown bulanan (12 bulan terakhir untuk chart data)
  const monthlyBurn: Record<string, number> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyBurn[key] = 0;
  }
  accountingLedger.forEach((l) => {
    const d = new Date(l.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in monthlyBurn) {
      monthlyBurn[key] += Math.abs(l.amount);
    }
  });

  const analytics = {
    // Token counts
    totalMinted,
    totalBurned,
    totalBalance,
    burnRatePerMonth,
    runwayMonths,
    utilizationPct: totalMinted > 0 ? Math.round((totalBurned / totalMinted) * 100) : 0,
    // Value rupiah — gunakan nilai nyata dari transaksi, bukan estimasi harga
    totalDepositValue: totalDepositValueFinal,
    totalBurnedValue,
    totalIdleValue,
    // P&L
    estimatedRevenue,
    estimatedCogs,
    estimatedGrossProfit,
    grossMarginPct,
    HPP_RATIO,
    // Chart
    monthlyBurn,
    tokenSymbol: sym,
    tokenPrice,
  };

  return (
    <DashboardLayout title="Mint Token & Analitik">
      {pendingRequests.length > 0 && (
        <AgentTokenRequestList
          title={`Antrean Permintaan Token dari Agen (${pendingRequests.length})`}
          description="Gunakan antrean ini sebagai acuan saat memverifikasi transfer. Jika Anda mint token dengan jumlah yang sama seperti permintaan di bawah, request tertua yang cocok akan tertandai selesai otomatis."
          requests={pendingRequests.map((request) => ({
            id: request.id,
            packageName: request.packageName,
            tokenAmount: request.tokenAmount,
            totalPrice: Number(request.totalPrice),
            agentId: (request as any).agentId,
            createdAt: request.createdAt,
            agent: request.agent,
          }))}
          emptyMessage="Belum ada permintaan token dari agen."
        />
      )}

      {/* ── Burn Rate Analytics Panel ── */}
      <BurnRatePanel analytics={analytics} />

      {/* ── Stat Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", margin: "30px 0" }}>
        <div className="stat-card">
          <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>Total Agen Aktif</span>
          <span className="stat-value">{agents.filter((a) => a.isActive).length}</span>
        </div>
        <div className="stat-card">
          <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>Harga Jual / {sym}</span>
          <span className="stat-value" style={{ fontSize: "24px" }}>{formatRupiahFull(tokenPrice)}</span>
          <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>{tokenConfig.tokenName}</span>
        </div>
        <div className="stat-card">
          <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>Rule Konversi Aktif</span>
          <span className="stat-value" style={{ fontSize: "24px" }}>{activeConversions.length}</span>
          <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>dari {tokenConfig.conversions.length} aturan</span>
        </div>
        <div className="stat-card" style={{ background: "var(--gradient-primary)" }}>
          <span style={{ fontSize: "14px", color: "white", opacity: 0.8, fontWeight: 600 }}>Revenue Recognised</span>
          <span className="stat-value" style={{ color: "white", textShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
            {formatRupiahFull(estimatedRevenue)}
          </span>
          <span style={{ fontSize: "12px", color: "white", opacity: 0.75 }}>dari token terpakai</span>
        </div>
      </div>

      {/* ── Daftar Agen ── */}
      <AgentDistributionTable 
        agents={agents.map(a => {
          const keepers = ["mujahidaahmad@gmail.com", "gemini.rezhahmad@gmail.com"];
          let pkg = a.agentTokenPurchaseRequests[0]?.packageName;
          
          if (!pkg) {
            pkg = keepers.includes(a.email) ? "Family" : "Belum Membeli Token";
          }

          return {
            ...a,
            tokenResalePrice: Number(a.tokenResalePrice),
            packageName: pkg
          };
        })} 
        tokenSymbol={sym} 
        tokenPrice={tokenPrice}
        targetAgentId={targetAgentId}
        targetAmount={targetAmount}
      />
    </DashboardLayout>
  );
}
