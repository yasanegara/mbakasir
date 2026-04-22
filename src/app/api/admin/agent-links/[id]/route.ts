import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN" || !session.sub) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const link = await prisma.agentRegistrationLink.update({
      where: { id },
      data: {
        label: body.label,
        isActive: body.isActive,
      },
    });

    return Response.json({ success: true, link });
  } catch (error) {
    return Response.json({ error: "Gagal memperbarui tautan" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN" || !session.sub) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const { id } = await params;
    
    // Kita gunakan soft-delete atau hard-delete
    // Periksa apakah sudah dipakai agen
    const existing = await prisma.agentRegistrationLink.findUnique({
      where: { id },
      include: {
        _count: {
          select: { agents: true }
        }
      }
    });

    if (!existing) {
      return Response.json({ error: "Tautan tidak ditemukan" }, { status: 404 });
    }

    if (existing._count.agents > 0) {
      // Jika sudah dipakai agen, maka kita hanya set isActive = false
      await prisma.agentRegistrationLink.update({
        where: { id },
        data: { isActive: false }
      });
      return Response.json({ success: true, message: "Tautan disembunyikan karena sudah dihubungkan ke agen (Soft Delete)." });
    } else {
      // Jika belum dipakai agen sama sekali, kita bisa hard delete
      await prisma.agentRegistrationLink.delete({
        where: { id }
      });
      return Response.json({ success: true, message: "Tautan berhasil dihapus permanen." });
    }
  } catch (error) {
    return Response.json({ error: "Gagal menghapus tautan" }, { status: 500 });
  }
}
