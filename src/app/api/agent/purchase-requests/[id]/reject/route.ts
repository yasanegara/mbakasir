import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
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
        status: "CANCELLED"
      }
    });
    
    revalidatePath("/dashboard");
    revalidatePath("/agent/transaksi");

    return Response.json({ success: true });
  } catch (err: any) {
    console.error("Reject Tenant Request Error:", err);
    return Response.json({ error: "Gagal menolak pesanan: " + err.message }, { status: 500 });
  }
}
