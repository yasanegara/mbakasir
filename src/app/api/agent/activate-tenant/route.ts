import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureTokenConfig } from "@/lib/token-settings";
import {
  calculateTokenCostForQuantity,
  getTokenConversion,
} from "@/lib/token-settings-shared";
import { NextRequest } from "next/server";
import { addDays } from "date-fns";
import { sendActivationNotification } from "@/lib/notifications";

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

    const tokenConfig = await ensureTokenConfig();
    const licenseConversion = getTokenConversion(tokenConfig, "LICENSE_MONTH");

    if (!licenseConversion) {
      return Response.json(
        { error: "Rule konversi LICENSE_MONTH belum aktif di pengaturan pusat" },
        { status: 500 }
      );
    }

    // Compute base token cost for purely the license
    const baseLicenseCost = calculateTokenCostForQuantity(licenseConversion, durationMonths);

    // Transaksi Database (Standar Finansial)
    const result = await prisma.$transaction(async (tx) => {
      // Validasi Agen (Saldo Cukup?)
      const agent = await tx.agent.findUnique({ where: { id: session.agentId } });
      if (!agent) throw new Error("Agen tidak ditemukan");

      // Validasi Toko (Apakah milik agen ini?)
      const tenant = await tx.tenant.findUnique({ 
        where: { id: tenantId },
        include: { 
          users: { take: 1, orderBy: { createdAt: "asc" } },
          posTerminals: { where: { isDefault: false, isActive: true } }
        }
      });
      if (!tenant) throw new Error("Toko tidak ditemukan");
      if (tenant.agentId !== session.agentId) throw new Error("Bukan toko kelolaan Anda");

      const tenantEmail = tenant.users.length > 0 ? tenant.users[0].email : "";

      // Hitung Total Pemotongan: Base + Addons
      const addonsCostPerMonth = tenant.posTerminals.reduce((sum, pos) => sum + pos.tokenCost, 0);
      const addonsTotalCost = addonsCostPerMonth * durationMonths;
      const totalTokenCost = baseLicenseCost + addonsTotalCost;

      if (agent.tokenBalance < totalTokenCost) {
        throw new Error(`Saldo tidak mencukupi. Butuh ${totalTokenCost} Token.`);
      }

      // Kalkulasi Masa Aktif Baru (Mulai hari ini jika sudah expired, atau lanjut dari expired date)
      const prevUntil = tenant.premiumUntil;
      const baseDate = (!prevUntil || prevUntil < new Date()) ? new Date() : prevUntil;
      const newUntil = addDays(baseDate, durationMonths * 30);

      const balanceBefore = agent.tokenBalance;
      const balanceAfter = balanceBefore - totalTokenCost;

      // 1. Kurangi Saldo Agen
      await tx.agent.update({
        where: { id: agent.id },
        data: {
          tokenBalance: balanceAfter,
          totalUsed: { increment: totalTokenCost },
        },
      });

      // 2. Tambah Lisensi Toko
      const updatedTenant = await tx.tenant.update({
        where: { id: tenant.id },
        data: {
          premiumUntil: newUntil,
          status: "ACTIVE", // Auto-buka gembok jika tadi terkunci
          tokenUsed: { increment: totalTokenCost },
        },
      });

      // 3. Catat di Ledger
      const addonNotes = addonsCostPerMonth > 0 ? ` + ${addonsCostPerMonth} token/bln untuk ${tenant.posTerminals.length} add-on` : "";
      
      await tx.tokenLedger.create({
        data: {
          agentId: agent.id,
          tenantId: tenant.id,
          type: "ACTIVATE",
          amount: -totalTokenCost, // Negatif karena pengeluaran agen
          balanceBefore,
          balanceAfter,
          description: `Aktivasi toko via ${tokenConfig.tokenName} (${durationMonths} ${licenseConversion.rewardUnit}${addonNotes})`,
          conversionTargetKey: licenseConversion.targetKey,
          conversionLabel: licenseConversion.targetLabel,
          conversionQuantity: durationMonths,
          conversionUnit: licenseConversion.rewardUnit,
          durationMonths,
          prevPremiumUntil: prevUntil,
          newPremiumUntil: newUntil,
        },
      });

      return {
        updatedTenant,
        agentName: agent.name,
        tenantName: tenant.name,
        tenantPhone: tenant.phone,
        tenantEmail,
      };
    });

    // 4. Kirim Notifikasi via WA / Email secara asinkron (tidak memblokir UI)
    sendActivationNotification({
      tenantName: result.tenantName,
      tenantEmail: result.tenantEmail,
      tenantPhone: result.tenantPhone,
      agentName: result.agentName,
      durationMonths,
      newPremiumUntil: result.updatedTenant.premiumUntil!,
    }).catch(err => {
      console.error("[Notification Worker] Gagal mengirim:", err);
    });

    return Response.json({ success: true, premiumUntil: result.updatedTenant.premiumUntil });

  } catch (error: unknown) {
    console.error("Activate Tenant Error:", error);
    return Response.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Internal Server Error";
}
