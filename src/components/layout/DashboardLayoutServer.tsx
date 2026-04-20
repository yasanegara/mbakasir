import { getBrandConfig } from "@/lib/brand-config";
import DashboardLayout from "./DashboardLayout";

/**
 * Server wrapper: fetches brand config and injects it into DashboardLayout
 * so the client-side Sidebar can display the correct logo/appName.
 */
export default async function DashboardLayoutServer({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const brand = await getBrandConfig();

  return (
    <DashboardLayout
      title={title}
      brand={{
        appName: brand.appName,
        tagline: brand.tagline,
        logoUrl: brand.logoUrl,
        faviconUrl: brand.faviconUrl,
        primaryColor: brand.primaryColor,
      }}
    >
      {children}
    </DashboardLayout>
  );
}
