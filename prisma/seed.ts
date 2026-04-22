import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_AI_KNOWLEDGE_BASE } from "../src/lib/default-ai-brain";

// ============================================================
// PRISMA SEED — Data awal sistem Mbakasir
// ============================================================

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Mbakasir database...");

  // ─── Token Config Global ───────────────────────────────────
  await prisma.tokenConfig.upsert({
    where: { id: "default" },
    update: {
      tokenName: "SuperToken",
      tokenSymbol: "T.",
      pricePerToken: 6250,
      currencyCode: "IDR",
      notes: "Token pusat bisa dikonversi ke lisensi toko dan modul lain.",
    },
    create: {
      id: "default",
      tokenName: "SuperToken",
      tokenSymbol: "T.",
      pricePerToken: 6250,
      currencyCode: "IDR",
      notes: "Token pusat bisa dikonversi ke lisensi toko dan modul lain.",
    },
  });

  await prisma.tokenConversion.upsert({
    where: {
      configId_targetKey: {
        configId: "default",
        targetKey: "LICENSE_MONTH",
      },
    },
    update: {
      targetLabel: "Aktivasi 30 Hari",
      moduleKey: "CORE_POS",
      tokenCost: 1,
      rewardQuantity: 1,
      rewardUnit: "30 hari",
      description: "1 Token = 30 hari lisensi aktif toko.",
      isActive: true,
      sortOrder: 0,
    },
    create: {
      configId: "default",
      targetKey: "LICENSE_MONTH",
      targetLabel: "Aktivasi 30 Hari",
      moduleKey: "CORE_POS",
      tokenCost: 1,
      rewardQuantity: 1,
      rewardUnit: "30 hari",
      description: "1 Token = 30 hari lisensi aktif toko.",
      isActive: true,
      sortOrder: 0,
    },
  });
  console.log("✅ Token Config: SuperToken + LICENSE_MONTH");

  await prisma.tokenConversion.upsert({
    where: {
      configId_targetKey: {
        configId: "default",
        targetKey: "POS_SLOT",
      },
    },
    update: {
      targetLabel: "Terminal POS Tambahan",
      moduleKey: "CORE_POS",
      tokenCost: 1,
      rewardQuantity: 1,
      rewardUnit: "terminal POS",
      description: "Aturan default untuk tambahan terminal POS di luar POS utama.",
      isActive: true,
      sortOrder: 1,
    },
    create: {
      configId: "default",
      targetKey: "POS_SLOT",
      targetLabel: "Terminal POS Tambahan",
      moduleKey: "CORE_POS",
      tokenCost: 1,
      rewardQuantity: 1,
      rewardUnit: "terminal POS",
      description: "Aturan default untuk tambahan terminal POS di luar POS utama.",
      isActive: true,
      sortOrder: 1,
    },
  });
  console.log("✅ Token Config: POS_SLOT");

  const existingBrandConfig = await prisma.brandConfig.findUnique({
    where: { id: "default" },
    select: { aiKnowledgeBase: true },
  });

  await prisma.brandConfig.upsert({
    where: { id: "default" },
    update: {
      aiKnowledgeBase:
        existingBrandConfig?.aiKnowledgeBase?.trim() || DEFAULT_AI_KNOWLEDGE_BASE,
    },
    create: {
      id: "default",
      aiKnowledgeBase: DEFAULT_AI_KNOWLEDGE_BASE,
    },
  });
  console.log("✅ Brand Config: AI BRAIN default terpasang");

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

  await prisma.posTerminal.upsert({
    where: {
      tenantId_code: {
        tenantId: demoTenant.id,
        code: "POS-001",
      },
    },
    update: {
      name: "POS Utama",
      isDefault: true,
      isActive: true,
      tokenCost: 0,
    },
    create: {
      tenantId: demoTenant.id,
      name: "POS Utama",
      code: "POS-001",
      isDefault: true,
      isActive: true,
      tokenCost: 0,
    },
  });
  console.log("✅ Demo POS: POS Utama");

  // ─── Demo Tenant Owner ─────────────────────────────────────
  const tenantOwnerPassword = await bcrypt.hash("Owner@Demo2026!", 12);
  await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: demoTenant.id, email: "owner@demo.id" },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: "Sari Pemilik",
      email: "owner@demo.id",
      passwordHash: tenantOwnerPassword,
      role: "TENANT",
      isActive: true,
    },
  });
  console.log("✅ Demo Tenant Owner: owner@demo.id");

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

  // ─── Demo Raw Materials (untuk BoM) ───────────────────────
  const rawMaterials = [
    { id: "demo-raw-tea", name: "Teh Hitam", unit: "gr", stock: 2500, costPerUnit: 45, minStock: 250 },
    { id: "demo-raw-sugar", name: "Gula Pasir", unit: "gr", stock: 5000, costPerUnit: 18, minStock: 500 },
    { id: "demo-raw-ice", name: "Es Batu", unit: "gr", stock: 12000, costPerUnit: 2, minStock: 2000 },
    { id: "demo-raw-avocado", name: "Alpukat", unit: "gr", stock: 4000, costPerUnit: 32, minStock: 600 },
    { id: "demo-raw-condensed-milk", name: "Susu Kental Manis", unit: "ml", stock: 2500, costPerUnit: 28, minStock: 300 },
  ];

  const seededRawMaterials = new Map<string, { id: string; localId: string | null }>();

  for (const material of rawMaterials) {
    const record = await prisma.rawMaterial.upsert({
      where: { id: material.id },
      update: {
        tenantId: demoTenant.id,
        name: material.name,
        unit: material.unit,
        stock: material.stock,
        costPerUnit: material.costPerUnit,
        minStock: material.minStock,
        localId: material.id,
        syncStatus: "SYNCED",
      },
      create: {
        id: material.id,
        tenantId: demoTenant.id,
        name: material.name,
        unit: material.unit,
        stock: material.stock,
        costPerUnit: material.costPerUnit,
        minStock: material.minStock,
        localId: material.id,
        syncStatus: "SYNCED",
      },
    });

    seededRawMaterials.set(material.id, {
      id: record.id,
      localId: record.localId,
    });
  }
  console.log(`✅ ${rawMaterials.length} Demo Raw Materials created`);

  // ─── Demo Products ─────────────────────────────────────────
  const products = [
    { sku: "ES-001", name: "Es Teh Manis", category: "Minuman", price: 5000, costPrice: 1500, stock: 999, hasBoM: true },
    { sku: "NS-001", name: "Nasi Goreng Spesial", category: "Makanan", price: 25000, costPrice: 10000, stock: 50, hasBoM: false },
    { sku: "AY-001", name: "Ayam Bakar", category: "Makanan", price: 35000, costPrice: 15000, stock: 30, hasBoM: false },
    { sku: "JU-001", name: "Jus Alpukat", category: "Minuman", price: 18000, costPrice: 7000, stock: 999, hasBoM: true },
    { sku: "RO-001", name: "Roti Bakar Coklat", category: "Snack", price: 12000, costPrice: 4000, stock: 100, hasBoM: false },
  ];

  const seededProducts = new Map<string, { id: string; localId: string | null }>();

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { tenantId_sku: { tenantId: demoTenant.id, sku: p.sku } },
      update: {
        name: p.name,
        category: p.category,
        price: p.price,
        costPrice: p.costPrice,
        stock: p.stock,
        unit: p.category === "Makanan" || p.category === "Snack" ? "porsi" : "gelas",
        isActive: true,
        hasBoM: p.hasBoM,
        syncStatus: "SYNCED",
      },
      create: {
        tenantId: demoTenant.id,
        ...p,
        unit: p.category === "Makanan" || p.category === "Snack" ? "porsi" : "gelas",
        isActive: true,
        syncStatus: "SYNCED",
      },
    });

    seededProducts.set(p.sku, {
      id: product.id,
      localId: product.localId,
    });
  }
  console.log(`✅ ${products.length} Demo Products created`);

  // ─── Demo BoM Recipes ──────────────────────────────────────
  const bomRecipes = [
    { sku: "ES-001", rawMaterialId: "demo-raw-tea", quantity: 8 },
    { sku: "ES-001", rawMaterialId: "demo-raw-sugar", quantity: 18 },
    { sku: "ES-001", rawMaterialId: "demo-raw-ice", quantity: 150 },
    { sku: "JU-001", rawMaterialId: "demo-raw-avocado", quantity: 140 },
    { sku: "JU-001", rawMaterialId: "demo-raw-condensed-milk", quantity: 35 },
    { sku: "JU-001", rawMaterialId: "demo-raw-sugar", quantity: 12 },
    { sku: "JU-001", rawMaterialId: "demo-raw-ice", quantity: 120 },
  ];

  for (const recipe of bomRecipes) {
    const product = seededProducts.get(recipe.sku);
    const rawMaterial = seededRawMaterials.get(recipe.rawMaterialId);

    if (!product || !rawMaterial) continue;

    await prisma.billOfMaterial.upsert({
      where: {
        productId_rawMaterialId: {
          productId: product.id,
          rawMaterialId: rawMaterial.id,
        },
      },
      update: {
        quantity: recipe.quantity,
      },
      create: {
        productId: product.id,
        rawMaterialId: rawMaterial.id,
        quantity: recipe.quantity,
      },
    });
  }
  console.log(`✅ ${bomRecipes.length} Demo BoM rows created`);

  // ─── Token Ledger record untuk demo ────────────────────────
  const existingInitialMint = await prisma.tokenLedger.findFirst({
    where: {
      agentId: demoAgent.id,
      tenantId: demoTenant.id,
      type: "MINT",
      description: "Initial token mint untuk Demo Agent",
    },
  });

  if (!existingInitialMint) {
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
  }
  console.log("✅ Token Ledger: 24 token dimint untuk Demo Agent");

  console.log("\n🎉 Seeding selesai!");
  console.log("─────────────────────────────────");
  console.log("SuperAdmin email : admin@mbakasir.id");
  console.log("SuperAdmin pass  : SuperAdmin@2026!");
  console.log("Agent email      : agen.demo@mbakasir.id");
  console.log("Agent pass       : Agent@Demo2026!");
  console.log("Owner email      : owner@demo.id");
  console.log("Owner pass       : Owner@Demo2026!");
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
