import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TOKEN_CONFIG_ID } from "@/lib/token-settings-shared";
import {
  ensureTokenConfig,
  getTokenConfig,
} from "@/lib/token-settings";

const tokenConversionSchema = z.object({
  id: z.string().optional(),
  targetKey: z
    .string()
    .trim()
    .min(2, "Kode rule minimal 2 karakter")
    .max(64, "Kode rule terlalu panjang")
    .regex(/^[A-Z0-9_]+$/, "Kode rule hanya boleh huruf besar, angka, dan underscore"),
  targetLabel: z.string().trim().min(2, "Nama konversi wajib diisi").max(120),
  moduleKey: z.string().trim().max(64).optional().or(z.literal("")),
  tokenCost: z.number().int().min(1, "Token per bundle minimal 1"),
  rewardQuantity: z.number().int().min(1, "Jumlah reward minimal 1"),
  rewardUnit: z.string().trim().min(1, "Satuan reward wajib diisi").max(64),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  longDescription: z.string().trim().max(2000).optional().or(z.literal("")),
  icon: z.string().trim().max(100).optional().or(z.literal("")),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0),
});

const tokenConfigSchema = z.object({
  tokenName: z.string().trim().min(2, "Nama token wajib diisi").max(80),
  tokenSymbol: z.string().trim().min(1, "Simbol token wajib diisi").max(12),
  pricePerToken: z.number().min(0, "Harga token tidak boleh negatif"),
  currencyCode: z.string().trim().min(3).max(6),
  hppRatio: z.number().int().min(0).max(100).default(40),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  conversions: z.array(tokenConversionSchema).min(1, "Minimal ada satu aturan konversi"),
});

async function requireSuperAdmin() {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return null;
  }

  return session;
}

export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const config = await ensureTokenConfig();
  return Response.json({ config });
}

export async function POST(req: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const rawBody = await req.json();
    const parsed = tokenConfigSchema.safeParse(rawBody);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || "Data pengaturan token tidak valid";
      return Response.json({ error: firstIssue }, { status: 400 });
    }

    const duplicateKey = findDuplicateTargetKey(parsed.data.conversions);
    if (duplicateKey) {
      return Response.json(
        { error: `Kode rule duplikat: ${duplicateKey}` },
        { status: 400 }
      );
    }

    const hasLicenseConversion = parsed.data.conversions.some(
      (conversion) => conversion.targetKey === "LICENSE_MONTH" && conversion.isActive
    );

    if (!hasLicenseConversion) {
      return Response.json(
        {
          error:
            "Rule aktif `LICENSE_MONTH` wajib ada agar aktivasi/perpanjangan toko tetap berjalan.",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.tokenConfig.upsert({
        where: { id: DEFAULT_TOKEN_CONFIG_ID },
        update: {
          tokenName: parsed.data.tokenName,
          tokenSymbol: parsed.data.tokenSymbol,
          pricePerToken: parsed.data.pricePerToken,
          currencyCode: parsed.data.currencyCode,
          hppRatio: parsed.data.hppRatio,
          notes: parsed.data.notes || null,
        },
        create: {
          id: DEFAULT_TOKEN_CONFIG_ID,
          tokenName: parsed.data.tokenName,
          tokenSymbol: parsed.data.tokenSymbol,
          pricePerToken: parsed.data.pricePerToken,
          currencyCode: parsed.data.currencyCode,
          hppRatio: parsed.data.hppRatio,
          notes: parsed.data.notes || null,
        },
      });

      await tx.tokenConversion.deleteMany({
        where: { configId: DEFAULT_TOKEN_CONFIG_ID },
      });

      await tx.tokenConversion.createMany({
        data: parsed.data.conversions.map((conversion, index) => ({
          configId: DEFAULT_TOKEN_CONFIG_ID,
          targetKey: conversion.targetKey,
          targetLabel: conversion.targetLabel,
          moduleKey: conversion.moduleKey || null,
          tokenCost: conversion.tokenCost,
          rewardQuantity: conversion.rewardQuantity,
          rewardUnit: conversion.rewardUnit,
          description: conversion.description || null,
          longDescription: conversion.longDescription || null,
          icon: conversion.icon || null,
          isActive: conversion.isActive,
          sortOrder: index,
        })),
      });
    });

    const config = await getTokenConfig();
    return Response.json({ success: true, config });
  } catch (error) {
    console.error("Token Settings Update Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

function findDuplicateTargetKey(
  conversions: Array<{ targetKey: string }>
): string | null {
  const seen = new Set<string>();

  for (const conversion of conversions) {
    if (seen.has(conversion.targetKey)) {
      return conversion.targetKey;
    }
    seen.add(conversion.targetKey);
  }

  return null;
}
