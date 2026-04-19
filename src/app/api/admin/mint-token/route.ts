import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// ============================================================
// API: SUPERADMIN MINT TOKEN
// CMO & CDO: Pusat mencetak token lalu dikirim ke Agen
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPERADMIN") {
      return Response.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { agentId, amount, description } = await req.json();

    if (!agentId || !amount || amount <= 0) {
      return Response.json({ error: "Data tidak valid" }, { status: 400 });
    }

    // Eksekusi Ledger secara transaksional agar saldo konsisten (Anti-jebol)
    const result = await prisma.$transaction(async (tx) => {
      const agent = await tx.agent.findUnique({ where: { id: agentId } });
      if (!agent) throw new Error("Agen tidak ditemukan");

      const balanceBefore = agent.tokenBalance;
      const balanceAfter = balanceBefore + amount;

      // 1. Update Saldo Agen
      await tx.agent.update({
        where: { id: agentId },
        data: {
          tokenBalance: balanceAfter,
          totalMinted: { increment: amount },
        },
      });

      // 2. Tulis ke Token Ledger (Buku Besar Immutable)
      const ledger = await tx.tokenLedger.create({
        data: {
          agentId,
          superAdminId: session.sub,
          type: "MINT",
          amount: amount, // Positif
          balanceBefore,
          balanceAfter,
          description: description || "Top-up saldo lisensi",
        },
      });

      return ledger;
    });

    return Response.json({ success: true, ledger: result });

  } catch (error: any) {
    console.error("Mint Token Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
