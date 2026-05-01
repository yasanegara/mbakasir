import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  getAgentTokenPurchaseRequestDelegate,
  prisma,
} from "@/lib/prisma";
import { ensureTokenConfig } from "@/lib/token-settings";

import { createTripayTransaction } from "@/lib/tripay";

const agentPurchaseRequestSchema = z.object({
  packageId: z.string().optional(),
  amount: z.number().optional(),
  method: z.string().default(process.env.TRIPAY_DEFAULT_METHOD || "QRIS"), 
}).refine(data => data.packageId || data.amount, {
  message: "Paket token atau jumlah token wajib diisi",
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "AGENT" || !session.agentId) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const agentTokenRequestDelegate = getAgentTokenPurchaseRequestDelegate(prisma);

    if (!agentTokenRequestDelegate) {
      return Response.json(
        {
          error:
            "Fitur antrean pembelian pusat belum siap di sesi server ini. Restart `npm run dev` sekali lalu coba lagi.",
        },
        { status: 503 }
      );
    }

    const data = await req.json();
    const parsed = agentPurchaseRequestSchema.parse(data);

    const [agent, pkg, tokenConfig] = await Promise.all([
      prisma.agent.findUnique({
        where: { id: session.agentId },
        select: { id: true, name: true, email: true, phone: true },
      }),
      parsed.packageId 
        ? prisma.agentPackage.findUnique({
            where: { id: parsed.packageId },
            select: {
              id: true,
              name: true,
              tokenAmount: true,
              price: true,
              isActive: true,
            },
          })
        : Promise.resolve(null),
      ensureTokenConfig(),
    ]);

    if (!agent) {
      return Response.json({ error: "Akun agen tidak ditemukan" }, { status: 404 });
    }

    // CEK APAKAH ADA PERMINTAAN YANG MASIH PENDING
    const pendingRequest = await agentTokenRequestDelegate.findFirst({
      where: {
        agentId: agent.id,
        status: "PENDING",
      },
    });

    if (pendingRequest) {
      return Response.json(
        { 
          error: "Anda masih memiliki permintaan pembelian yang belum diproses atau dibatalkan. Mohon tunggu atau batalkan permintaan sebelumnya terlebih dahulu." 
        }, 
        { status: 400 }
      );
    }

    let packageName = "";
    let tokenAmount = 0;
    let totalPrice = 0;

    if (parsed.packageId) {
      if (!pkg || !pkg.isActive) {
        return Response.json({ error: "Paket token tidak tersedia" }, { status: 404 });
      }
      packageName = pkg.name;
      tokenAmount = pkg.tokenAmount;
      totalPrice = Number(pkg.price);
    } else if (parsed.amount) {
      if (parsed.amount <= 0) {
        return Response.json({ error: "Jumlah token tidak valid" }, { status: 400 });
      }
      packageName = "Custom Amount";
      tokenAmount = parsed.amount;
      totalPrice = parsed.amount * Number(tokenConfig.pricePerToken);
    }

    // 1. Buat record permintaan di DB dulu
    const request = await agentTokenRequestDelegate.create({
      data: {
        agentId: agent.id,
        packageName,
        tokenAmount,
        totalPrice,
        paymentMethod: parsed.method,
      },
      select: {
        id: true,
        packageName: true,
        tokenAmount: true,
        totalPrice: true,
        createdAt: true,
      },
    });

    // 2. Jika API Tripay dikonfigurasi, buat transaksi di Tripay
    let tripayData = null;
    if (process.env.TRIPAY_API_KEY && process.env.TRIPAY_PRIVATE_KEY) {
      try {
        tripayData = await createTripayTransaction({
          method: parsed.method,
          merchantRef: request.id,
          amount: totalPrice,
          customerName: agent.name,
          customerEmail: agent.email,
          customerPhone: agent.phone || "",
          orderItems: [
            {
              name: `Topup ${tokenAmount} ${tokenConfig.tokenSymbol}`,
              price: totalPrice,
              quantity: 1,
            },
          ],
        });
        
        // Simpan paymentRef dari Tripay ke record kita
        await agentTokenRequestDelegate.update({
          where: { id: request.id },
          data: { paymentRef: tripayData.reference }
        });
      } catch (tripayErr) {
        console.error("Failed to create Tripay transaction:", tripayErr);
        // Tetap lanjut, biarkan manual jika Tripay gagal
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/admin/tokens");

    return Response.json({ 
      success: true, 
      request,
      payment: tripayData // Berisi QRIS atau instruksi pembayaran
    });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Gagal mengirim permintaan pembelian ke dashboard pusat" },
      { status: 500 }
    );
  }
}
