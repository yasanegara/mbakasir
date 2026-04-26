import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureTokenConfig } from "@/lib/token-settings";
import { getTokenConversion, calculateTokenCostForQuantity } from "@/lib/token-settings-shared";
import { NextRequest } from "next/server";
import { addDays } from "date-fns";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "TENANT" || !session.tenantId) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const { targetKey, quantity } = await req.json();

    if (!targetKey || !quantity || quantity <= 0) {
      return Response.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const tokenConfig = await ensureTokenConfig();
    const conversion = getTokenConversion(tokenConfig, targetKey);

    if (!conversion) {
      return Response.json({ error: "Produk addon tidak ditemukan" }, { status: 404 });
    }

    const tokenCost = calculateTokenCostForQuantity(conversion, quantity);

    const result = await prisma.$transaction(async (tx: any) => {
      const tenant = (await tx.tenant.findUnique({
        where: { id: session.tenantId },
        include: { storefront: true } as any
      })) as any;

      if (!tenant) throw new Error("Toko tidak ditemukan");
      if (tenant.tokenBalance < tokenCost) {
        throw new Error(`Saldo koin Anda tidak mencukupi (Butuh ${tokenCost}). Silakan hubungi Agen.`);
      }

      // 1. Potong saldo tenant
      const balanceBefore = tenant.tokenBalance;
      const balanceAfter = balanceBefore - tokenCost;

      await (tx.tenant.update({
        where: { id: tenant.id },
        data: {
          tokenBalance: balanceAfter,
          tokenUsed: { increment: tokenCost }
        } as any
      }) as any);

      // 2. Kalkulasi Durasi
      const rewardDays = conversion.rewardQuantity * quantity * 30; // Asumsi 1 unit = 30 hari jika "bulan"

      // 3. Update Modul Spesifik
      const now = new Date();
      
      // Update/Create TenantModule record
      const existingModule = await (tx as any).tenantModule.findUnique({
        where: { tenantId_moduleKey: { tenantId: tenant.id, moduleKey: targetKey } }
      });

      const baseDate = (existingModule && existingModule.activeUntil > now) ? existingModule.activeUntil : now;
      const newUntil = addDays(baseDate, rewardDays);

      await (tx as any).tenantModule.upsert({
        where: { tenantId_moduleKey: { tenantId: tenant.id, moduleKey: targetKey } },
        update: { activeUntil: newUntil },
        create: { tenantId: tenant.id, moduleKey: targetKey, activeUntil: newUntil }
      });

      // SPECIAL LOGIC: Jika modul adalah LICENSE, update premiumUntil toko
      if (targetKey === "LICENSE_MONTH") {
        await tx.tenant.update({
          where: { id: tenant.id },
          data: { premiumUntil: newUntil, status: "ACTIVE" }
        });
      }

      // SPECIAL LOGIC: Jika modul adalah STOREFRONT_MONTH, update activeUntil storefront
      if (targetKey === "STOREFRONT_MONTH") {
        if (tenant.storefront) {
          await (tx as any).storefrontConfig.update({
            where: { tenantId: tenant.id },
            data: { activeUntil: newUntil, isActive: true }
          });
        } else {
          // Buat storefront default jika belum ada
          const baseSlug = tenant.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          await (tx as any).storefrontConfig.create({
            data: { tenantId: tenant.id, slug: baseSlug, isActive: true, activeUntil: newUntil }
          });
        }
      }

      // 4. Catat Ledger
      await tx.tokenLedger.create({
        data: {
          tenantId: tenant.id,
          agentId: tenant.agentId,
          type: "ACTIVATE",
          amount: -tokenCost,
          balanceBefore,
          balanceAfter,
          description: `Self-activation: ${conversion.targetLabel} (${quantity} unit)`,
          conversionTargetKey: targetKey,
          conversionQuantity: quantity,
          conversionUnit: conversion.rewardUnit
        }
      });

      return { success: true, activeUntil: newUntil };
    });

    return Response.json(result);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
