import "server-only";

type PrismaLike = any; 

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
  // 1. Verify tenant exists to avoid foreign key violations (stale sessions)
  const tenant = await (prisma as any).tenant.findUnique({
    where: { id: tenantId },
    select: { id: true }
  });

  if (!tenant) return null;

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
