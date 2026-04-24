import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

const UpdateEmployeeSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  pin: z.string().length(6).regex(/^\d{6}$/).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "TENANT" || !session.tenantId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  // Pastikan employee milik tenant ini
  const existing = await prisma.user.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) {
    return Response.json({ error: "Karyawan tidak ditemukan" }, { status: 404 });
  }

  const DEMO_EMAILS = ["owner@demo.id", "kasir@demo.id"];
  if (DEMO_EMAILS.includes(existing.email)) {
    return Response.json({ error: "Akun demo tidak diperbolehkan untuk diubah pengaturannya." }, { status: 403 });
  }

  // Jangan izinkan menonaktifkan owner (TENANT role)
  if (existing.role === "TENANT" && parsed.data.isActive === false) {
    return Response.json({ error: "Tidak bisa menonaktifkan akun owner" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: parsed.data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      pin: true,
      isActive: true,
      createdAt: true,
    },
  });

  return Response.json({ employee: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "TENANT" || !session.tenantId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.user.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!existing) {
    return Response.json({ error: "Karyawan tidak ditemukan" }, { status: 404 });
  }

  if (["owner@demo.id", "kasir@demo.id"].includes(existing.email)) {
    return Response.json({ error: "Akun demo tidak diperbolehkan untuk dihapus." }, { status: 403 });
  }

  if (existing.role === "TENANT") {
    return Response.json({ error: "Tidak bisa menghapus akun owner" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  return Response.json({ success: true });
}
