import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma, getAgentTokenPurchaseRequestDelegate } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;
  const agentTokenRequestDelegate = getAgentTokenPurchaseRequestDelegate(prisma);

  if (!agentTokenRequestDelegate) {
    return Response.json({ error: "Fitur tidak tersedia" }, { status: 503 });
  }

  try {
    await agentTokenRequestDelegate.update({
      where: { id },
      data: { status: "REJECTED" }
    });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: "Gagal menolak permintaan" }, { status: 500 });
  }
}
