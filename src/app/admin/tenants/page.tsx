import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SwitchAgentClient from "@/components/admin/SwitchAgentClient";
import TenantActionsClient from "@/components/admin/TenantActionsClient";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateShort } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminTenantsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const tenants = await prisma.tenant.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          users: true,
          products: true,
          sales: true,
          posTerminals: true,
        },
      },
    },
  });

  const allAgents = await prisma.agent.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" }
  });

  const totals = tenants.reduce(
    (acc, tenant) => {
      const hasActivation = !!tenant.premiumUntil;
      const needsAttention = tenant.status !== "ACTIVE" || !hasActivation;

      acc.total += 1;
      acc.tokensUsed += tenant.tokenUsed;

      if (tenant.status === "ACTIVE") acc.active += 1;
      if (tenant.status === "LOCKED") acc.locked += 1;
      if (tenant.status === "SUSPENDED") acc.suspended += 1;
      if (!hasActivation) acc.neverActivated += 1;
      if (needsAttention) acc.needsAttention += 1;

      return acc;
    },
    {
      total: 0,
      active: 0,
      locked: 0,
      suspended: 0,
      neverActivated: 0,
      needsAttention: 0,
      tokensUsed: 0,
    }
  );

  return (
    <DashboardLayout title="Semua Toko">
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
              Total Toko
            </span>
            <span className="stat-value">{totals.total}</span>
            <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
              Portofolio seluruh agen aktif dan nonaktif
            </span>
          </div>

          <div className="stat-card">
            <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
              Lisensi Aktif
            </span>
            <span className="stat-value">{totals.active}</span>
            <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
              {totals.locked} terkunci, {totals.suspended} suspend
            </span>
          </div>

          <div className="stat-card">
            <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
              Perlu Follow-up
            </span>
            <span className="stat-value">{totals.needsAttention}</span>
            <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
              {totals.locked} terkunci, {totals.neverActivated} belum diaktivasi
            </span>
          </div>

          <div className="stat-card" style={{ background: "var(--gradient-primary)" }}>
            <span style={{ fontSize: "14px", color: "white", opacity: 0.8, fontWeight: 600 }}>
              Token Terpakai
            </span>
            <span className="stat-value" style={{ color: "white", WebkitTextFillColor: "white" }}>
              {totals.tokensUsed.toLocaleString("id-ID")}
            </span>
            <span style={{ fontSize: "12px", color: "white", opacity: 0.82 }}>
              {totals.neverActivated} toko belum pernah diaktivasi
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
            <h2 style={{ fontSize: "18px" }}>Kontrol Lisensi Seluruh Toko</h2>
            <p style={{ marginTop: "6px", fontSize: "14px", color: "hsl(var(--text-secondary))" }}>
              Lihat toko per agen, umur lisensi, terminal POS, dan beban operasional dari satu dashboard Super Admin.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link href="/admin/agents" className="btn btn-ghost">
              Lihat Agen
            </Link>
            <Link href="/admin/tokens" className="btn btn-primary">
              Mint Token
            </Link>
          </div>
        </section>

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
              <h2 style={{ fontSize: "18px" }}>Daftar Toko Nasional</h2>
              <p style={{ marginTop: "4px", fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
                Data live tenant, agen penanggung jawab, lisensi, dan jejak operasional utama.
              </p>
            </div>

            <span className="badge badge-primary">{tenants.length} toko</span>
          </div>

          {tenants.length === 0 ? (
            <div style={{ padding: "28px 20px" }}>
              <p style={{ fontSize: "14px", color: "hsl(var(--text-secondary))" }}>
                Belum ada tenant terdaftar di sistem.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1120px" }}>
                <thead style={{ background: "hsl(var(--bg-elevated))" }}>
                  <tr>
                    <th style={headerCellStyle}>Toko</th>
                    <th style={headerCellStyle}>Agen</th>
                    <th style={headerCellStyle}>Status</th>
                    <th style={headerCellStyle}>Masa Aktif</th>
                    <th style={headerCellStyle}>Token</th>
                    <th style={headerCellStyle}>Operasional</th>
                    <th style={headerCellStyle}>Bergabung</th>
                    <th style={{ ...headerCellStyle, textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {tenants.map((tenant) => {
                    const statusBadgeClass =
                      tenant.status === "ACTIVE"
                        ? "badge-success"
                        : tenant.status === "LOCKED" || tenant.status === "DORMANT"
                          ? "badge-warning"
                          : "badge-error";

                    // @ts-expect-error
                    const statusLabel = tenant.status === "ACTIVE" ? "Aktif" : tenant.status === "LOCKED" ? "Terkunci" : tenant.status === "DORMANT" ? "Dorman" : "Suspend";

                    return (
                      <tr key={tenant.id} style={{ borderTop: "1px solid hsl(var(--border))" }}>
                        <td style={bodyCellStyle}>
                          <div style={{ fontWeight: 700 }}>{tenant.name}</div>
                          <div style={{ fontSize: "12px", color: "hsl(var(--text-secondary))" }}>
                            {tenant.businessType || "Jenis usaha belum diisi"}
                          </div>
                          <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                            {tenant.phone || tenant.address || "Kontak/alamat belum diisi"}
                          </div>
                        </td>

                        <td style={bodyCellStyle}>
                          <div style={{ fontWeight: 700 }}>{tenant.agent.name}</div>
                          <div style={{ fontSize: "12px", color: "hsl(var(--text-secondary))" }}>
                            {tenant.agent.email}
                          </div>
                        </td>

                        <td style={bodyCellStyle}>
                          <span className={`badge ${statusBadgeClass}`}>
                            {statusLabel}
                          </span>
                          <div style={{ marginTop: "8px", fontSize: "12px", color: "hsl(var(--text-secondary))" }}>
                            {tenant.premiumUntil ? "Lisensi pernah diaktivasi" : "Belum ada masa aktif"}
                          </div>
                        </td>

                        <td style={bodyCellStyle}>
                          <div style={{ fontWeight: 700 }}>
                            {tenant.premiumUntil ? formatDateShort(tenant.premiumUntil) : "-"}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: tenant.status === "ACTIVE" ? "hsl(var(--text-secondary))" : "hsl(var(--error))",
                            }}
                          >
                            {!tenant.premiumUntil
                              ? "Belum pernah diaktivasi"
                              : tenant.status === "ACTIVE"
                                ? "Aktif sesuai status sistem"
                                : tenant.status === "LOCKED"
                                  ? "Perlu aktivasi/perpanjangan"
                                  : "Sedang disuspensi"}
                          </div>
                        </td>

                        <td style={bodyCellStyle}>
                          <div style={{ fontWeight: 700 }}>{tenant.tokenUsed.toLocaleString("id-ID")} token</div>
                          <div style={{ fontSize: "12px", color: "hsl(var(--text-secondary))" }}>
                            Lisensi + terminal POS yang sudah teralokasi
                          </div>
                        </td>

                        <td style={bodyCellStyle}>
                          <div style={{ fontWeight: 700 }}>{tenant._count.sales.toLocaleString("id-ID")} penjualan</div>
                          <div style={{ fontSize: "12px", color: "hsl(var(--text-secondary))" }}>
                            {tenant._count.users} user • {tenant._count.products} produk • {tenant._count.posTerminals} POS
                          </div>
                        </td>

                        <td style={bodyCellStyle}>
                          <div style={{ fontWeight: 600 }}>{formatDateShort(tenant.createdAt)}</div>
                        </td>

                        <td style={{ ...bodyCellStyle, textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                            <SwitchAgentClient 
                              tenantId={tenant.id} 
                              currentAgentId={tenant.agentId} 
                              agents={allAgents} 
                            />
                            <Link href="/admin/tokens" className="btn btn-ghost btn-sm">
                              Mint
                            </Link>
                          </div>
                          {/* Tenant Actions Row */}
                          <TenantActionsClient 
                            tenantId={tenant.id}
                            tenantName={tenant.name}
                            tenantPhone={tenant.phone}
                            status={tenant.status}
                          />
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
