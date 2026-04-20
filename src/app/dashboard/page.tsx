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
    const [tokenConfig, dbTenant] = await Promise.all([
      ensureTokenConfig(),
      prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: {
          name: true,
          tokenUsed: true,
          agent: {
             // @ts-ignore: TS Server cache issue for tokenResalePrice and others generated on the fly.
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

  return (
    <DashboardLayout title="Dashboard">
      <div style={{ display: "grid", gap: "24px" }}>
        <div className="card">
          <h2>Selamat datang, {session.name}!</h2>
          <p style={{ color: "hsl(var(--text-secondary))", marginTop: "8px" }}>
            Anda login sebagai <strong>{session.role}</strong>.
          </p>
        </div>

        {session.role === "AGENT" && (
          <div style={{ display: "grid", gap: "24px" }}>
            <div className="stat-card">
              <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
                Sisa Token Anda
              </span>
              <span className="stat-value">{tokenBalance.toLocaleString()}</span>
            </div>

            {agentRequests.length > 0 && (
              <section className="card" style={{ border: "1px solid hsl(var(--primary))", background: "hsl(var(--primary)/0.03)" }}>
                <h3 style={{ fontSize: "18px", color: "hsl(var(--primary))", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ display: "flex", width: "8px", height: "8px", background: "hsl(var(--primary))", borderRadius: "50%" }}></span>
                  Notifikasi Pembelian Baru ({agentRequests.length})
                </h3>
                <div style={{ display: "grid", gap: "10px" }}>
                  {agentRequests.map(req => (
                    <div key={req.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: "hsl(var(--bg-card))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "15px" }}>{req.tenant.name}</div>
                        <div style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", marginTop: "4px" }}>
                          Meminta {req.amount} Token | Estimasi: Rp {Number(req.totalPrice).toLocaleString("id-ID")}
                        </div>
                        {req.voucherCode && (
                          <div style={{ fontSize: "12px", color: "hsl(var(--warning))", marginTop: "4px", fontWeight: 600 }}>
                            Voucher Bawaan: {req.voucherCode}
                          </div>
                        )}
                      </div>
                      <Link href={`/agent/transaksi`} className="btn btn-primary" style={{ padding: "8px 16px", fontSize: "13px" }}>
                        Cek & Proses
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {session.role === "TENANT" && tenantData && (
          <div style={{ display: "grid", gap: "24px" }}>
            
            {/* Pembelian Token CTA */}
            <div 
              style={{ 
                background: "var(--gradient-primary)", 
                borderRadius: "16px",
                padding: "24px",
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                flexWrap: "wrap", 
                gap: "20px",
                color: "white"
              }}
            >
              <div>
                <h3 style={{ fontSize: "20px", fontWeight: 700, margin: 0, textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                  Perlu Tambah Fitur & Lisensi?
                </h3>
                <p style={{ fontSize: "14px", marginTop: "8px", opacity: 0.9, lineHeight: "1.5", maxWidth: "400px" }}>
                  Beli {tokenConfigObj?.tokenSymbol} baru ke Agen untuk menambah Add-on atau terminal POS ekstra. 
                  Harga saat ini: <strong style={{ fontWeight: 700 }}>{Number(tenantData.agent.tokenResalePrice) > 0 ? `Rp ${Number(tenantData.agent.tokenResalePrice).toLocaleString("id-ID")}` : "Menyusul"}</strong>.
                </p>
              </div>
              <Link 
                href="/buy" 
                className="btn"
                style={{ 
                  background: "white", 
                  color: "hsl(var(--primary))", 
                  fontWeight: 600, 
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)" 
                }}
              >
                Mulai Pembelian / Konfirmasi WA
              </Link>
            </div>

            {/* Daftar Add-on Aktif */}
            <div className="card">
              <div style={{ paddingBottom: "16px", borderBottom: "1px solid hsl(var(--border))", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "18px" }}>Etalase Fitur Aktif Anda</h3>
                <p style={{ color: "hsl(var(--text-secondary))", fontSize: "13px", marginTop: "4px" }}>
                  Status modul, kustomisasi produk, dan ekstensi toko yang saat ini dapat Anda gunakan.
                </p>
              </div>

              {activeAddons.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", border: "1px dashed hsl(var(--border))", borderRadius: "12px" }}>
                  <p style={{ color: "hsl(var(--text-secondary))", fontSize: "14px" }}>
                    Belum ada tambahan/Add-on pada toko ini.
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
                  {activeAddons.map((addon, index) => (
                    <div 
                      key={index} 
                      style={{ 
                        padding: "20px", 
                        background: "hsl(var(--bg-elevated))", 
                        border: "1px solid hsl(var(--border))", 
                        borderRadius: "12px", 
                        display: "flex", 
                        flexDirection: "column", 
                        gap: "12px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: "16px", lineHeight: "1.4" }}>{addon.name}</span>
                      <span className={addon.type.includes("Gratis") ? "badge badge-success" : "badge badge-info"} style={{ alignSelf: "flex-start", fontSize: "12px" }}>
                        {addon.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Manajer Terminal POS */}
            <div style={{ marginTop: "8px" }}>
              <PosTerminalManager
                tenantName={tenantData.name}
                agentName={tenantData.agent.name}
                tokenSymbol={tokenConfigObj.tokenSymbol}
                posRuleLabel={posConversionObj ? formatTokenConversion(posConversionObj) : null}
                posTokenCost={
                  posConversionObj
                    ? calculateTokenCostForQuantity(posConversionObj, 1)
                    : null
                }
                initialAgentBalance={tenantData.agent.tokenBalance}
                initialTokenUsed={tenantData.tokenUsed}
                initialTerminals={tenantData.posTerminals.map((terminal: any) => ({
                  id: terminal.id,
                  name: terminal.name,
                  code: terminal.code,
                  isDefault: terminal.isDefault,
                  isActive: terminal.isActive,
                  tokenCost: terminal.tokenCost,
                  createdAt: terminal.createdAt.toISOString(),
                }))}
              />
            </div>

          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
