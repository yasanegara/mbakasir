import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "TENANT" || !session.tenantId) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return Response.json({ error: "Kode voucher tidak valid" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { agentId: true },
    });

    if (!tenant) return Response.json({ error: "Tenant tidak ditemukan" }, { status: 404 });

    const voucher = await prisma.agentVoucher.findUnique({
      where: {
        agentId_code: {
          agentId: tenant.agentId,
          code: code.trim().toUpperCase(),
        },
      },
    });

    if (!voucher || !voucher.isActive) {
      return Response.json({ error: "Voucher tidak ditemukan atau tidak aktif" }, { status: 404 });
    }

    return Response.json({ discountValue: Number(voucher.discountValue) });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Gagal mengecek voucher" }, { status: 500 });
  }
}
