import { PrismaClient } from "@prisma/client";

// ============================================================
// PRISMA CLIENT SINGLETON — Anti-leaking connection di dev mode
// Setiap hot-reload tidak akan membuat koneksi baru
// ============================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
