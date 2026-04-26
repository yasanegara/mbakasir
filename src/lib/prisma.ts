import "server-only";
import { PrismaClient } from "@prisma/client";

// ============================================================
// PRISMA CLIENT SINGLETON — Anti-leaking connection di dev mode
// Setiap hot-reload tidak akan membuat koneksi baru
// ============================================================

const REQUIRED_PRISMA_MODEL_DELEGATES = [
  "tokenConfig",
  "tokenConversion",
  "storeRegistrationLink",
  "posTerminal",
  "tokenPurchaseRequest",
  "agentTokenPurchaseRequest",
  "productAssignment",
  "storefrontConfig",
  "onlineOrder",
  "onlineOrderItem",
] as const;

type RequiredPrismaModelDelegate =
  (typeof REQUIRED_PRISMA_MODEL_DELEGATES)[number];

type PrismaClientWithRequiredDelegates = PrismaClient &
  Record<RequiredPrismaModelDelegate, unknown>;

type AgentTokenPurchaseRequestDelegate = {
  count: (...args: any[]) => Promise<any>;
  aggregate: (...args: any[]) => Promise<any>;
  findMany: (...args: any[]) => Promise<any>;
  create: (...args: any[]) => Promise<any>;
  findFirst: (...args: any[]) => Promise<any>;
  update: (...args: any[]) => Promise<any>;
};

type PrismaLikeWithAgentTokenPurchaseRequest = {
  agentTokenPurchaseRequest?: AgentTokenPurchaseRequestDelegate;
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaVersion: number | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

function hasRequiredModelDelegates(
  client: PrismaClient | undefined
): client is PrismaClientWithRequiredDelegates {
  if (!client) {
    return false;
  }

  // When Prisma schema changes during dev, hot reload can keep an older
  // singleton alive. Recreate it if the new model delegates are missing.
  return REQUIRED_PRISMA_MODEL_DELEGATES.every(
    (delegate) =>
      typeof (client as PrismaClientWithRequiredDelegates)[delegate] !== "undefined"
  );
}

const CURRENT_SCHEMA_VERSION = 19;

if (globalForPrisma.prismaVersion !== CURRENT_SCHEMA_VERSION) {
  globalForPrisma.prisma = undefined;
}

export const prisma =
  (hasRequiredModelDelegates(globalForPrisma.prisma)
    ? globalForPrisma.prisma
    : undefined) ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaVersion = CURRENT_SCHEMA_VERSION;
}

export function getAgentTokenPurchaseRequestDelegate<T extends object>(
  client: T
): AgentTokenPurchaseRequestDelegate | null {
  return (
    (client as T & PrismaLikeWithAgentTokenPurchaseRequest)
      .agentTokenPurchaseRequest ?? null
  );
}
