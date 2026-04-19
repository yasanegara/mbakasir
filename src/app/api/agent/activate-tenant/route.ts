import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { addMonths } from "date-fns";

// ============================================================
// API: AGENT ACTIVATE TENANT (Pemotongan Koin Murni)
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "AGENT" || !session.agentId) {
      return Response.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { tenantId, durationMonths } = await req.json();

    if (!tenantId || !durationMonths || durationMonths <= 0) {
      return Response.json({ error: "Data tidak valid" }, { status: 400 });
    }

    // 1 Koin = 1 Bulan Lisensi
    const tokenCost = durationMonths;

    // Transaksi Database (Standar Finansial)
    const result = await prisma.$transaction(async (tx) => {
      // Validasi Agen (Saldo Cukup?)
      const agent = await tx.agent.findUnique({ where: { id: session.agentId } });
      if (!agent) throw new Error("Agen tidak ditemukan");
      if (agent.tokenBalance < tokenCost) {
        throw new Error(`Saldo tidak mencukupi. Butuh ${tokenCost} Token.`);
      }

      // Validasi Toko (Apakah milik agen ini?)
      const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) throw new Error("Toko tidak ditemukan");
      if (tenant.agentId !== session.agentId) throw new Error("Bukan toko kelolaan Anda");

      // Kalkulasi Masa Aktif Baru (Mulai hari ini jika sudah expired, atau lanjut dari expired date)
      const prevUntil = tenant.premiumUntil;
      const baseDate = (!prevUntil || prevUntil < new Date()) ? new Date() : prevUntil;
      const newUntil = addMonths(baseDate, durationMonths);

      const balanceBefore = agent.tokenBalance;
      const balanceAfter = balanceBefore - tokenCost;

      // 1. Kurangi Saldo Agen
      await tx.agent.update({
        where: { id: agent.id },
        data: {
          tokenBalance: balanceAfter,
          totalUsed: { increment: tokenCost },
        },
      });

      // 2. Tambah Lisensi Toko
      const updatedTenant = await tx.tenant.update({
        where: { id: tenant.id },
        data: {
          premiumUntil: newUntil,
          status: "ACTIVE", // Auto-buka gembok jika tadi terkunci
          tokenUsed: { increment: tokenCost },
        },
      });

      // 3. Catat di Ledger
      await tx.tokenLedger.create({
        data: {
          agentId: agent.id,
          tenantId: tenant.id,
          type: "ACTIVATE",
          amount: -tokenCost, // Negatif karena pengeluaran agen
          balanceBefore,
          balanceAfter,
          description: `Aktivasi toko via SuperToken (${durationMonths} bln)`,
          durationMonths,
          prevPremiumUntil: prevUntil,
          newPremiumUntil: newUntil,
        },
      });

      return updatedTenant;
    });

    return Response.json({ success: true, premiumUntil: result.premiumUntil });

  } catch (error: any) {
    console.error("Activate Tenant Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
