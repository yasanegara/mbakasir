import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<any> }
) {
  const session = await getSession();
  if (!session || session.role !== "TENANT" || !session.tenantId) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;
  const { status, trackingNumber } = await req.json();

  const validStatuses = ["CONFIRMED", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
  if (!validStatuses.includes(status)) {
    return Response.json({ error: "Status tidak valid" }, { status: 400 });
  }

  try {
    const order = await prisma.onlineOrder.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!order) {
      return Response.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.onlineOrder.update({
      where: { id },
      data: {
        status,
        ...(trackingNumber !== undefined ? { trackingNumber } : {}),
      },
    });

    revalidatePath("/orders");

    return Response.json({ success: true, order: updated });
  } catch (err: any) {
    return Response.json({ error: "Gagal memperbarui status" }, { status: 500 });
  }
}
