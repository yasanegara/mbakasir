import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  ensureDefaultPosTerminal,
  formatPosCode,
  getDefaultPosName,
} from "@/lib/pos-terminals";
import { prisma } from "@/lib/prisma";
import { ensureTokenConfig } from "@/lib/token-settings";
import {
  calculateTokenCostForQuantity,
  getTokenConversion,
} from "@/lib/token-settings-shared";

const createPosTerminalSchema = z.object({
  name: z.string().trim().max(80).optional().or(z.literal("")),
});

function serializeTerminal(terminal: {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
  isActive: boolean;
  tokenCost: number;
  createdAt: Date;
}) {
  return {
    id: terminal.id,
    name: terminal.name,
    code: terminal.code,
    isDefault: terminal.isDefault,
    isActive: terminal.isActive,
    tokenCost: terminal.tokenCost,
    createdAt: terminal.createdAt.toISOString(),
  };
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "TENANT" || !session.tenantId) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const parsed = createPosTerminalSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message || "Data POS tidak valid" },
        { status: 400 }
      );
    }

    const tokenConfig = await ensureTokenConfig();
    const posConversion = getTokenConversion(tokenConfig, "POS_SLOT");

    if (!posConversion) {
      return Response.json(
        { error: "Rule POS_SLOT belum aktif di pengaturan pusat." },
        { status: 400 }
      );
    }

    const tokenCost = calculateTokenCostForQuantity(posConversion, 1);

    if (tokenCost > 0) {
      return Response.json(
        { error: "Penambahan POS berbayar tidak bisa dilakukan sepihak oleh Toko. Silakan transfer pembayaran ke Agen Anda lalu minta Agen untuk mengaktifkan POS ini." },
        { status: 403 }
      );
    }

    const result = await prisma.$transaction(async (tx: any) => {
      await ensureDefaultPosTerminal(tx, session.tenantId!);

      const tenant = await tx.tenant.findUnique({
        where: {
          id: session.tenantId!,
        },
        select: {
          id: true,
          name: true,
          agentId: true,
          agent: {
            select: {
              tokenBalance: true,
            },
          },
          posTerminals: {
            orderBy: {
              createdAt: "asc",
            },
            select: {
              id: true,
            },
          },
        },
      });

      if (!tenant) {
        throw new Error("Toko tidak ditemukan.");
      }

      if (tenant.agent.tokenBalance < tokenCost) {
        throw new Error(
          `Saldo agen tidak mencukupi. Butuh ${tokenCost} ${tokenConfig.tokenSymbol}.`
        );
      }

      const nextSequence = tenant.posTerminals.length + 1;
      const balanceBefore = tenant.agent.tokenBalance;
      const balanceAfter = balanceBefore - tokenCost;

      const terminal = await tx.posTerminal.create({
        data: {
          tenantId: tenant.id,
          name: parsed.data.name?.trim() || getDefaultPosName(nextSequence),
          code: formatPosCode(nextSequence),
          isDefault: false,
          isActive: true,
          tokenCost,
        },
        select: {
          id: true,
          name: true,
          code: true,
          isDefault: true,
          isActive: true,
          tokenCost: true,
          createdAt: true,
        },
      });

      await tx.agent.update({
        where: {
          id: tenant.agentId,
        },
        data: {
          tokenBalance: balanceAfter,
          totalUsed: {
            increment: tokenCost,
          },
        },
      });

      await tx.tenant.update({
        where: {
          id: tenant.id,
        },
        data: {
          tokenUsed: {
            increment: tokenCost,
          },
        },
      });

      await tx.tokenLedger.create({
        data: {
          agentId: tenant.agentId,
          tenantId: tenant.id,
          type: "POS_ADD",
          amount: -tokenCost,
          balanceBefore,
          balanceAfter,
          description: `Tambah terminal POS untuk ${tenant.name} (${terminal.name})`,
          conversionTargetKey: posConversion.targetKey,
          conversionLabel: posConversion.targetLabel,
          conversionQuantity: 1,
          conversionUnit: posConversion.rewardUnit,
        },
      });

      return {
        terminal,
        balanceAfter,
      };
    });

    return Response.json({
      success: true,
      terminal: serializeTerminal(result.terminal),
      balanceAfter: result.balanceAfter,
      tokenCost,
      tokenSymbol: tokenConfig.tokenSymbol,
    });
  } catch (error) {
    console.error("Create POS Terminal Error:", error);

    if (error instanceof Error) {
      if (
        error.message === "Toko tidak ditemukan." ||
        error.message.startsWith("Saldo agen tidak mencukupi.")
      ) {
        return Response.json({ error: error.message }, { status: 400 });
      }
    }

    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "TENANT" || !session.tenantId) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const { id, targetRevenue } = await req.json();

    if (!id) {
      return Response.json({ error: "ID Terminal diperlukan" }, { status: 400 });
    }

    const terminal = await prisma.posTerminal.update({
      where: { 
        id,
        tenantId: session.tenantId
      },
      data: {
        targetRevenue: parseFloat(targetRevenue) || 0
      }
    });

    return Response.json({ success: true, terminal });
  } catch (error) {
    console.error("Update POS Terminal Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
