import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "node:crypto";

function requireSuperAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  return session?.role === "SUPERADMIN";
}

// GET — list semua store registration links
export async function GET() {
  const session = await getSession();
  if (!requireSuperAdmin(session)) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const links = await prisma.storeRegistrationLink.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      agent: { select: { id: true, name: true, email: true, isActive: true } },
    },
  });

  return Response.json({ links });
}

export const dynamic = "force-dynamic";

// POST — buat/aktifkan link dengan token custom
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireSuperAdmin(session)) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const { token, agentId, action } = await req.json();

    // action: "activate" — aktifkan link yang sudah ada
    if (action === "activate" && token) {
      const link = await prisma.storeRegistrationLink.findUnique({ where: { token } });
      if (!link) return Response.json({ error: "Token tidak ditemukan" }, { status: 404 });

      await prisma.storeRegistrationLink.update({
        where: { token },
        data: { isActive: true },
      });
      // Pastikan agennya aktif juga
      await prisma.agent.update({ where: { id: link.agentId }, data: { isActive: true } });
      return Response.json({ success: true, message: `Link "${token}" diaktifkan` });
    }

    // action: "deactivate"
    if (action === "deactivate" && token) {
      await prisma.storeRegistrationLink.update({
        where: { token },
        data: { isActive: false },
      });
      return Response.json({ success: true });
    }

    // Default: buat link baru
    if (!agentId) return Response.json({ error: "agentId wajib" }, { status: 400 });

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) return Response.json({ error: "Agen tidak ditemukan" }, { status: 404 });

    const slug = token?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") || randomBytes(8).toString("hex");

    // Cek duplikat
    const existing = await prisma.storeRegistrationLink.findUnique({ where: { token: slug } });
    if (existing) {
      // Kalau sudah ada, aktifkan saja
      const updated = await prisma.storeRegistrationLink.update({
        where: { token: slug },
        data: { agentId, isActive: true },
        include: { agent: { select: { name: true, email: true, isActive: true } } },
      });
      return Response.json({ success: true, link: updated, message: "Link sudah ada, diaktifkan ulang" });
    }

    const newLink = await prisma.storeRegistrationLink.create({
      data: { agentId, token: slug, isActive: true, useCount: 0 },
      include: { agent: { select: { name: true, email: true, isActive: true } } },
    });

    return Response.json({ success: true, link: newLink });
  } catch (err) {
    console.error("Admin Store Link Error:", err);
    return Response.json({ error: "Gagal memproses permintaan" }, { status: 500 });
  }
}
