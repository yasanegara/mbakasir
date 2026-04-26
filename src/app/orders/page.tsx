import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import OrderManagerClient from "./OrderManagerClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await getSession();
  if (!session || session.role !== "TENANT" || !session.tenantId) {
    redirect("/login");
  }

  const storefront = await prisma.storefrontConfig.findUnique({
    where: { tenantId: session.tenantId },
    select: { isActive: true, slug: true, activeUntil: true },
  });

  const isStorefrontActive = storefront?.isActive && storefront?.activeUntil && new Date(storefront.activeUntil) > new Date();

  if (!storefront) {
    return (
      <DashboardLayout title="Pesanan Online">
        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🛍️</div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>Storefront Belum Aktif</h2>
          <p style={{ color: "hsl(var(--text-secondary))", fontSize: "14px", marginBottom: "24px" }}>
            Hubungi agen Anda untuk mengaktifkan fitur Storefront Online.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Pesanan Online">
      <div style={{ display: "grid", gap: "20px" }}>
        {/* Status Bar */}
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", padding: "16px 20px" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px" }}>
              {isStorefrontActive ? "🟢 Storefront Aktif" : "🔴 Storefront Tidak Aktif"}
            </div>
            <div style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", marginTop: "2px" }}>
              {storefront.activeUntil
                ? `Berlaku hingga: ${new Date(storefront.activeUntil).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`
                : "Tidak ada masa aktif"}
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/settings?tab=storefront" className="btn btn-ghost btn-sm">⚙️ Pengaturan Toko</Link>
            {storefront.slug && (
              <a href={`/store/${storefront.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                🔗 Lihat Toko →
              </a>
            )}
          </div>
        </div>

        {/* Order Manager */}
        <OrderManagerClient />
      </div>
    </DashboardLayout>
  );
}
