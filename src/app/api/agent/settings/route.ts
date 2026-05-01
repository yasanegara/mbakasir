import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSettingsSchema = z.object({
  tokenResalePrice: z.number().min(0),
  whatsappNumber: z.string().optional(),
  telegramChatId: z.string().optional(),
  bankDetails: z.string().optional(),
  qrisUrl: z.string().optional().nullable(),
  notificationPrefs: z.object({
    notifyNewStoreRegistration: z.boolean(),
    notifyTokenPurchase: z.boolean(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session || session.role !== "AGENT" || !session.agentId) {
    return Response.json(
      { error: "Akses ditolak. Anda bukan agen." },
      { status: 403 }
    );
  }

  if (session.email === "agen.demo@mbakasir.id") {
    return Response.json(
      { error: "Akun demo tidak diperbolehkan mengubah pengaturan ini." },
      { status: 403 }
    );
  }

  try {
    const rawData = await req.json();
    const parsed = updateSettingsSchema.safeParse(rawData);

    if (!parsed.success) {
      return Response.json(
        { error: "Data pengaturan tidak valid" },
        { status: 400 }
      );
    }

    const { tokenResalePrice, whatsappNumber, telegramChatId, bankDetails, notificationPrefs, qrisUrl } = parsed.data;

    await prisma.agent.update({
      where: {
        id: session.agentId,
      },
      data: {
        tokenResalePrice,
        whatsappNumber,
        telegramChatId,
        bankDetails,
        qrisUrl,
        notificationPrefs: notificationPrefs as any,
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Update Agent Settings Error:", error);
    return Response.json(
      { error: "Gagal menyimpan pengaturan agen" },
      { status: 500 }
    );
  }
}
