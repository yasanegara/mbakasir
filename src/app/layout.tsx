import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider, ToastProvider, AuthProvider } from "@/contexts/AppProviders";

export const metadata: Metadata = {
  title: {
    default: "Mbakasir Intelligence Pro",
    template: "%s | Mbakasir",
  },
  description:
    "SaaS POS & ERP Mikro dengan arsitektur Local-First. Toko bisa jualan tanpa internet, data sync otomatis ke cloud.",
  keywords: ["POS", "kasir", "UMKM", "ERP", "Indonesia", "offline", "local-first"],
  authors: [{ name: "Mbakasir" }],
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1e40af",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
