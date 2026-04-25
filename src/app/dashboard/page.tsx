import { getSession } from "@/lib/auth";
import {
  getAgentTokenPurchaseRequestDelegate,
  prisma,
} from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AgentTokenRequestList, {
  type AgentTokenRequestItem,
} from "@/components/admin/AgentTokenRequestList";
import PosTerminalManager from "@/components/settings/PosTerminalManager";
import TenantLicenseCountdownCard from "@/components/tenant/TenantLicenseCountdownCard";
import TenantGreetingHero from "@/components/tenant/TenantGreetingHero";
import AddonManager from "@/components/tenant/AddonManager";
import TopProductsCarousel from "@/components/tenant/TopProductsCarousel";
import QuickAccess from "@/components/tenant/QuickAccess";
import { ensureDefaultPosTerminal } from "@/lib/pos-terminals";
import { ensureTokenConfig } from "@/lib/token-settings";
import {
  calculateTokenCostForQuantity,
  formatTokenConversion,
  getTokenConversion,
} from "@/lib/token-settings-shared";
import { formatRupiahFull } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  let tokenBalance = 0;
  let activeAddons: { name: string; type: string }[] = [];
  let agentRequests: any[] = [];
  let pendingAgentTokenRequestCount = 0;
  let pendingAgentTokenRequestTotalTokens = 0;
  let superAdminAgentRequests: AgentTokenRequestItem[] = [];
  const agentTokenRequestDelegate = getAgentTokenPurchaseRequestDelegate(prisma);
  
  const now = new Date();
  const announcements = await prisma.announcement.findMany({
    where: {
      isActive: true,
      OR: [{ targetRole: "ALL" }, { targetRole: session.role }],
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  if (session.role === "AGENT" && session.agentId) {
    const agent = await prisma.agent.findUnique({
      where: { id: session.agentId },
      select: { email: true, tokenBalance: true }
    });
    const isPusat = agent?.email === "pusat@mbakasir.local";
    const reqs = await prisma.tokenPurchaseRequest.findMany({
      where: { agentId: session.agentId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { tenant: { select: { name: true } } }
    });
    tokenBalance = agent?.tokenBalance || 0;
    (session as any).isPusat = isPusat;
    agentRequests = reqs;
  }

  if (session.role === "SUPERADMIN" && agentTokenRequestDelegate) {
    const [pendingCount, pendingAggregate, recentRequests] = await Promise.all([
      agentTokenRequestDelegate.count({
        where: { status: "PENDING" },
      }),
      agentTokenRequestDelegate.aggregate({
        where: { status: "PENDING" },
        _sum: { tokenAmount: true },
      }),
      agentTokenRequestDelegate.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          packageName: true,
          tokenAmount: true,
          totalPrice: true,
          createdAt: true,
          agent: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    pendingAgentTokenRequestCount = pendingCount;
    pendingAgentTokenRequestTotalTokens = pendingAggregate._sum.tokenAmount || 0;
    superAdminAgentRequests = recentRequests.map((request: any) => ({
      id: request.id,
      packageName: request.packageName,
      tokenAmount: request.tokenAmount,
      totalPrice: Number(request.totalPrice),
      createdAt: request.createdAt,
      agent: request.agent,
    }));
  }

  let tokenConfigObj: any = null;
  let tenantData: any = null;
  let posConversionObj: any = null;
  let licenseConversionObj: any = null;
  let approvedPurchasedTokens = 0;

  if (session.role === "TENANT" && session.tenantId) {
    await ensureDefaultPosTerminal(prisma, session.tenantId);

    const [tokenConfig, dbTenant, approvedPurchaseSummary] = await Promise.all([
      ensureTokenConfig(),
      prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: {
          name: true,
          tokenUsed: true,
          premiumUntil: true,
          agent: {
            // @ts-ignore
            select: { name: true, email: true, tokenBalance: true, tokenResalePrice: true }
          },
          posTerminals: {
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
            select: { id: true, name: true, code: true, isDefault: true, isActive: true, tokenCost: true, createdAt: true }
          }
        }
      }),
      prisma.tokenPurchaseRequest.aggregate({
        where: {
          tenantId: session.tenantId,
          status: "APPROVED",
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    tenantData = dbTenant;
    tokenConfigObj = tokenConfig;
    approvedPurchasedTokens = approvedPurchaseSummary._sum.amount || 0;

    activeAddons.push({ name: "Manajemen Resep (BoM)", type: "Fitur Gratis" });

    tenantData?.posTerminals.filter((p: any) => !p.isDefault).forEach((pos: any) => {
      activeAddons.push({
        name: `Terminal POS Tambahan: ${pos.name}`,
        type: `Add-on Berbayar (${pos.tokenCost} ${tokenConfig.tokenSymbol}/bulan)`,
      });
    });

    posConversionObj = getTokenConversion(tokenConfig, "POS_SLOT");
    licenseConversionObj = getTokenConversion(tokenConfig, "LICENSE_MONTH");
  }

  // Helpers untuk tampilan
  const agentTokenBalance = tenantData?.agent?.tokenBalance ?? 0;
  const isAgentPusat = tenantData?.agent?.email === "pusat@mbakasir.local";
  const tokenUsed = tenantData?.tokenUsed ?? 0;
  const tokenSymbol = tokenConfigObj?.tokenSymbol ?? "T.";
  const premiumUntil = tenantData?.premiumUntil ? new Date(tenantData.premiumUntil) : null;
  const initialPremiumRemainingMs = premiumUntil
    ? Math.max(0, premiumUntil.getTime() - Date.now())
    : 0;
  const isPremiumActive = premiumUntil ? premiumUntil > new Date() : false;
  const daysLeft = premiumUntil
    ? Math.max(0, Math.ceil((premiumUntil.getTime() - Date.now()) / 86400000))
    : 0;
  const activeTerminals = tenantData?.posTerminals?.filter((p: any) => p.isActive)?.length ?? 0;
  const addonCostPerMonth =
    tenantData?.posTerminals?.reduce((sum: number, terminal: any) => {
      if (!terminal.isDefault && terminal.isActive) {
        return sum + terminal.tokenCost;
      }

      return sum;
    }, 0) ?? 0;
  const licenseCostPerMonth = licenseConversionObj
    ? calculateTokenCostForQuantity(licenseConversionObj, 1)
    : 0;
  const renewalTokenCostPerMonth = licenseCostPerMonth + addonCostPerMonth;
  const renewalPriceEstimate =
    renewalTokenCostPerMonth > 0 && tenantData?.agent?.tokenResalePrice
      ? renewalTokenCostPerMonth * Number(tenantData.agent.tokenResalePrice)
      : null;
  const storeOwnedTokenBalance = Math.max(0, approvedPurchasedTokens - tokenUsed);
  const manualActivationGap = Math.max(0, tokenUsed - approvedPurchasedTokens);
  const renewalBreakdownParts: string[] = [];

  if (licenseCostPerMonth > 0) {
    renewalBreakdownParts.push(`${licenseCostPerMonth} ${tokenSymbol} lisensi inti`);
  }

  if (addonCostPerMonth > 0) {
    renewalBreakdownParts.push(`${addonCostPerMonth} ${tokenSymbol} add-on aktif`);
  }

  const renewalBreakdown =
    renewalBreakdownParts.length > 0
      ? renewalBreakdownParts.join(" + ")
      : null;
  const renewalEstimateLabel =
    renewalTokenCostPerMonth > 0
      ? `${renewalTokenCostPerMonth.toLocaleString("id-ID")} ${tokenSymbol}${
          renewalPriceEstimate && renewalPriceEstimate > 0
            ? ` (${formatRupiahFull(renewalPriceEstimate)})`
            : ""
        }`
      : null;
  const storeTokenCaption =
    approvedPurchasedTokens <= 0
      ? "Belum ada pembelian token toko yang disetujui agen"
      : manualActivationGap > 0
        ? `Estimasi minimum. Ada ${manualActivationGap.toLocaleString("id-ID")} ${tokenSymbol} aktivasi manual di luar riwayat pembelian`
        : `Sisa dari ${approvedPurchasedTokens.toLocaleString("id-ID")} ${tokenSymbol} pembelian yang sudah disetujui agen`;

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 11 ? "Selamat pagi" :
    greetingHour < 15 ? "Selamat siang" :
    greetingHour < 18 ? "Selamat sore" : "Selamat malam";

  return (
    <DashboardLayout title="Dashboard">
      <div style={{ display: "grid", gap: "24px" }}>

        {/* ── GREETING HERO ─────────────────────────────────────── */}
        {session.role === "TENANT" && tenantData ? (
          <TenantGreetingHero
            userName={session.name}
            tenantName={tenantData.name}
            agentName={tenantData.agent?.name ?? "Tidak ada agen"}
            greeting={greeting}
            premiumUntilIso={tenantData.premiumUntil?.toISOString() ?? null}
            initialRemainingMs={initialPremiumRemainingMs}
            sisaToken={storeOwnedTokenBalance}
            tokenTerpakai={tokenUsed}
          />
        ) : (
          <div style={{
            background: "var(--gradient-primary)",
            borderRadius: "20px",
            padding: "clamp(20px, 4vw, 32px) clamp(20px, 5vw, 36px)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}>
            <div>
              <p style={{ fontSize: "13px", opacity: 0.8, marginBottom: "4px", fontWeight: 500 }}>
                {greeting}, 👋
              </p>
              <h2 style={{ fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 800, margin: 0 }}>
                {session.name}
              </h2>
              {session.role === "AGENT" && (
                <p style={{ fontSize: "13px", marginTop: "6px", opacity: 0.85 }}>
                  Role: Agen Reseller
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── TOP PRODUCTS CAROUSEL ───────────────────────────── */}
        {session.role === "TENANT" && <TopProductsCarousel />}

        {/* ── PENGUMUMAN DARI SUPERADMIN ────────────────────────── */}
        {announcements.length > 0 && (
          <div style={{ display: "grid", gap: "12px" }}>
            {announcements.map((ann) => {
              const types: any = {
                info: { icon: "ℹ️", color: "hsl(var(--primary))", bg: "hsl(var(--primary)/0.08)" },
                success: { icon: "✅", color: "hsl(var(--success))", bg: "hsl(var(--success)/0.08)" },
                warning: { icon: "⚠️", color: "hsl(var(--warning))", bg: "hsl(var(--warning)/0.08)" },
                error: { icon: "🚨", color: "hsl(var(--error))", bg: "hsl(var(--error)/0.08)" }
              };
              const t = types[ann.type] || types.info;
              return (
                <div key={ann.id} style={{
                  padding: "16px 20px",
                  borderRadius: "12px",
                  background: t.bg,
                  border: `1px solid ${t.color}44`,
                  borderLeft: `4px solid ${t.color}`,
                  display: "flex",
                  gap: "14px",
                  alignItems: "flex-start",
                }}>
                  <span style={{ fontSize: "24px", flexShrink: 0, marginTop: "2px" }}>{t.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: t.color, fontSize: "15px", marginBottom: "4px" }}>
                      {ann.title}
                    </div>
                    <div style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", lineHeight: 1.5 }}>
                      {ann.content}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── SUPERADMIN DASHBOARD ─────────────────────────────── */}
        {session.role === "SUPERADMIN" && (
          <div style={{ display: "grid", gap: "24px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
              }}
            >
              <div className="stat-card" style={{ background: "var(--gradient-primary)" }}>
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                  🔔 Permintaan Token Agen
                </span>
                <span className="stat-value" style={{ color: "white", WebkitTextFillColor: "white" }}>
                  {pendingAgentTokenRequestCount}
                </span>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
                  antrean pembelian yang masih pending
                </span>
              </div>
              <div className="stat-card">
                <span style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
                  🪙 Total Token Diminta
                </span>
                <span className="stat-value">
                  {pendingAgentTokenRequestTotalTokens.toLocaleString("id-ID")}
                </span>
                <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                  akumulasi dari semua request pending
                </span>
              </div>
            </div>

            <AgentTokenRequestList
              title={`Notifikasi Pembelian Agen (${pendingAgentTokenRequestCount})`}
              description="Setiap kali agen memesan paket token ke pusat, antreannya muncul di sini. Saat Anda melakukan mint dengan jumlah token yang sama, request tertua yang cocok akan selesai otomatis."
              requests={superAdminAgentRequests}
              emptyMessage="Belum ada permintaan token dari agen."
              actionHref="/admin/tokens"
              actionLabel="Buka Mint Token"
              additionalPendingCount={Math.max(
                0,
                pendingAgentTokenRequestCount - superAdminAgentRequests.length
              )}
            />
          </div>
        )}

        {/* ── TENANT DASHBOARD ──────────────────────────────────── */}
        {session.role === "TENANT" && tenantData && (
          <div style={{ display: "grid", gap: "24px" }}>



            {/* PERINGATAN MASA AKTIF */}
            {isPremiumActive && daysLeft <= 7 && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "16px 20px",
                background: "hsl(var(--warning)/0.08)",
                border: "1px solid hsl(var(--warning)/0.3)",
                borderRadius: "12px",
              }}>
                <span style={{ fontSize: "24px", flexShrink: 0 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, color: "hsl(var(--warning))", fontSize: "14px" }}>
                    Masa aktif hampir habis — {daysLeft} hari lagi
                  </div>
                  <div style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", marginTop: "2px" }}>
                    {renewalEstimateLabel
                      ? `Siapkan sekitar ${renewalEstimateLabel} untuk perpanjangan 1 bulan berikutnya sebelum toko terkunci.`
                      : "Segera beli token untuk perpanjang akses sebelum toko terkunci."}
                  </div>
                </div>
                <Link href="/buy" className="btn btn-sm" style={{
                  marginLeft: "auto",
                  background: "hsl(var(--warning))",
                  color: "white",
                  border: "none",
                  flexShrink: 0,
                }}>
                  Perpanjang
                </Link>
              </div>
            )}

            {!isPremiumActive && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "16px 20px",
                background: "hsl(var(--error)/0.07)",
                border: "1px solid hsl(var(--error)/0.3)",
                borderRadius: "12px",
              }}>
                <span style={{ fontSize: "24px", flexShrink: 0 }}>🔒</span>
                <div>
                  <div style={{ fontWeight: 700, color: "hsl(var(--error))", fontSize: "14px" }}>
                    Toko Anda tidak aktif
                  </div>
                  <div style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", marginTop: "2px" }}>
                    {renewalEstimateLabel
                      ? `Siapkan minimal ${renewalEstimateLabel} lalu minta agen mengaktifkan kembali langganan Anda.`
                      : "Beli token dan minta agen untuk mengaktifkan langganan."}
                  </div>
                </div>
                <Link href="/buy" className="btn btn-sm btn-primary" style={{ marginLeft: "auto", flexShrink: 0 }}>
                  Aktifkan
                </Link>
              </div>
            )}

            {/* AKSES CEPAT (Client Component) */}
            <QuickAccess />

            {/* ── FITUR & ADDONS ────────────────────────────────── */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media (min-width: 800px) {
                .forced-2col { grid-template-columns: 1fr 1fr !important; }
              }
            `}} />
            <div className="forced-2col" style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr", 
              gap: "24px", 
              alignItems: "start" 
            }}>
              {/* FITUR AKTIF */}
              <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ paddingBottom: "14px", borderBottom: "1px solid hsl(var(--border))", marginBottom: "18px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 700 }}>🎛️ Fitur Aktif</h3>
                  <p style={{ color: "hsl(var(--text-secondary))", fontSize: "13px", marginTop: "4px" }}>
                    Modul dan add-on yang aktif pada toko Anda saat ini.
                  </p>
                </div>
                {activeAddons.length === 0 ? (
                  <div style={{ padding: "24px", textAlign: "center", border: "1px dashed hsl(var(--border))", borderRadius: "12px" }}>
                    <p style={{ color: "hsl(var(--text-muted))", fontSize: "14px" }}>Belum ada add-on aktif.</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" }}>
                    {activeAddons.map((addon, i) => (
                      <div key={i} style={{
                        padding: "16px 18px",
                        background: "hsl(var(--bg-elevated))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}>
                        <span style={{ fontWeight: 600, fontSize: "14px", lineHeight: "1.4" }}>{addon.name}</span>
                        <span
                          className={addon.type.includes("Gratis") ? "badge badge-success" : "badge badge-info"}
                          style={{ alignSelf: "flex-start", fontSize: "11px" }}
                        >
                          {addon.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FITUR TERSEDIA (Addon Manager) */}
              <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ paddingBottom: "14px", borderBottom: "1px solid hsl(var(--border))", marginBottom: "18px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 700 }}>🎁 Fitur Tersedia</h3>
                  <p style={{ color: "hsl(var(--text-secondary))", fontSize: "13px", marginTop: "4px" }}>
                    Aktifkan fitur tambahan untuk meningkatkan fungsionalitas toko Anda.
                  </p>
                </div>
                <AddonManager />
              </div>
            </div>

            {/* TERMINAL POS */}
            <PosTerminalManager
              tenantName={tenantData.name}
              agentName={tenantData.agent.name}
              tokenSymbol={tokenConfigObj.tokenSymbol}
              posRuleLabel={posConversionObj ? formatTokenConversion(posConversionObj) : null}
              posTokenCost={posConversionObj ? calculateTokenCostForQuantity(posConversionObj, 1) : null}
              initialAgentBalance={tenantData.agent.tokenBalance}
              initialTokenUsed={tenantData.tokenUsed}
              initialTerminals={tenantData.posTerminals.map((t: any) => ({
                id: t.id,
                name: t.name,
                code: t.code,
                isDefault: t.isDefault,
                isActive: t.isActive,
                tokenCost: t.tokenCost,
                createdAt: t.createdAt.toISOString(),
              }))}
            />
          </div>
        )}

        {/* ── AGENT DASHBOARD ───────────────────────────────────── */}
        {session.role === "AGENT" && (
          <div style={{ display: "grid", gap: "24px" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
            }}>
              <div className="stat-card" style={{ background: "var(--gradient-primary)" }}>
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                  🪙 Sisa Token Anda
                </span>
                <span className="stat-value" style={{ color: "white", WebkitTextFillColor: "white" }}>
                  {(session as any).isPusat ? "∞ Unmetered" : tokenBalance.toLocaleString("id-ID")}
                </span>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
                  Siap didistribusikan ke toko
                </span>
              </div>
              <div className="stat-card">
                <span style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
                  🔔 Permintaan Masuk
                </span>
                <span className="stat-value">{agentRequests.length}</span>
                <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                  pembelian token menunggu
                </span>
              </div>
            </div>

            {/* WA GROUP BANNER */}
            <a 
              href="https://chat.whatsapp.com/HfRqUhN3CXu98k4qFsMfsY?mode=gi_t"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "20px",
                padding: "24px 28px",
                borderRadius: "20px",
                background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                boxShadow: "0 10px 25px -5px rgba(37, 211, 102, 0.4)",
                color: "white",
                transition: "transform 0.2s, box-shadow 0.2s",
                cursor: "pointer",
                flexWrap: "wrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 15px 30px -5px rgba(37, 211, 102, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 10px 25px -5px rgba(37, 211, 102, 0.4)";
              }}
            >
              <div style={{ display: "flex", gap: "18px", alignItems: "center" }}>
                <div style={{
                  width: "52px",
                  height: "52px",
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                }}>
                  💬
                </div>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>Join Grup WA Agen</h3>
                  <p style={{ fontSize: "14px", margin: "4px 0 0", opacity: 0.9 }}>
                    Terhubung dengan tim pusat dan sesama Agen MbaKasir di Indonesia.
                  </p>
                </div>
              </div>
              <div style={{
                background: "white",
                color: "#128C7E",
                padding: "10px 20px",
                borderRadius: "99px",
                fontWeight: 800,
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                Gabung Sekarang 
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </a>

            {agentRequests.length > 0 && (
              <section className="card" style={{ border: "1px solid hsl(var(--primary)/0.4)", background: "hsl(var(--primary)/0.03)" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "hsl(var(--primary))", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ display: "flex", width: "8px", height: "8px", background: "hsl(var(--primary))", borderRadius: "50%", boxShadow: "0 0 0 3px hsl(var(--primary)/0.2)" }} />
                  Notifikasi Pembelian Baru ({agentRequests.length})
                </h3>
                <div style={{ display: "grid", gap: "10px" }}>
                  {agentRequests.map((req) => (
                    <div key={req.id} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px 16px",
                      background: "hsl(var(--bg-card))",
                      borderRadius: "10px",
                      border: "1px solid hsl(var(--border))",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "15px" }}>{req.tenant.name}</div>
                        <div style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", marginTop: "4px" }}>
                          Meminta {req.amount} Token · Rp {Number(req.totalPrice).toLocaleString("id-ID")}
                        </div>
                        {req.voucherCode && (
                          <div style={{ fontSize: "12px", color: "hsl(var(--warning))", marginTop: "4px", fontWeight: 600 }}>
                            Voucher: {req.voucherCode}
                          </div>
                        )}
                      </div>
                      <Link href="/agent/transaksi" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
                        Proses →
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
