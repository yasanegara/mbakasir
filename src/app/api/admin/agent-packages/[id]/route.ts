import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    // @ts-expect-error
    await prisma.agentPackage.delete({
      where: { id },
    });
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: "Gagal menghapus paket. Mungkin sedang dipakai." }, { status: 500 });
  }
}

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
    const data = await req.json();
    
    // Construct dynamic update object
    const updateData: any = {};
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.tokenAmount !== undefined) updateData.tokenAmount = Number(data.tokenAmount);
    if (data.price !== undefined) updateData.price = Number(data.price);
    if (data.description !== undefined) updateData.description = data.description;

    // @ts-expect-error Pisma dynamically updates allowed fields
    const updated = await prisma.agentPackage.update({
      where: { id },
      data: updateData
    });
    return Response.json({ success: true, package: updated });
  } catch (err) {
    return Response.json({ error: "Gagal mengupdate paket" }, { status: 500 });
  }
}
