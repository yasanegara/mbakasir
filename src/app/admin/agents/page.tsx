import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AgentRegistrationLinkManager from "@/components/admin/AgentRegistrationLinkManager";
import AgentActionsClient from "@/components/admin/AgentActionsClient";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureTokenConfig } from "@/lib/token-settings";
import { formatDateShort, formatRupiahFull } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminAgentsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const tokenConfig = await ensureTokenConfig();
  const agents = await prisma.agent.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: {
      tenants: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  const tokenPrice = tokenConfig.pricePerToken;

  const totals = agents.reduce(
    (acc, agent) => {
      const activeTenants = agent.tenants.filter((tenant) => tenant.status === "ACTIVE").length;
      const lockedTenants = agent.tenants.filter((tenant) => tenant.status === "LOCKED").length;

      acc.totalAgents += 1;
      acc.activeAgents += agent.isActive ? 1 : 0;
      acc.totalTenants += agent.tenants.length;
      acc.activeTenants += activeTenants;
      acc.lockedTenants += lockedTenants;

      const isPusat = agent.email === "pusat@mbakasir.local";
      if (!isPusat) {
        acc.tokenBalance += agent.tokenBalance;
        acc.totalMinted += agent.totalMinted;
        acc.totalUsed += agent.totalUsed;
      }

      return acc;
    },
    {
      totalAgents: 0,
      activeAgents: 0,
      totalTenants: 0,
      activeTenants: 0,
      lockedTenants: 0,
      tokenBalance: 0,
      totalMinted: 0,
      totalUsed: 0,
    }
  );

  const tokenUtilization =
    totals.totalMinted > 0 ? Math.round((totals.totalUsed / totals.totalMinted) * 100) : 0;

  return (
    <DashboardLayout title="Kelola Agen">
      <div style={{ display: "grid", gap: "24px" }}>
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
          }}
        >
          <div className="stat-card">
            <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
              Agen Aktif
            </span>
            <span className="stat-value">{totals.activeAgents}</span>
            <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
              dari {totals.totalAgents} agen terdaftar
            </span>
          </div>

          <div className="stat-card">
            <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
              Toko Dalam Jaringan
            </span>
            <span className="stat-value">{totals.totalTenants}</span>
            <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
              {totals.activeTenants} aktif, {totals.lockedTenants} terkunci
            </span>
          </div>

          <div className="stat-card">
            <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
              Saldo Token Agen
            </span>
            <span className="stat-value">{totals.tokenBalance.toLocaleString("id-ID")}</span>
            <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
              Estimasi nilai {formatRupiahFull(totals.tokenBalance * tokenPrice)} • {tokenConfig.tokenSymbol}
            </span>
          </div>

          <div className="stat-card" style={{ background: "var(--gradient-primary)" }}>
            <span style={{ fontSize: "14px", color: "white", opacity: 0.8, fontWeight: 600 }}>
              Utilisasi Token
            </span>
            <span className="stat-value" style={{ color: "white", WebkitTextFillColor: "white" }}>
              {tokenUtilization}%
            </span>
            <span style={{ fontSize: "12px", color: "white", opacity: 0.82 }}>
              {totals.totalUsed.toLocaleString("id-ID")} dipakai dari {totals.totalMinted.toLocaleString("id-ID")} yang dimint
            </span>
          </div>
        </section>

        <section
          className="card"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ fontSize: "18px" }}>Direktori Agen Nasional</h2>
            <p style={{ marginTop: "6px", fontSize: "14px", color: "hsl(var(--text-secondary))" }}>
              Monitoring agen, toko kelolaan, dan kesehatan distribusi token dalam satu layar.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link href="/settings" className="btn btn-ghost">
              Pengaturan Token
            </Link>
            <Link href="/admin/tokens" className="btn btn-primary">
              Buka Mint Token
            </Link>
          </div>
        </section>

        <AgentRegistrationLinkManager />

        <section className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "18px 20px",
              borderBottom: "1px solid hsl(var(--border))",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ fontSize: "18px" }}>Daftar Agen</h2>
              <p style={{ marginTop: "4px", fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
                Data live dari PostgreSQL, diurutkan berdasarkan status aktif dan waktu pendaftaran.
              </p>
            </div>

            <span className="badge badge-primary">{agents.length} agen</span>
          </div>

          {agents.length === 0 ? (
            <div style={{ padding: "28px 20px" }}>
              <p style={{ fontSize: "14px", color: "hsl(var(--text-secondary))" }}>
                Belum ada agen terdaftar. Gunakan form pendaftaran di atas untuk menambahkan agen pertama.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "920px" }}>
                <thead style={{ background: "hsl(var(--bg-elevated))" }}>
                  <tr>
                    <th style={headerCellStyle}>Agen</th>
                    <th style={headerCellStyle}>Status</th>
                    <th style={headerCellStyle}>Toko Kelolaan</th>
                    <th style={headerCellStyle}>Saldo / Mint</th>
                    <th style={headerCellStyle}>Utilisasi</th>
                    <th style={headerCellStyle}>Bergabung</th>
                    <th style={{ ...headerCellStyle, textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {agents.map((agent) => {
                    const activeTenants = agent.tenants.filter((tenant) => tenant.status === "ACTIVE").length;
                    const lockedTenants = agent.tenants.filter((tenant) => tenant.status === "LOCKED").length;
                    const suspendedTenants = agent.tenants.filter((tenant) => tenant.status === "SUSPENDED").length;
                    const usagePercent =
                      agent.totalMinted > 0 ? Math.round((agent.totalUsed / agent.totalMinted) * 100) : 0;

                    return (
                      <tr key={agent.id} style={{ borderTop: "1px solid hsl(var(--border))" }}>
                        <td style={bodyCellStyle}>
                          <div style={{ fontWeight: 700 }}>{agent.name}</div>
                          <div style={{ fontSize: "12px", color: "hsl(var(--text-secondary))" }}>{agent.email}</div>
                          <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                            {agent.phone || "Nomor telepon belum diisi"}
                          </div>
                        </td>

                        <td style={bodyCellStyle}>
                          <span className={`badge ${agent.isActive ? "badge-success" : "badge-error"}`}>
                            {agent.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>

                        <td style={bodyCellStyle}>
                          <div style={{ fontWeight: 700 }}>{agent.tenants.length} toko</div>
                          <div style={{ fontSize: "12px", color: "hsl(var(--text-secondary))" }}>
                            {activeTenants} aktif, {lockedTenants} terkunci, {suspendedTenants} suspend
                          </div>
                        </td>

                        <td style={bodyCellStyle}>
                          {agent.email === "pusat@mbakasir.local" ? (
                            <>
                              <div style={{ fontWeight: 800, fontSize: "16px", color: "hsl(var(--primary))" }}>
                                ∞ Unmetered
                              </div>
                              <div style={{ fontSize: "12px", color: "hsl(var(--warning))", marginTop: "2px" }}>
                                Sistem Handel Pusat (Unlimited)
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ fontWeight: 700, color: "hsl(var(--primary))" }}>
                                {agent.tokenBalance.toLocaleString("id-ID")} token
                              </div>
                              <div style={{ fontSize: "12px", color: "hsl(var(--text-secondary))" }}>
                                Mint {agent.totalMinted.toLocaleString("id-ID")} • Sisa nilai{" "}
                                {formatRupiahFull(agent.tokenBalance * tokenPrice)}
                              </div>
                            </>
                          )}
                        </td>

                        <td style={bodyCellStyle}>
                          {agent.email === "pusat@mbakasir.local" ? (
                            <div style={{ fontSize: "14px", color: "hsl(var(--text-muted))" }}>-</div>
                          ) : (
                            <>
                              <div style={{ fontWeight: 700 }}>{usagePercent}%</div>
                              <div style={{ fontSize: "12px", color: "hsl(var(--text-secondary))" }}>
                                {agent.totalUsed.toLocaleString("id-ID")} dipakai
                              </div>
                            </>
                          )}
                        </td>

                        <td style={bodyCellStyle}>
                          <div style={{ fontWeight: 600 }}>{formatDateShort(agent.createdAt)}</div>
                        </td>

                        <td style={{ ...bodyCellStyle, textAlign: "right" }}>
                          <AgentActionsClient 
                            agentId={agent.id}
                            agentName={agent.name}
                            agentPhone={agent.phone || agent.whatsappNumber}
                            isActive={agent.isActive}
                          />
                          <Link href="/admin/tokens" className="btn btn-ghost btn-sm" style={{ marginTop: "4px" }}>
                            Mint Token
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

const headerCellStyle: React.CSSProperties = {
  padding: "12px 20px",
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "0.02em",
  color: "hsl(var(--text-secondary))",
  textAlign: "left",
};

const bodyCellStyle: React.CSSProperties = {
  padding: "16px 20px",
  fontSize: "14px",
  verticalAlign: "top",
};
