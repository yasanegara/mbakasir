import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppRuntimeSync from "@/components/app/AppRuntimeSync";
import { ThemeProvider, ToastProvider, AuthProvider } from "@/contexts/AppProviders";
import { getBrandConfig } from "@/lib/brand-config";
import { BrandProvider } from "@/contexts/BrandContext";
import GlobalWidgets from "@/components/global/GlobalWidgets";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrandConfig();

  return {
    title: {
      default: brand.appName,
      template: `%s | ${brand.appName}`,
    },
    description: brand.metaDescription ?? undefined,
    keywords: ["POS", "kasir", "UMKM", "ERP", "Indonesia", "offline", "local-first"],
    authors: [{ name: brand.appName }],
    manifest: "/manifest.json",
    icons: brand.faviconUrl
      ? {
          icon: brand.faviconUrl,
          shortcut: brand.faviconUrl,
          apple: brand.faviconUrl,
        }
      : undefined,
  };
}

export const viewport: Viewport = {
  themeColor: "#1e40af",
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
      <head>
        {brand.faviconUrl && (
          <>
            <link rel="icon" href={brand.faviconUrl} />
            <link rel="shortcut icon" href={brand.faviconUrl} />
            <link rel="apple-touch-icon" href={brand.faviconUrl} />
          </>
        )}
      </head>
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
