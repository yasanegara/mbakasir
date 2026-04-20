import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export async function findExistingLoginIdentity(
  prisma: PrismaLike,
  email: string
): Promise<{
  kind: "SUPERADMIN" | "AGENT" | "USER";
  id: string;
} | null> {
  const [superAdmin, agent, user] = await Promise.all([
    prisma.superAdmin.findUnique({
      where: { email },
      select: { id: true },
    }),
    prisma.agent.findUnique({
      where: { email },
      select: { id: true },
    }),
    prisma.user.findFirst({
      where: { email },
      select: { id: true },
    }),
  ]);

  if (superAdmin) {
    return { kind: "SUPERADMIN", id: superAdmin.id };
  }

  if (agent) {
    return { kind: "AGENT", id: agent.id };
  }

  if (user) {
    return { kind: "USER", id: user.id };
  }

  return null;
}
