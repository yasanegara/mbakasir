import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import TokenSettingsClient from "@/components/settings/TokenSettingsClient";
import { getSession } from "@/lib/auth";
import { ensureTokenConfig } from "@/lib/token-settings";

export const dynamic = "force-dynamic";

export default async function AdminTokenSettingsPage() {
  const session = await getSession();

  if (!session || session.role !== "SUPERADMIN") {
    redirect("/login");
  }

  const tokenConfig = await ensureTokenConfig();

  return (
    <DashboardLayout title="Manajemen Add-on">
      <div style={{ display: "grid", gap: "24px" }}>
        <p style={{ color: "hsl(var(--text-secondary))", fontSize: "14px" }}>
          Atur fitur modular, harga koin, dan deskripsi marketplace untuk seluruh toko.
        </p>
        <TokenSettingsClient initialConfig={tokenConfig} />
      </div>
    </DashboardLayout>
  );
}
