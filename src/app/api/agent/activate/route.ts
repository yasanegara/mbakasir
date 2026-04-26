import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureTokenConfig } from "@/lib/token-settings";
import { calculateTokenCostForQuantity, getTokenConversion } from "@/lib/token-settings-shared";
import { ensureDefaultPosTerminal, getDefaultPosName, formatPosCode } from "@/lib/pos-terminals";
import { getStorefrontConfigDelegate } from "@/lib/prisma";

const activateSchema = z.object({
  reqId: z.string().optional(),
  tenantId: z.string(),
  targetKey: z.string(),
  quantity: z.number().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "AGENT" || !session.agentId) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const data = await req.json();
    const parsed = activateSchema.parse(data);

    const tokenConfig = await ensureTokenConfig();
    const conversion = getTokenConversion(tokenConfig, parsed.targetKey);

    if (!conversion) {
      return Response.json({ error: "Rule konversi pusat tidak ditemukan" }, { status: 400 });
    }

    const tokenCost = calculateTokenCostForQuantity(conversion, parsed.quantity);

    const result = await prisma.$transaction(async (tx) => {
      const agent = await tx.agent.findUnique({ where: { id: session.agentId! } });
      if (!agent || agent.tokenBalance < tokenCost) {
        throw new Error(`Saldo token Anda tidak mencukupi (Butuh ${tokenCost}).`);
      }

      const tenant = await tx.tenant.findUnique({ 
        where: { id: parsed.tenantId },
        include: { posTerminals: true }
      });
      if (!tenant || tenant.agentId !== agent.id) {
        throw new Error("Toko tidak valid atau bukan milik Anda.");
      }

      // Potong saldo agent
      const balanceBefore = agent.tokenBalance;
      const balanceAfter = balanceBefore - tokenCost;

      await tx.agent.update({
        where: { id: agent.id },
        data: { tokenBalance: balanceAfter, totalUsed: { increment: tokenCost } }
      });

      // Tambah usage tenant
      await tx.tenant.update({
        where: { id: tenant.id },
        data: { tokenUsed: { increment: tokenCost } }
      });

      let description = "";

      if (parsed.targetKey === "POS_SLOT") {
        await ensureDefaultPosTerminal(tx, tenant.id);
        const latestTerminals = await tx.posTerminal.findMany({ where: { tenantId: tenant.id } });
        const nextSequence = latestTerminals.length + 1;
        
        let createdTerminalCount = 0;
        for(let i=0; i<parsed.quantity; i++) {
            await tx.posTerminal.create({
                data: {
                    tenantId: tenant.id,
                    name: getDefaultPosName(nextSequence + i),
                    code: formatPosCode(nextSequence + i),
                    tokenCost: Math.max(1, conversion.tokenCost),
                    isDefault: false
                }
            });
            createdTerminalCount++;
        }
        description = `Agen mengaktifkan ${createdTerminalCount} Terminal POS Tambahan untuk Toko ${tenant.name}`;
      } else if (parsed.targetKey === "LICENSE_MONTH") {
        const now = new Date();
        const currentPremium = tenant.premiumUntil && tenant.premiumUntil > now ? tenant.premiumUntil : now;
        const rewardQty = conversion.rewardQuantity * parsed.quantity;
        const newPremium = new Date(currentPremium);
        newPremium.setMonth(newPremium.getMonth() + rewardQty);

        await tx.tenant.update({
          where: { id: tenant.id },
          data: { 
            premiumUntil: newPremium,
            status: "ACTIVE",   // ← Buka kunci toko
          }
        });
        description = `Agen menambahkan ${rewardQty} bulan lisensi untuk Toko ${tenant.name}`;
      } else if (parsed.targetKey === "STOREFRONT_MONTH") {
        const now = new Date();
        const rewardMonths = conversion.rewardQuantity * parsed.quantity;
        const sfDelegate = getStorefrontConfigDelegate(tx);
        const existing = await sfDelegate.findUnique({ where: { tenantId: tenant.id } });

        if (existing) {
          const current = existing.activeUntil && existing.activeUntil > now ? existing.activeUntil : now;
          const newActiveUntil = new Date(current);
          newActiveUntil.setMonth(newActiveUntil.getMonth() + rewardMonths);
          await sfDelegate.update({
            where: { tenantId: tenant.id },
            data: { activeUntil: newActiveUntil, isActive: true }
          });
          description = `Agen memperpanjang Storefront ${rewardMonths} bulan untuk Toko ${tenant.name}`;
        } else {
          const baseSlug = tenant.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          let slug = baseSlug;
          let attempt = 0;
          while (await sfDelegate.findUnique({ where: { slug } })) {
            attempt++;
            slug = `${baseSlug}-${attempt}`;
          }
          const activeUntil = new Date(now);
          activeUntil.setMonth(activeUntil.getMonth() + rewardMonths);
          await sfDelegate.create({
            data: { tenantId: tenant.id, slug, isActive: true, activeUntil }
          });
          description = `Agen mengaktifkan Storefront ${rewardMonths} bulan untuk Toko ${tenant.name} (URL: /store/${slug})`;
        }
      } else if (parsed.targetKey === "TOPUP") {
        const topupAmount = conversion.rewardQuantity * parsed.quantity;
        await tx.tenant.update({
          where: { id: tenant.id },
          data: { tokenBalance: { increment: topupAmount } }
        });
        description = `Agen melakukan Top-up ${topupAmount} token ke Toko ${tenant.name}`;
      }

      // Catat di ledger
      await tx.tokenLedger.create({
        data: {
          agentId: agent.id,
          tenantId: tenant.id,
          type: "ACTIVATE",
          amount: -tokenCost,
          balanceBefore,
          balanceAfter,
          description,
          conversionTargetKey: conversion.targetKey,
          conversionQuantity: parsed.quantity,
          conversionUnit: conversion.rewardUnit
        }
      });

      // Update Purchase Request jika reqId disertakan
      if (parsed.reqId) {
        await tx.tokenPurchaseRequest.update({
          where: { id: parsed.reqId },
          data: { status: "APPROVED" }
        });
      }

      return { success: true };
    });

    return Response.json(result);
  } catch (err: any) {
    if (err.message.includes("Saldo token") || err.message.includes("Toko tidak valid")) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
