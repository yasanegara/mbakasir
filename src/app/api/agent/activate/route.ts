import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureTokenConfig } from "@/lib/token-settings";
import { calculateTokenCostForQuantity, getTokenConversion } from "@/lib/token-settings-shared";
import { ensureDefaultPosTerminal, getDefaultPosName, formatPosCode } from "@/lib/pos-terminals";

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
        // @ts-expect-error: TS cache
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
        const rewardQty = conversion.rewardQuantity * parsed.quantity; // misal 1 token = 1 month
        const newPremium = new Date(currentPremium);
        newPremium.setMonth(newPremium.getMonth() + rewardQty);

        await tx.tenant.update({
          where: { id: tenant.id },
          data: { premiumUntil: newPremium }
        });
        description = `Agen menambahkan ${rewardQty} bulan lisensi untuk Toko ${tenant.name}`;
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
        // @ts-expect-error: TS Server cache issues
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
