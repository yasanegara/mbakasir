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
] as const;

type RequiredPrismaModelDelegate =
  (typeof REQUIRED_PRISMA_MODEL_DELEGATES)[number];

type PrismaClientWithRequiredDelegates = PrismaClient &
  Record<RequiredPrismaModelDelegate, unknown>;

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

const CURRENT_SCHEMA_VERSION = 12;

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
