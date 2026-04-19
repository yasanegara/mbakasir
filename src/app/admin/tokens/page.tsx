import { prisma } from "@/lib/prisma";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatRupiahFull } from "@/lib/utils";

export const dynamic = 'force-dynamic';

// ============================================================
// SUPERADMIN DASHBOARD: MINT TOKEN
// ============================================================

export default async function AdminTokensPage() {
  const agents = await prisma.agent.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tenants: { select: { id: true } }
    }
  });

  const TOKEN_PRICE = Number(process.env.NEXT_PUBLIC_TOKEN_HPP || 6250);

  return (
    <DashboardLayout title="Mint Token Lisensi (Pusat)">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "30px" }}>
        <div className="stat-card">
           <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>Total Agen Aktif</span>
           <span className="stat-value">{agents.filter(a => a.isActive).length}</span>
        </div>
        <div className="stat-card">
           <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>Harga Jual / Token</span>
           <span className="stat-value" style={{ fontSize: "24px" }}>{formatRupiahFull(TOKEN_PRICE)}</span>
        </div>
        <div className="stat-card" style={{ background: "var(--gradient-primary)" }}>
           <span style={{ fontSize: "14px", color: "white", opacity: 0.8, fontWeight: 600 }}>Potensi Revenue (MRR)</span>
           <span className="stat-value" style={{ color: "white", textShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
              {formatRupiahFull(agents.reduce((acc, a) => acc + (a.totalMinted * TOKEN_PRICE), 0))}
           </span>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
         <div style={{ padding: "20px", borderBottom: "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "18px" }}>Daftar Distribusi Agen</h2>
         </div>
         <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border))" }}>
              <tr>
                 <th style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Nama Agen</th>
                 <th style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Total Toko</th>
                 <th style={{ padding: "12px 20px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Sisa Saldo Token</th>
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
                   <td style={{ padding: "16px 20px", fontSize: "14px" }}>
                      {agent.tenants.length} Toko
                   </td>
                   <td style={{ padding: "16px 20px", fontSize: "16px", fontWeight: 700, color: "hsl(var(--primary))" }}>
                      {agent.tokenBalance.toLocaleString()} <span style={{ fontSize: "12px", color: "hsl(var(--text-secondary))" }}>Token</span>
                   </td>
                   <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      {/* Implementasi Client Component untuk form minting token disederhanakan karena ini halaman SSR Server Component murni; di app asli di-pop up form. Untuk keperluan skeleton phase 4, view ready. */}
                      <button className="btn btn-primary btn-sm">
                         + Mint Token
                      </button>
                   </td>
                </tr>
              ))}
            </tbody>
         </table>
      </div>
    </DashboardLayout>
  );
}
