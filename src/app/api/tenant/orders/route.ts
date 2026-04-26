import { getSession } from "@/lib/auth";
import { prisma, getOnlineOrderDelegate } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// GET: daftar semua pesanan online
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "TENANT" || !session.tenantId) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const orders = await getOnlineOrderDelegate(prisma).findMany({
    where: {
      tenantId: session.tenantId,
      ...(status && status !== "ALL" ? { status: status as any } : {}),
    },
    include: {
      items: { select: { productName: true, quantity: true, price: true, subtotal: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ orders });
}
