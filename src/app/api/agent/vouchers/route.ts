import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const voucherSchema = z.object({
  code: z.string().trim().min(3).max(20).toUpperCase(),
  discountValue: z.number().min(0),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "AGENT" || !session.agentId) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    // @ts-expect-error: TS Language Server IDE cache does not detect newly generated agentVoucher yet
    const vouchers = await prisma.agentVoucher.findMany({
      where: { agentId: session.agentId },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ vouchers });
  } catch (err) {
    return Response.json({ error: "Gagal mengambil voucher" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "AGENT" || !session.agentId) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const data = await req.json();
    const parsed = voucherSchema.parse(data);

    // @ts-expect-error: TS Language Server IDE cache does not detect newly generated agentVoucher yet
    const voucher = await prisma.agentVoucher.create({
      data: {
        agentId: session.agentId,
        code: parsed.code,
        discountValue: parsed.discountValue,
        isActive: true,
      },
    });

    return Response.json({ success: true, voucher });
  } catch (err) {
    return Response.json({ error: "Kode voucher mungkin sudah ada" }, { status: 400 });
  }
}
