import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { action, status } = await req.json();

    if (action === "CHANGE_STATUS") {
      await prisma.tenant.update({
        where: { id },
        data: { status }
      });
      return Response.json({ success: true });
    }

    return Response.json({ error: "Tindakan tidak valid" }, { status: 400 });
  } catch (err) {
    return Response.json({ error: "Gagal memproses aksi toko" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Dengan onDelete: Cascade, data relasi akan ikut terhapus
    await prisma.tenant.delete({
      where: { id }
    });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: "Gagal menghapus toko." }, { status: 500 });
  }
}
