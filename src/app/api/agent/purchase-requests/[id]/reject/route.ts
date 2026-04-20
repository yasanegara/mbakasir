import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "AGENT" || !session.agentId) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.tokenPurchaseRequest.update({
      where: {
        id,
        agentId: session.agentId, 
      },
      data: {
        status: "REJECTED"
      }
    });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: "Gagal menolak pesanan" }, { status: 500 });
  }
}
