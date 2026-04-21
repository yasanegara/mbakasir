import { prisma } from "@/lib/prisma";
import { ensureTokenConfig } from "@/lib/token-settings";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatRupiahFull } from "@/lib/utils";
import MintTokenClient from "./MintTokenClient";
import BurnRatePanel from "./BurnRatePanel";

export const dynamic = "force-dynamic";

// ============================================================
// SUPERADMIN DASHBOARD: MINT TOKEN + BURN RATE ANALYTICS
// ============================================================

export default async function AdminTokensPage() {
  const tokenConfig = await ensureTokenConfig();

  const [agents, ledger] = await Promise.all([
    prisma.agent.findMany({
      where: { email: { not: "agen.demo@mbakasir.id" } },
      orderBy: { createdAt: "desc" },
      include: {
        tenants: { select: { id: true } },
      },
    }),
    // Ledger semua transaksi ACTIVATE (konsumsi nyata token) - kecualikan akun demo
    prisma.tokenLedger.findMany({
      where: { 
        type: "ACTIVATE",
        agent: { email: { not: "agen.demo@mbakasir.id" } }
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
  ]);

  const tokenPrice = Number(tokenConfig.pricePerToken);
  const sym = tokenConfig.tokenSymbol;
  const activeConversions = tokenConfig.conversions.filter((c) => c.isActive);

  // ── Kalkulasi Global ────────────────────────────────────────
  // Total token ter-mint (deposit masuk = pembelian agen ke pusat)
  const totalMinted = agents.reduce((s, a) => s + a.totalMinted, 0);
  // Total token terpakai (burn = aktivasi/perpanjangan toko)
  const totalBurned = agents.reduce((s, a) => s + a.totalUsed, 0);
  // Saldo sisa belum terpakai
  const totalBalance = agents.reduce((s, a) => s + a.tokenBalance, 0);

  // Nilai rupiah
  const totalDepositValue = totalMinted * tokenPrice;       // Nilai total deposit masuk (= revenue bruto)
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
  const recent = ledger.filter((l) => new Date(l.createdAt) >= threeMonthsAgo);
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
  ledger.forEach((l) => {
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
    // Value rupiah
    totalDepositValue,
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
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "20px", borderBottom: "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "18px" }}>Distribusi Token per Agen</h2>
            <p style={{ marginTop: "4px", fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
              Harga token dan rule konversi dikelola dari pusat melalui halaman pengaturan.
            </p>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border))" }}>
            <tr>
              <th style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Nama Agen</th>
              <th style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Toko</th>
              <th style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Saldo</th>
              <th style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Terpakai</th>
              <th style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))", textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.id} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                <td style={{ padding: "16px 20px", fontSize: "14px", fontWeight: 600 }}>
                  {agent.name}
                  <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))", fontWeight: 400 }}>{agent.email}</div>
                </td>
                <td style={{ padding: "16px 20px", fontSize: "14px" }}>{agent.tenants.length} Toko</td>
                <td style={{ padding: "16px 20px", fontSize: "15px", fontWeight: 700, color: "hsl(var(--primary))" }}>
                  {agent.tokenBalance.toLocaleString()} <span style={{ fontSize: "11px" }}>{sym}</span>
                </td>
                <td style={{ padding: "16px 20px", fontSize: "14px", color: "hsl(var(--text-secondary))" }}>
                  {agent.totalUsed.toLocaleString()} <span style={{ fontSize: "11px" }}>{sym}</span>
                </td>
                <td style={{ padding: "16px 20px", textAlign: "right" }}>
                  <MintTokenClient agentId={agent.id} agentName={agent.name} tokenPrice={tokenPrice} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
