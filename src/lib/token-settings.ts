import "server-only";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_TOKEN_CONFIG,
  DEFAULT_TOKEN_CONFIG_ID,
  type TokenConfigSnapshot,
} from "@/lib/token-settings-shared";

type PrismaTokenConfigWithConversions = Awaited<ReturnType<typeof fetchTokenConfigRow>>;

function getTokenConfigDelegate() {
  const tokenConfigDelegate = (
    prisma as PrismaClient & { tokenConfig?: PrismaClient["tokenConfig"] }
  ).tokenConfig;

  if (!tokenConfigDelegate) {
    throw new Error(
      "Prisma client is missing the `tokenConfig` model delegate. Run `npm run db:generate` and restart the Next.js server."
    );
  }

  return tokenConfigDelegate;
}

async function fetchTokenConfigRow() {
  return getTokenConfigDelegate().findUnique({
    where: { id: DEFAULT_TOKEN_CONFIG_ID },
    include: {
      conversions: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });
}

async function backfillDefaultConversions(
  config: NonNullable<PrismaTokenConfigWithConversions>
) {
  const existingTargetKeys = new Set(
    config.conversions.map((conversion) => conversion.targetKey)
  );

  const missingDefaults = DEFAULT_TOKEN_CONFIG.conversions.filter(
    (conversion) => !existingTargetKeys.has(conversion.targetKey)
  );

  if (missingDefaults.length === 0) {
    return config;
  }

  await getTokenConfigDelegate().update({
    where: { id: DEFAULT_TOKEN_CONFIG_ID },
    data: {
      conversions: {
        create: missingDefaults.map((conversion) => ({
          targetKey: conversion.targetKey,
          targetLabel: conversion.targetLabel,
          moduleKey: conversion.moduleKey ?? null,
          tokenCost: conversion.tokenCost,
          rewardQuantity: conversion.rewardQuantity,
          rewardUnit: conversion.rewardUnit,
          description: conversion.description ?? null,
          isActive: conversion.isActive,
          sortOrder: conversion.sortOrder,
        })),
      },
    },
  });

  const refreshed = await fetchTokenConfigRow();
  return refreshed ?? config;
}

export function normalizeTokenConfig(
  config: PrismaTokenConfigWithConversions
): TokenConfigSnapshot {
  const defaultPricePerToken = Number(
    process.env.NEXT_PUBLIC_TOKEN_HPP || DEFAULT_TOKEN_CONFIG.pricePerToken
  );

  if (!config) {
    return {
      ...DEFAULT_TOKEN_CONFIG,
      pricePerToken: defaultPricePerToken,
    };
  }

  return {
    id: config.id,
    tokenName: config.tokenName,
    tokenSymbol: config.tokenSymbol,
    pricePerToken: Number(config.pricePerToken),
    currencyCode: config.currencyCode,
    // @ts-expect-error: hppRatio may be new field not yet in generated client
    hppRatio: typeof (config as any).hppRatio === "number" ? (config as any).hppRatio : 40,
    notes: config.notes,
    conversions:
      config.conversions.length > 0
        ? config.conversions.map((conversion) => ({
            id: conversion.id,
            targetKey: conversion.targetKey,
            targetLabel: conversion.targetLabel,
            moduleKey: conversion.moduleKey,
            tokenCost: conversion.tokenCost,
            rewardQuantity: conversion.rewardQuantity,
            rewardUnit: conversion.rewardUnit,
            description: conversion.description,
            isActive: conversion.isActive,
            sortOrder: conversion.sortOrder,
          }))
        : DEFAULT_TOKEN_CONFIG.conversions,
  };
}

export async function getTokenConfig(): Promise<TokenConfigSnapshot> {
  const config = await fetchTokenConfigRow();
  return normalizeTokenConfig(config);
}

export async function ensureTokenConfig(): Promise<TokenConfigSnapshot> {
  const existing = await fetchTokenConfigRow();
  if (existing) {
    const hydratedConfig = await backfillDefaultConversions(existing);
    return normalizeTokenConfig(hydratedConfig);
  }

  const defaultPricePerToken = Number(
    process.env.NEXT_PUBLIC_TOKEN_HPP || DEFAULT_TOKEN_CONFIG.pricePerToken
  );

  await getTokenConfigDelegate().create({
    data: {
      id: DEFAULT_TOKEN_CONFIG.id,
      tokenName: DEFAULT_TOKEN_CONFIG.tokenName,
      tokenSymbol: DEFAULT_TOKEN_CONFIG.tokenSymbol,
      pricePerToken: defaultPricePerToken,
      currencyCode: DEFAULT_TOKEN_CONFIG.currencyCode,
      hppRatio: DEFAULT_TOKEN_CONFIG.hppRatio,
      notes: DEFAULT_TOKEN_CONFIG.notes,
      conversions: {
        create: DEFAULT_TOKEN_CONFIG.conversions.map((conversion) => ({
          targetKey: conversion.targetKey,
          targetLabel: conversion.targetLabel,
          moduleKey: conversion.moduleKey ?? null,
          tokenCost: conversion.tokenCost,
          rewardQuantity: conversion.rewardQuantity,
          rewardUnit: conversion.rewardUnit,
          description: conversion.description ?? null,
          isActive: conversion.isActive,
          sortOrder: conversion.sortOrder,
        })),
      },
    },
  });

  return {
    ...DEFAULT_TOKEN_CONFIG,
    pricePerToken: defaultPricePerToken,
  };
}
