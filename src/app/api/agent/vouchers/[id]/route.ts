import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "AGENT" || !session.agentId) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // @ts-expect-error: TS Language Server IDE cache does not detect newly generated agentVoucher yet
    await prisma.agentVoucher.delete({
      where: {
        id,
        agentId: session.agentId, 
      },
    });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: "Gagal menghapus voucher" }, { status: 500 });
  }
}
