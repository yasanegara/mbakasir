import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Memulai proses reset POS terminal tambahan yang dibuat oleh tenant...");

  await prisma.$transaction(async (tx) => {
    // Cari semua pos terminal tambahan (isDefault: false)
    const extraPosTerminals = await tx.posTerminal.findMany({
      where: {
        isDefault: false,
      },
      include: {
        tenant: {
          include: {
            agent: true,
          },
        },
      },
    });

    console.log(`Ditemukan ${extraPosTerminals.length} POS terminal tambahan.`);

    if (extraPosTerminals.length === 0) {
      console.log("Tidak ada yang perlu di-reset.");
      return;
    }

    // Ambil TokenLedger terkait POS_ADD untuk membatalkan
    for (const pos of extraPosTerminals) {
      console.log(`Mengembalikan refund untuk POS ${pos.name} (${pos.tenant.name}) ...`);
      const tokenCost = pos.tokenCost || 1;

      // Kembalikan token ke agen
      await tx.agent.update({
        where: { id: pos.tenant.agentId },
        data: {
          tokenBalance: {
            increment: tokenCost,
          },
          totalUsed: {
            decrement: tokenCost,
          },
        },
      });

      // Kurangi tokenUsed di tenant
      await tx.tenant.update({
        where: { id: pos.tenantId },
        data: {
          tokenUsed: {
            decrement: tokenCost,
          },
        },
      });

      // Kembalikan token ledger (Hapus saja atau record ADJUST? Kita hapus POS_ADD terkait)
      await tx.tokenLedger.deleteMany({
        where: {
          tenantId: pos.tenantId,
          type: "POS_ADD",
        },
      });

      // Hapus terminal POS-nya
      await tx.posTerminal.delete({
        where: { id: pos.id },
      });
      
      console.log(`-> Refund sukses: Dikembalikan ${tokenCost} token ke Agen ${pos.tenant.agent.name}. Terminal dihapus.`);
    }
  });

  console.log("Proses reset selesai secara menyeluruh.");
}

main()
  .catch((e) => {
    console.error("Gagal melakukan reset:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
