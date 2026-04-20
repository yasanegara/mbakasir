import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export function formatPosCode(sequence: number): string {
  return `POS-${String(Math.max(1, sequence)).padStart(3, "0")}`;
}

export function getDefaultPosName(sequence: number): string {
  return sequence === 1 ? "POS Utama" : `POS ${sequence}`;
}

export async function ensureDefaultPosTerminal(
  prisma: PrismaLike,
  tenantId: string
){
  const existingDefault = await prisma.posTerminal.findFirst({
    where: {
      tenantId,
      isDefault: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (existingDefault) {
    return existingDefault;
  }

  const firstTerminal = await prisma.posTerminal.findFirst({
    where: { tenantId },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!firstTerminal) {
    return prisma.posTerminal.create({
      data: {
        tenantId,
        name: getDefaultPosName(1),
        code: formatPosCode(1),
        isDefault: true,
        isActive: true,
        tokenCost: 0,
      },
    });
  }

  return prisma.posTerminal.update({
    where: { id: firstTerminal.id },
    data: {
      isDefault: true,
    },
  });
}
