import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  getAgentTokenPurchaseRequestDelegate,
  prisma,
} from "@/lib/prisma";

const agentPurchaseRequestSchema = z.object({
  packageId: z.string().trim().min(1, "Paket token wajib dipilih"),
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

    const [agent, pkg] = await Promise.all([
      prisma.agent.findUnique({
        where: { id: session.agentId },
        select: { id: true },
      }),
      prisma.agentPackage.findUnique({
        where: { id: parsed.packageId },
        select: {
          id: true,
          name: true,
          tokenAmount: true,
          price: true,
          isActive: true,
        },
      }),
    ]);

    if (!agent) {
      return Response.json({ error: "Akun agen tidak ditemukan" }, { status: 404 });
    }

    if (!pkg || !pkg.isActive) {
      return Response.json({ error: "Paket token tidak tersedia" }, { status: 404 });
    }

    const request = await agentTokenRequestDelegate.create({
      data: {
        agentId: agent.id,
        packageName: pkg.name,
        tokenAmount: pkg.tokenAmount,
        totalPrice: pkg.price,
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
