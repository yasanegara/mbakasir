import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramNotification } from "@/lib/notifications";

const purchaseSchema = z.object({
  amount: z.number().min(1),
  voucherCode: z.string().optional(),
  totalPrice: z.number().min(0),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "TENANT" || !session.tenantId) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const data = await req.json();
    const parsed = purchaseSchema.parse(data);

    // Dapatkan data Tenant dan Agent-nya
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      include: { agent: true }
    });

    if (!tenant) throw new Error("Tenant tidak valid");

    // Simpan history request agar Agent bisa memantau
    const newRequest = await prisma.tokenPurchaseRequest.create({
      data: {
        tenantId: session.tenantId,
        agentId: tenant.agentId,
        amount: parsed.amount,
        totalPrice: parsed.totalPrice,
        voucherCode: parsed.voucherCode || null,
        status: "PENDING"
      }
    });

    if (tenant.agent.telegramChatId) {
      const prefs = tenant.agent.notificationPrefs as any;
      const shouldNotify = !prefs || prefs.notifyTokenPurchase !== false;

      if (shouldNotify) {
        const message = `<b>💰 Pesanan Token Baru!</b>\n\n` +
          `Dari: <b>${tenant.name}</b>\n` +
          `Jumlah: ${parsed.amount} Token\n` +
          `Total: Rp ${parsed.totalPrice.toLocaleString('id-ID')}\n\n` +
          `<i>Silakan cek dashboard agen Anda untuk konfirmasi.</i>`;
        
        void sendTelegramNotification(tenant.agent.telegramChatId, message);
      }
    }

    return Response.json({ success: true, request: newRequest });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Gagal membuat notifikasi ke dashboard agen" }, { status: 500 });
  }
}
