import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// ============================================================
// PRISMA SEED — Data awal sistem Mbakasir
// ============================================================

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Mbakasir database...");

  // ─── SuperAdmin ────────────────────────────────────────────
  const superAdminPassword = await bcrypt.hash("SuperAdmin@2026!", 12);
  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: "admin@mbakasir.id" },
    update: {},
    create: {
      name: "Super Administrator",
      email: "admin@mbakasir.id",
      passwordHash: superAdminPassword,
    },
  });
  console.log("✅ SuperAdmin:", superAdmin.email);

  // ─── Demo Agent ────────────────────────────────────────────
  const agentPassword = await bcrypt.hash("Agent@Demo2026!", 12);
  const demoAgent = await prisma.agent.upsert({
    where: { email: "agen.demo@mbakasir.id" },
    update: {},
    create: {
      name: "Agen Demo Surabaya",
      email: "agen.demo@mbakasir.id",
      phone: "08123456789",
      passwordHash: agentPassword,
      tokenBalance: 24, // 24 token = 2 tahun untuk 1 toko
      totalMinted: 24,
      totalUsed: 0,
    },
  });
  console.log("✅ Demo Agent:", demoAgent.email, "| Token:", demoAgent.tokenBalance);

  // ─── Demo Tenant (Toko) ─────────────────────────────────────
  const demoTenant = await prisma.tenant.upsert({
    where: { id: "demo-tenant-001" },
    update: {},
    create: {
      id: "demo-tenant-001",
      agentId: demoAgent.id,
      name: "Warung Mbakasir Demo",
      businessType: "Kuliner",
      address: "Jl. Raya Surabaya No. 1",
      phone: "081234567890",
      status: "ACTIVE",
      premiumUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 hari dari sekarang
      tokenUsed: 1,
    },
  });
  console.log("✅ Demo Tenant:", demoTenant.name);

  // ─── Demo Cashier User ─────────────────────────────────────
  const cashierPassword = await bcrypt.hash("Kasir@1234!", 12);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demoTenant.id, email: "kasir@demo.id" } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: "Budi Kasir",
      email: "kasir@demo.id",
      passwordHash: cashierPassword,
      role: "CASHIER",
      pin: "123456",
      isActive: true,
    },
  });
  console.log("✅ Demo Cashier: kasir@demo.id");

  // ─── Demo Products ─────────────────────────────────────────
  const products = [
    { sku: "ES-001", name: "Es Teh Manis", category: "Minuman", price: 5000, costPrice: 1500, stock: 999 },
    { sku: "NS-001", name: "Nasi Goreng Spesial", category: "Makanan", price: 25000, costPrice: 10000, stock: 50 },
    { sku: "AY-001", name: "Ayam Bakar", category: "Makanan", price: 35000, costPrice: 15000, stock: 30 },
    { sku: "JU-001", name: "Jus Alpukat", category: "Minuman", price: 18000, costPrice: 7000, stock: 999 },
    { sku: "RO-001", name: "Roti Bakar Coklat", category: "Snack", price: 12000, costPrice: 4000, stock: 100 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { tenantId_sku: { tenantId: demoTenant.id, sku: p.sku } },
      update: {},
      create: {
        tenantId: demoTenant.id,
        ...p,
        unit: p.category === "Makanan" || p.category === "Snack" ? "porsi" : "gelas",
        isActive: true,
        hasBoM: false,
        syncStatus: "SYNCED",
      },
    });
  }
  console.log(`✅ ${products.length} Demo Products created`);

  // ─── Token Ledger record untuk demo ────────────────────────
  await prisma.tokenLedger.create({
    data: {
      agentId: demoAgent.id,
      tenantId: demoTenant.id,
      superAdminId: superAdmin.id,
      type: "MINT",
      amount: 24,
      balanceBefore: 0,
      balanceAfter: 24,
      description: "Initial token mint untuk Demo Agent",
    },
  });
  console.log("✅ Token Ledger: 24 token dimint untuk Demo Agent");

  console.log("\n🎉 Seeding selesai!");
  console.log("─────────────────────────────────");
  console.log("SuperAdmin email : admin@mbakasir.id");
  console.log("SuperAdmin pass  : SuperAdmin@2026!");
  console.log("Agent email      : agen.demo@mbakasir.id");
  console.log("Agent pass       : Agent@Demo2026!");
  console.log("Kasir email      : kasir@demo.id");
  console.log("Kasir pass       : Kasir@1234!");
  console.log("Kasir PIN        : 123456");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("❌ Seed gagal:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
