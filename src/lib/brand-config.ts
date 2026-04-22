import "server-only";
import { prisma } from "@/lib/prisma";

export interface BrandConfigSnapshot {
  appName: string;
  tagline: string | null;
  metaDescription: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  supportPhone: string | null;
  supportMessage: string | null;
  geminiApiKey: string | null;
}

const LEGACY_TAGLINE = "Kasir Cerdas untuk UMKM Indonesia";
const DEFAULT_TAGLINE = "Teman UMKM Indonesia";

const DEFAULT_BRAND: BrandConfigSnapshot = {
  appName: "MbaKasir Intelligence Pro",
  tagline: DEFAULT_TAGLINE,
  metaDescription:
    "SaaS POS & ERP Mikro dengan arsitektur Local-First. Toko bisa jualan tanpa internet, data sync otomatis ke cloud.",
  logoUrl: "/brand/mbakasir-logo.svg",
  faviconUrl: "/icon.svg",
  primaryColor: "#111111",
  supportPhone: "6281234567890",
  supportMessage: "Halo MbaKasir, saya butuh bantuan",
  geminiApiKey: null,
};

function normalizeTagline(tagline: string | null): string | null {
  if (tagline === LEGACY_TAGLINE) {
    return DEFAULT_TAGLINE;
  }

  return tagline;
}

export async function getBrandConfig(): Promise<BrandConfigSnapshot> {
  try {
    const config = await prisma.brandConfig.findUnique({
      where: { id: "default" },
    });

    if (!config) return DEFAULT_BRAND;

    return {
      appName: config.appName || DEFAULT_BRAND.appName,
      tagline: normalizeTagline(config.tagline) ?? DEFAULT_BRAND.tagline,
      metaDescription:
        config.metaDescription ?? DEFAULT_BRAND.metaDescription,
      logoUrl: config.logoUrl ?? DEFAULT_BRAND.logoUrl,
      faviconUrl: config.faviconUrl ?? DEFAULT_BRAND.faviconUrl,
      primaryColor: config.primaryColor ?? DEFAULT_BRAND.primaryColor,
      supportPhone: config.supportPhone ?? DEFAULT_BRAND.supportPhone,
      supportMessage: config.supportMessage ?? DEFAULT_BRAND.supportMessage,
      geminiApiKey: config.geminiApiKey ?? null,
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
      tagline: normalizeTagline(data.tagline ?? null),
      metaDescription: data.metaDescription,
      logoUrl: data.logoUrl,
      faviconUrl: data.faviconUrl,
      primaryColor: data.primaryColor,
      supportPhone: data.supportPhone,
      supportMessage: data.supportMessage,
      geminiApiKey: data.geminiApiKey,
    },
    create: {
      id: "default",
      appName: data.appName ?? DEFAULT_BRAND.appName,
      tagline: normalizeTagline(data.tagline ?? null) ?? DEFAULT_BRAND.tagline,
      metaDescription:
        data.metaDescription ?? DEFAULT_BRAND.metaDescription,
      logoUrl: data.logoUrl ?? null,
      faviconUrl: data.faviconUrl ?? null,
      primaryColor: data.primaryColor ?? DEFAULT_BRAND.primaryColor,
      supportPhone: data.supportPhone ?? DEFAULT_BRAND.supportPhone,
      supportMessage: data.supportMessage ?? DEFAULT_BRAND.supportMessage,
      geminiApiKey: data.geminiApiKey ?? null,
    },
  });

  return {
    appName: config.appName,
    tagline: config.tagline,
    metaDescription: config.metaDescription,
    logoUrl: config.logoUrl ?? DEFAULT_BRAND.logoUrl,
    faviconUrl: config.faviconUrl ?? DEFAULT_BRAND.faviconUrl,
    primaryColor: config.primaryColor ?? DEFAULT_BRAND.primaryColor,
    supportPhone: config.supportPhone ?? DEFAULT_BRAND.supportPhone,
    supportMessage: config.supportMessage ?? DEFAULT_BRAND.supportMessage,
    geminiApiKey: config.geminiApiKey,
  };
}
