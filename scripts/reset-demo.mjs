/**
 * Reset Demo Accounts — jalankan sekali:
 * npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/reset-demo.mjs
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🔧 Resetting demo accounts...");

  // Reset SuperAdmin
  const adminHash = await bcrypt.hash("SuperAdmin@2026!", 12);
  await prisma.superAdmin.upsert({
    where: { email: "admin@mbakasir.id" },
    update: { passwordHash: adminHash },
    create: {
      name: "Super Administrator",
      email: "admin@mbakasir.id",
      passwordHash: adminHash,
    },
  });
  console.log("✅ SuperAdmin: admin@mbakasir.id / SuperAdmin@2026!");

  // Reset Demo Agent
  const agentHash = await bcrypt.hash("Agent@Demo2026!", 12);
  const agent = await prisma.agent.upsert({
    where: { email: "agen.demo@mbakasir.id" },
    update: {
      passwordHash: agentHash,
      isActive: true,
      tokenBalance: 24,
      totalMinted: 24,
    },
    create: {
      name: "Agen Demo Surabaya",
      email: "agen.demo@mbakasir.id",
      phone: "08123456789",
      passwordHash: agentHash,
      tokenBalance: 24,
      totalMinted: 24,
      totalUsed: 0,
      isActive: true,
    },
  });
  console.log("✅ Agent: agen.demo@mbakasir.id / Agent@Demo2026!");
  console.log("   Token balance:", agent.tokenBalance, "| isActive:", agent.isActive);

  // Reset Demo Tenant + Owner
  const ownerHash = await bcrypt.hash("Owner@Demo2026!", 12);
  const cashierHash = await bcrypt.hash("Kasir@1234!", 12);

  // Cari / buat tenant demo
  let tenant = await prisma.tenant.findFirst({
    where: { agentId: agent.id },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        agentId: agent.id,
        name: "Warung MbaKasir Demo",
        businessType: "Kuliner",
        address: "Jl. Raya Demo No. 1",
        phone: "081234567890",
        status: "ACTIVE",
        premiumUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2), // 2 tahun
        tokenUsed: 1,
      },
    });
    console.log("✅ Created demo tenant:", tenant.name);
  } else {
    // Pastikan aktif
    tenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        status: "ACTIVE",
        premiumUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2),
      },
    });
    console.log("✅ Updated demo tenant to ACTIVE:", tenant.name);
  }

  // Pastikan POS default ada
  await prisma.posTerminal.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "POS-001" } },
    update: { isActive: true },
    create: {
      tenantId: tenant.id,
      name: "POS Utama",
      code: "POS-001",
      isDefault: true,
      isActive: true,
      tokenCost: 0,
    },
  });

  // Owner
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "owner@demo.id" } },
    update: { passwordHash: ownerHash, isActive: true },
    create: {
      tenantId: tenant.id,
      name: "Sari Pemilik",
      email: "owner@demo.id",
      passwordHash: ownerHash,
      role: "TENANT",
      isActive: true,
    },
  });
  console.log("✅ Owner: owner@demo.id / Owner@Demo2026!");

  // Kasir
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "kasir@demo.id" } },
    update: { passwordHash: cashierHash, isActive: true },
    create: {
      tenantId: tenant.id,
      name: "Budi Kasir",
      email: "kasir@demo.id",
      passwordHash: cashierHash,
      role: "CASHIER",
      pin: "123456",
      isActive: true,
    },
  });
  // Buat / aktifkan store registration link untuk demo agent
  // Nonaktifkan semua link lama dulu
  await prisma.storeRegistrationLink.updateMany({
    where: { agentId: agent.id, isActive: true },
    data: { isActive: false },
  });

  // Buat/aktifkan beberapa slug demo
  for (const slug of ["yk", "nur", "demo"]) {
    await prisma.storeRegistrationLink.upsert({
      where: { token: slug },
      update: { agentId: agent.id, isActive: true },
      create: { agentId: agent.id, token: slug, isActive: true, useCount: 0 },
    });
    console.log(`✅ Store Registration Link: /register/store/${slug} (aktif)`);
  }

  console.log("\n🎉 Done! Akun dan link siap digunakan.");
  console.log("─────────────────────────────────────────────────────────");
  console.log("SuperAdmin  : admin@mbakasir.id       / SuperAdmin@2026!");
  console.log("Agen Demo   : agen.demo@mbakasir.id   / Agent@Demo2026!");
  console.log("Owner Toko  : owner@demo.id           / Owner@Demo2026!");
  console.log("Kasir       : kasir@demo.id           / Kasir@1234!");
  console.log("Kasir PIN   : 123456");
  console.log("Link Toko   : /register/store/yk");
  console.log("             /register/store/nur");
  console.log("             /register/store/demo");
  console.log("─────────────────────────────────────────────────────────");
  console.log("\n💡 Agen bisa buat link custom sendiri dari dashboard /stores");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("❌ Error:", e);
    prisma.$disconnect();
    process.exit(1);
  });
