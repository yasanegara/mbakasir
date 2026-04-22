import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppRuntimeSync from "@/components/app/AppRuntimeSync";
import { ThemeProvider, ToastProvider, AuthProvider } from "@/contexts/AppProviders";
import { getBrandConfig } from "@/lib/brand-config";
import { BrandProvider } from "@/contexts/BrandContext";
import GlobalWidgets from "@/components/global/GlobalWidgets";

function isAppleIconCandidate(url: string | null): boolean {
  return Boolean(url && /\.(png|jpe?g)$/i.test(url));
}

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrandConfig();
  const iconUrl = brand.faviconUrl ?? "/icon.svg";

  return {
    title: {
      default: brand.appName,
      template: `%s | ${brand.appName}`,
    },
    description: brand.metaDescription ?? undefined,
    keywords: ["POS", "kasir", "UMKM", "ERP", "Indonesia", "offline", "local-first"],
    authors: [{ name: brand.appName }],
    manifest: "/manifest.json",
    icons: {
      icon: iconUrl,
      shortcut: iconUrl,
      apple: isAppleIconCandidate(brand.faviconUrl) ? brand.faviconUrl! : "/apple-icon.png",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,   // Izinkan zoom manual, tapi jangan auto-zoom karena input
  userScalable: true,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const brand = await getBrandConfig();

  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <BrandProvider brand={{
          appName: brand.appName,
          tagline: brand.tagline ?? null,
          logoUrl: brand.logoUrl ?? null,
          faviconUrl: brand.faviconUrl ?? null,
          primaryColor: brand.primaryColor ?? null,
          supportPhone: brand.supportPhone ?? null,
          supportMessage: brand.supportMessage ?? null,
        }}>
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider>
                <AppRuntimeSync />
                {children}
                <GlobalWidgets />
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </BrandProvider>
      </body>
    </html>
  );
}
