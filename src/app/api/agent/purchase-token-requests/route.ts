import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  getAgentTokenPurchaseRequestDelegate,
  prisma,
} from "@/lib/prisma";
import { ensureTokenConfig } from "@/lib/token-settings";

const agentPurchaseRequestSchema = z.object({
  packageId: z.string().optional(),
  amount: z.number().optional(),
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
        select: { id: true },
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

    const request = await agentTokenRequestDelegate.create({
      data: {
        agentId: agent.id,
        packageName,
        tokenAmount,
        totalPrice,
      },
      select: {
        id: true,
        packageName: true,
        tokenAmount: true,
        totalPrice: true,
        createdAt: true,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin/tokens");

    return Response.json({ success: true, request });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Gagal mengirim permintaan pembelian ke dashboard pusat" },
      { status: 500 }
    );
  }
}
