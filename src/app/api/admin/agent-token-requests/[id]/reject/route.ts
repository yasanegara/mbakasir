import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
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
    // Gunakan prisma secara langsung jika tersedia
    const delegate = (prisma as any).agentTokenPurchaseRequest || agentTokenRequestDelegate;
    
    if (!delegate) {
      throw new Error("Model AgentTokenPurchaseRequest tidak ditemukan");
    }

    await delegate.update({
      where: { id },
      data: { status: "CANCELLED" }
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin/tokens");

    return Response.json({ success: true });
  } catch (err: any) {
    console.error("Reject Agent Request Error:", err);
    return Response.json({ error: "Gagal menolak permintaan: " + err.message }, { status: 500 });
  }
}
