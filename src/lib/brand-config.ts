import "server-only";
import { prisma } from "@/lib/prisma";

export interface BrandConfigSnapshot {
  appName: string;
  tagline: string | null;
  metaDescription: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
}

const DEFAULT_BRAND: BrandConfigSnapshot = {
  appName: "MbaKasir Intelligence Pro",
  tagline: "Kasir Cerdas untuk UMKM Indonesia",
  metaDescription:
    "SaaS POS & ERP Mikro dengan arsitektur Local-First. Toko bisa jualan tanpa internet, data sync otomatis ke cloud.",
  logoUrl: null,
  faviconUrl: null,
  primaryColor: "#1e40af",
};

export async function getBrandConfig(): Promise<BrandConfigSnapshot> {
  try {
    const config = await prisma.brandConfig.findUnique({
      where: { id: "default" },
    });

    if (!config) return DEFAULT_BRAND;

    return {
      appName: config.appName || DEFAULT_BRAND.appName,
      tagline: config.tagline ?? DEFAULT_BRAND.tagline,
      metaDescription:
        config.metaDescription ?? DEFAULT_BRAND.metaDescription,
      logoUrl: config.logoUrl ?? null,
      faviconUrl: config.faviconUrl ?? null,
      primaryColor: config.primaryColor ?? DEFAULT_BRAND.primaryColor,
    };
  } catch {
    return DEFAULT_BRAND;
  }
}

export async function upsertBrandConfig(
  data: Partial<BrandConfigSnapshot>
): Promise<BrandConfigSnapshot> {
  const config = await prisma.brandConfig.upsert({
    where: { id: "default" },
    update: {
      appName: data.appName,
      tagline: data.tagline,
      metaDescription: data.metaDescription,
      logoUrl: data.logoUrl,
      faviconUrl: data.faviconUrl,
      primaryColor: data.primaryColor,
    },
    create: {
      id: "default",
      appName: data.appName ?? DEFAULT_BRAND.appName,
      tagline: data.tagline ?? DEFAULT_BRAND.tagline,
      metaDescription:
        data.metaDescription ?? DEFAULT_BRAND.metaDescription,
      logoUrl: data.logoUrl ?? null,
      faviconUrl: data.faviconUrl ?? null,
      primaryColor: data.primaryColor ?? DEFAULT_BRAND.primaryColor,
    },
  });

  return {
    appName: config.appName,
    tagline: config.tagline,
    metaDescription: config.metaDescription,
    logoUrl: config.logoUrl,
    faviconUrl: config.faviconUrl,
    primaryColor: config.primaryColor,
  };
}
