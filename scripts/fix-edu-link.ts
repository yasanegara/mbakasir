import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Memperbaiki infrastruktur Edu...");

  // 1. Pastikan Agen Demo ada
  const agent = await prisma.agent.upsert({
    where: { email: "agen.demo@mbakasir.id" },
    update: { isActive: true },
    create: {
      id: "demo-agent-edu",
      email: "agen.demo@mbakasir.id",
      name: "Demo Agen Edukasi",
      isActive: true,
      passwordHash: "demo-hash-not-used",
    },
  });

  // 2. Buat Link Registrasi 'edu' yang REAL di database
  await prisma.storeRegistrationLink.upsert({
    where: { token: "edu" },
    update: { isActive: true, agentId: agent.id },
    create: {
      token: "edu",
      agentId: agent.id,
      isActive: true,
    },
  });

  console.log("✅ Link pendaftaran 'edu' sekarang sudah AKTIF di database.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
