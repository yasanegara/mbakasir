import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Memulai pendaftaran akun demo terintegrasi...");

  const AGENT_EMAIL = "agen.demo@mbakasir.id";
  const OWNER_EMAIL = "owner@demo.id";
  const KASIR_EMAIL = "kasir@demo.id";
  const PASSWORD_HASH = await bcrypt.hash("Owner@Demo2026!", 12);
  const KASIR_HASH = await bcrypt.hash("Kasir@1234!", 12);

  // 1. Buat atau Update Agen
  const agent = await prisma.agent.upsert({
    where: { email: AGENT_EMAIL },
    update: {
      name: "Demo Agen Edukasi",
      passwordHash: PASSWORD_HASH,
    },
    create: {
      email: AGENT_EMAIL,
      name: "Demo Agen Edukasi",
      passwordHash: PASSWORD_HASH,
      tokenBalance: 1000,
    },
  });
  console.log("✅ Akun Agen Demo siap.");

  // 2. Buat atau Update Tenant (Toko) yang dikelola Agen tersebut
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const tenant = await prisma.tenant.upsert({
    where: { id: "demo-tenant-edu" },
    update: {
      name: "Toko Demo Edukasi",
      agentId: agent.id,
      status: "ACTIVE",
      premiumUntil: thirtyDaysFromNow,
      tokenBalance: 4,
      tokenUsed: 1,
    },
    create: {
      id: "demo-tenant-edu",
      name: "Toko Demo Edukasi",
      agentId: agent.id,
      status: "ACTIVE",
      premiumUntil: thirtyDaysFromNow,
      tokenBalance: 4,
      tokenUsed: 1,
    },
  });
  console.log("✅ Toko Demo Edukasi siap.");

  // 3. Buat atau Update User Owner
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: OWNER_EMAIL } },
    update: {
      name: "Demo Owner",
      passwordHash: PASSWORD_HASH,
      role: "TENANT",
    },
    create: {
      email: OWNER_EMAIL,
      name: "Demo Owner",
      passwordHash: PASSWORD_HASH,
      role: "TENANT",
      tenantId: tenant.id,
    },
  });
  console.log("✅ Akun Owner Demo siap.");

  // 4. Buat atau Update User Kasir
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: KASIR_EMAIL } },
    update: {
      name: "Demo Kasir",
      passwordHash: KASIR_HASH,
      role: "CASHIER",
      pin: "123456",
    },
    create: {
      email: KASIR_EMAIL,
      name: "Demo Kasir",
      passwordHash: KASIR_HASH,
      role: "CASHIER",
      tenantId: tenant.id,
      pin: "123456",
    },
  });
  console.log("✅ Akun Kasir Demo siap.");

  console.log("\n🚀 Semua akun demo berhasil disinkronkan!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
