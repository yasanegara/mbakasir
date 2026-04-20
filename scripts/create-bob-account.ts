import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// ============================================================
// Script: Buat akun SuperAdmin & Tenant Owner untuk Bob
// Email : bob@executive.id
// ============================================================

const prisma = new PrismaClient();

async function main() {
  const RAW_PASSWORD = "@Kh1l4f4h";
  const EMAIL = "bob@executive.id";
  const NAME = "Bob Executive";

  const passwordHash = await bcrypt.hash(RAW_PASSWORD, 12);

  // ─── 1. SuperAdmin ──────────────────────────────────────────
  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: EMAIL },
    update: {
      name: NAME,
      passwordHash,
    },
    create: {
      name: NAME,
      email: EMAIL,
      passwordHash,
    },
  });
  console.log("✅ SuperAdmin dibuat:", superAdmin.email, "| id:", superAdmin.id);

  // ─── 2. Tenant Owner pada demo-tenant-001 ──────────────────
  // Pastikan tenant demo ada sebelum insert user
  const demoTenant = await prisma.tenant.findUnique({
    where: { id: "demo-tenant-001" },
  });

  if (demoTenant) {
    const ownerUser = await prisma.user.upsert({
      where: {
        tenantId_email: { tenantId: demoTenant.id, email: EMAIL },
      },
      update: {
        name: NAME,
        passwordHash,
        role: "TENANT",
        isActive: true,
      },
      create: {
        tenantId: demoTenant.id,
        name: NAME,
        email: EMAIL,
        passwordHash,
        role: "TENANT",
        isActive: true,
      },
    });
    console.log("✅ Tenant Owner dibuat:", ownerUser.email, "| tenantId:", ownerUser.tenantId);
  } else {
    console.warn("⚠️  demo-tenant-001 tidak ditemukan — user Owner dilewati. Jalankan seed utama dulu.");
  }

  console.log("\n═══════════════════════════════════════");
  console.log("  Akun berhasil dibuat");
  console.log("───────────────────────────────────────");
  console.log("  Email    :", EMAIL);
  console.log("  Password :", RAW_PASSWORD);
  console.log("  Role     : SuperAdmin + Tenant Owner");
  console.log("═══════════════════════════════════════\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("❌ Gagal:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
