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
    const { action, isActive } = await req.json();

    if (action === "TOGGLE_STATUS") {
      await prisma.agent.update({
        where: { id },
        data: { isActive }
      });
      return Response.json({ success: true });
    }

    return Response.json({ error: "Tindakan tidak valid" }, { status: 400 });
  } catch (err) {
    return Response.json({ error: "Gagal memproses aksi agen" }, { status: 500 });
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
    // Cannot delete if there are tenants referencing this agent! 
    const tenantCount = await prisma.tenant.count({ where: { agentId: id } });
    if (tenantCount > 0) {
      return Response.json(
        { error: "Gagal menghapus: Agen masih memiliki Toko di bawah naungannya. Harap 'Pindah Agen' atau transfer Toko tersebut di menu Daftar Toko Nasional." },
        { status: 400 }
      );
    }

    await prisma.agent.delete({
      where: { id }
    });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: "Agen masih terikat data historis dan tidak bisa dihapus keras. Harap gunakan fitur Suspend." }, { status: 500 });
  }
}
