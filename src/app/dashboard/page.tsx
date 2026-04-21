import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PosTerminalManager from "@/components/settings/PosTerminalManager";
import { ensureDefaultPosTerminal } from "@/lib/pos-terminals";
import { ensureTokenConfig } from "@/lib/token-settings";
import {
  calculateTokenCostForQuantity,
  formatTokenConversion,
  getTokenConversion,
} from "@/lib/token-settings-shared";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  let tokenBalance = 0;
  let activeAddons: { name: string; type: string }[] = [];
  let agentRequests: any[] = [];
  
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
      select: { tokenBalance: true }
    });
    const reqs = await prisma.tokenPurchaseRequest.findMany({
      where: { agentId: session.agentId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { tenant: { select: { name: true } } }
    });
    tokenBalance = agent?.tokenBalance || 0;
    agentRequests = reqs;
  }

  let tokenConfigObj: any = null;
  let tenantData: any = null;
  let posConversionObj: any = null;

  if (session.role === "TENANT" && session.tenantId) {
    await ensureDefaultPosTerminal(prisma, session.tenantId);

    const [tokenConfig, dbTenant] = await Promise.all([
      ensureTokenConfig(),
      prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: {
          name: true,
          tokenUsed: true,
          premiumUntil: true,
          agent: {
            // @ts-ignore
            select: { name: true, tokenBalance: true, tokenResalePrice: true }
          },
          posTerminals: {
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
            select: { id: true, name: true, code: true, isDefault: true, isActive: true, tokenCost: true, createdAt: true }
          }
        }
      })
    ]);

    tenantData = dbTenant;
    tokenConfigObj = tokenConfig;

    activeAddons.push({ name: "Manajemen Resep (BoM)", type: "Fitur Gratis" });

    tenantData?.posTerminals.filter((p: any) => !p.isDefault).forEach((pos: any) => {
      activeAddons.push({ name: `Terminal POS Tambahan: ${pos.name}`, type: `Add-on Berbayar (${pos.tokenCost} Token)` });
    });

    posConversionObj = getTokenConversion(tokenConfig, "POS_SLOT");
  }

  // Helpers untuk tampilan
  const agentTokenBalance = tenantData?.agent?.tokenBalance ?? 0;
  const tokenUsed = tenantData?.tokenUsed ?? 0;
  const premiumUntil = tenantData?.premiumUntil ? new Date(tenantData.premiumUntil) : null;
  const isPremiumActive = premiumUntil ? premiumUntil > new Date() : false;
  const daysLeft = premiumUntil
    ? Math.max(0, Math.ceil((premiumUntil.getTime() - Date.now()) / 86400000))
    : 0;
  const activeTerminals = tenantData?.posTerminals?.filter((p: any) => p.isActive)?.length ?? 0;

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 11 ? "Selamat pagi" :
    greetingHour < 15 ? "Selamat siang" :
    greetingHour < 18 ? "Selamat sore" : "Selamat malam";

  return (
    <DashboardLayout title="Dashboard">
      <div style={{ display: "grid", gap: "24px" }}>

        {/* ── GREETING HERO ─────────────────────────────────────── */}
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
            {session.role === "TENANT" && tenantData && (
              <p style={{ fontSize: "13px", marginTop: "6px", opacity: 0.85 }}>
                🏪 {tenantData.name} &nbsp;·&nbsp; Agen: {tenantData.agent?.name}
              </p>
            )}
            {session.role === "AGENT" && (
              <p style={{ fontSize: "13px", marginTop: "6px", opacity: 0.85 }}>
                Role: Agen Reseller
              </p>
            )}
          </div>
          {session.role === "TENANT" && (
            <Link
              href="/buy"
              className="btn"
              style={{
                background: "rgba(255,255,255,0.18)",
                color: "white",
                border: "1.5px solid rgba(255,255,255,0.35)",
                backdropFilter: "blur(8px)",
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              🪙 Beli Token
            </Link>
          )}
        </div>

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

        {/* ── TENANT DASHBOARD ──────────────────────────────────── */}
        {session.role === "TENANT" && tenantData && (
          <div style={{ display: "grid", gap: "24px" }}>

            {/* STAT CARDS */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
            }}>
              {/* Token Tersedia */}
              <div className="stat-card" style={{ position: "relative", overflow: "hidden" }}>
                <span style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
                  🪙 Token Tersedia
                </span>
                <span className="stat-value" style={{ fontSize: "clamp(28px, 5vw, 36px)", color: "hsl(var(--primary))" }}>
                  {agentTokenBalance.toLocaleString("id-ID")}
                </span>
                <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                  {tokenConfigObj?.tokenSymbol} di akun Agen
                </span>
              </div>

              {/* Token Terpakai */}
              <div className="stat-card">
                <span style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
                  📊 Token Terpakai
                </span>
                <span className="stat-value" style={{ fontSize: "clamp(28px, 5vw, 36px)" }}>
                  {tokenUsed.toLocaleString("id-ID")}
                </span>
                <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                  Total konsumsi token toko
                </span>
              </div>

              {/* Masa Aktif */}
              <div className="stat-card" style={{
                borderColor: isPremiumActive
                  ? daysLeft <= 7
                    ? "hsl(var(--warning)/0.5)"
                    : "hsl(var(--success)/0.4)"
                  : "hsl(var(--error)/0.4)",
              }}>
                <span style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
                  {isPremiumActive ? "✅ Aktif Hingga" : "⛔ Tidak Aktif"}
                </span>
                <span className="stat-value" style={{
                  fontSize: "clamp(20px, 3.5vw, 26px)",
                  color: isPremiumActive
                    ? daysLeft <= 7 ? "hsl(var(--warning))" : "hsl(var(--success))"
                    : "hsl(var(--error))",
                }}>
                  {isPremiumActive
                    ? daysLeft > 0 ? `${daysLeft} hari lagi` : "Hari ini"
                    : "Kadaluarsa"}
                </span>
                <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                  {premiumUntil
                    ? premiumUntil.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                    : "Belum diaktifkan"}
                </span>
              </div>

              {/* Terminal Aktif */}
              <div className="stat-card">
                <span style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
                  🖥️ Terminal POS Aktif
                </span>
                <span className="stat-value" style={{ fontSize: "clamp(28px, 5vw, 36px)" }}>
                  {activeTerminals}
                </span>
                <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                  dari {tenantData.posTerminals.length} terminal terdaftar
                </span>
              </div>
            </div>

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
                    Segera beli token untuk perpanjang akses sebelum toko terkunci.
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
                    Beli token dan minta agen untuk mengaktifkan langganan.
                  </div>
                </div>
                <Link href="/buy" className="btn btn-sm btn-primary" style={{ marginLeft: "auto", flexShrink: 0 }}>
                  Aktifkan
                </Link>
              </div>
            )}

            {/* AKSES CEPAT */}
            <div className="card">
              <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>⚡ Akses Cepat</h3>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "10px",
              }}>
                {[
                  { href: "/pos", icon: "🖥️", label: "Kasir (POS)" },
                  { href: "/products", icon: "📦", label: "Produk" },
                  { href: "/sales", icon: "📈", label: "Laporan" },
                  { href: "/shopping-list", icon: "🛒", label: "Daftar Belanja" },
                  { href: "/inventory", icon: "🧪", label: "Bahan Baku" },
                  { href: "/settings", icon: "⚙️", label: "Pengaturan" },
                ].map(({ href, icon, label }) => (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                      padding: "16px 8px",
                      background: "hsl(var(--bg-elevated))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "14px",
                      textDecoration: "none",
                      color: "hsl(var(--text-primary))",
                      fontSize: "12px",
                      fontWeight: 600,
                      textAlign: "center",
                      transition: "border-color 0.2s, background 0.2s",
                    }}
                  >
                    <span style={{ fontSize: "26px" }}>{icon}</span>
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* FITUR AKTIF */}
            <div className="card">
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
                  {tokenBalance.toLocaleString("id-ID")}
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
