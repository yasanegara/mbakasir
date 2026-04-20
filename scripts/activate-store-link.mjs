/**
 * Aktifkan atau buat store registration link dengan token tertentu.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/activate-store-link.mjs <token> [email-agen]
 *
 * Contoh:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/activate-store-link.mjs yk
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/activate-store-link.mjs yk agen.demo@mbakasir.id
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const token = process.argv[2];
  const agentEmail = process.argv[3];

  if (!token) {
    console.error("❌ Usage: activate-store-link.mjs <token> [email-agen]");
    process.exit(1);
  }

  console.log(`🔧 Mengaktifkan link "/register/store/${token}" ...`);

  // Temukan link yang sudah ada
  const existing = await prisma.storeRegistrationLink.findUnique({
    where: { token },
    include: { agent: { select: { id: true, name: true, email: true, isActive: true } } },
  });

  let agentId: string;

  if (existing) {
    console.log(`   Link ditemukan → agen: ${existing.agent.name} (${existing.agent.email})`);
    console.log(`   isActive: ${existing.isActive}, agen aktif: ${existing.agent.isActive}`);
    agentId = existing.agentId;

    // Pastikan agen aktif
    if (!existing.agent.isActive) {
      await prisma.agent.update({ where: { id: agentId }, data: { isActive: true } });
      console.log("   ✅ Agen diaktifkan");
    }

    // Aktifkan link
    await prisma.storeRegistrationLink.update({
      where: { token },
      data: { isActive: true },
    });
    console.log(`✅ Link ${token} diaktifkan`);

  } else {
    console.log(`   Link belum ada, akan dibuat baru...`);

    // Cari agen berdasarkan email (arg[3]) atau ambil agen pertama yang aktif
    let agent;
    if (agentEmail) {
      agent = await prisma.agent.findUnique({ where: { email: agentEmail } });
      if (!agent) {
        console.error(`❌ Agen dengan email "${agentEmail}" tidak ditemukan`);
        process.exit(1);
      }
    } else {
      // Pilih agen aktif pertama yang bukan pusat
      agent = await prisma.agent.findFirst({
        where: {
          isActive: true,
          email: { not: "pusat@mbakasir.local" },
        },
        orderBy: { createdAt: "asc" },
      });
    }

    if (!agent) {
      console.error("❌ Tidak ada agen aktif ditemukan. Pastikan seed sudah dijalankan.");
      process.exit(1);
    }

    agentId = agent.id;
    console.log(`   Agen dipilih: ${agent.name} (${agent.email})`);

    // Nonaktifkan link lain milik agen ini
    await prisma.storeRegistrationLink.updateMany({
      where: { agentId, isActive: true },
      data: { isActive: false },
    });

    // Buat link baru
    await prisma.storeRegistrationLink.create({
      data: {
        agentId,
        token,
        isActive: true,
        useCount: 0,
      },
    });
    console.log(`✅ Link baru dibuat: /register/store/${token}`);
  }

  // Verifikasi akhir
  const check = await prisma.storeRegistrationLink.findUnique({
    where: { token },
    include: { agent: { select: { name: true, isActive: true } } },
  });

  console.log("\n📋 Status akhir:");
  console.log(`   Token      : ${token}`);
  console.log(`   Agen       : ${check?.agent.name} (aktif: ${check?.agent.isActive})`);
  console.log(`   Link aktif : ${check?.isActive}`);
  console.log(`   URL        : http://localhost:3000/register/store/${token}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("❌ Error:", e.message);
    prisma.$disconnect();
    process.exit(1);
  });
