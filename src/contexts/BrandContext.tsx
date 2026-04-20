"use client";

import { createContext, useContext } from "react";

export interface BrandSnapshot {
  appName: string;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
}

const DEFAULT_BRAND: BrandSnapshot = {
  appName: "MbaKasir Intelligence Pro",
  tagline: "Kasir Cerdas",
  logoUrl: null,
  faviconUrl: null,
  primaryColor: "#1e40af",
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
