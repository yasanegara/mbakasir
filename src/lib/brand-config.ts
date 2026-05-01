import "server-only";
import { prisma } from "@/lib/prisma";
import { DEFAULT_AI_KNOWLEDGE_BASE } from "@/lib/default-ai-brain";

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
  aiKnowledgeBase: string | null;
  bankDetails: string | null;
  telegramBotToken: string | null;
  footerPoweredByText: string | null;
  showFooterPoweredBy: boolean;
}

const LEGACY_TAGLINE = "Kasir Cerdas untuk UMKM Indonesia";
const DEFAULT_TAGLINE = "Teman UMKM Indonesia";

const DEFAULT_BRAND: BrandConfigSnapshot = {
  appName: "MbaKasir Intelligence Pro",
  tagline: DEFAULT_TAGLINE,
  metaDescription:
    "SaaS POS & ERP Mikro dengan arsitektur Local-First. Toko bisa jualan tanpa internet, data sync otomatis ke cloud.",
  logoUrl: "/brand/mbakasir-logo.svg",
  faviconUrl: "/favicon.ico",
  primaryColor: "#111111",
  supportPhone: "6281234567890",
  supportMessage: "Halo MbaKasir, saya butuh bantuan",
  geminiApiKey: null,
  aiKnowledgeBase: DEFAULT_AI_KNOWLEDGE_BASE,
  bankDetails: "Belum dikonfigurasi. Hubungi Pusat.",
  telegramBotToken: null,
  footerPoweredByText: "Powered by MbaKasir Intelligence",
  showFooterPoweredBy: true,
};

function normalizeTagline(tagline: string | null): string | null {
  if (tagline === LEGACY_TAGLINE) {
    return DEFAULT_TAGLINE;
  }

  return tagline;
}

export async function getBrandConfig(brandId: string = "default"): Promise<BrandConfigSnapshot> {
  try {
    const config = (await prisma.brandConfig.findUnique({
      where: { id: brandId },
    })) as any;

    if (!config) {
      if (brandId === "edu") {
        return {
          ...DEFAULT_BRAND,
          appName: "Nedu Intelligence",
          tagline: "Edukasi Bisnis Digital",
          logoUrl: "/brand/nedu-logo.svg",
        };
      }
      return DEFAULT_BRAND;
    }

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
      aiKnowledgeBase: config.aiKnowledgeBase ?? DEFAULT_BRAND.aiKnowledgeBase,
      bankDetails: config.bankDetails ?? DEFAULT_BRAND.bankDetails,
      telegramBotToken: config.telegramBotToken ?? null,
      footerPoweredByText: config.footerPoweredByText ?? DEFAULT_BRAND.footerPoweredByText,
      showFooterPoweredBy: config.showFooterPoweredBy ?? DEFAULT_BRAND.showFooterPoweredBy,
    };
  } catch {
    return DEFAULT_BRAND;
  }
}

export async function upsertBrandConfig(
  data: Partial<BrandConfigSnapshot>,
  brandId: string = "default"
): Promise<BrandConfigSnapshot> {
    const config = (await prisma.brandConfig.upsert({
      where: { id: brandId },
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
        aiKnowledgeBase: data.aiKnowledgeBase ?? DEFAULT_BRAND.aiKnowledgeBase,
        bankDetails: data.bankDetails ?? DEFAULT_BRAND.bankDetails,
        telegramBotToken: data.telegramBotToken ?? null,
        footerPoweredByText: data.footerPoweredByText,
        showFooterPoweredBy: data.showFooterPoweredBy,
      } as any,
      create: {
        id: brandId,
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
        aiKnowledgeBase: data.aiKnowledgeBase ?? DEFAULT_BRAND.aiKnowledgeBase,
        bankDetails: data.bankDetails ?? DEFAULT_BRAND.bankDetails,
        telegramBotToken: data.telegramBotToken ?? null,
        footerPoweredByText: data.footerPoweredByText ?? DEFAULT_BRAND.footerPoweredByText,
        showFooterPoweredBy: data.showFooterPoweredBy ?? DEFAULT_BRAND.showFooterPoweredBy,
      } as any,
    })) as any;

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
    aiKnowledgeBase: config.aiKnowledgeBase ?? DEFAULT_BRAND.aiKnowledgeBase,
    bankDetails: config.bankDetails ?? DEFAULT_BRAND.bankDetails,
    telegramBotToken: config.telegramBotToken,
    footerPoweredByText: config.footerPoweredByText,
    showFooterPoweredBy: config.showFooterPoweredBy,
  };
}
