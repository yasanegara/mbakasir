"use client";

import { createContext, useContext } from "react";

export interface BrandSnapshot {
  appName: string;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  supportPhone: string | null;
  supportMessage: string | null;
}

const DEFAULT_BRAND: BrandSnapshot = {
  appName: "MbaKasir Intelligence Pro",
  tagline: "Teman UMKM Indonesia",
  logoUrl: "/brand/mbakasir-logo.svg",
  faviconUrl: "/icon.svg",
  primaryColor: "#111111",
  supportPhone: "6281234567890",
  supportMessage: "Halo MbaKasir, saya butuh bantuan",
};

const BrandContext = createContext<BrandSnapshot>(DEFAULT_BRAND);

export function BrandProvider({
  brand,
  children,
}: {
  brand: BrandSnapshot;
  children: React.ReactNode;
}) {
  return (
    <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
  );
}

export function useBrand(): BrandSnapshot {
  return useContext(BrandContext);
}
