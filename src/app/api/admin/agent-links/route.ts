import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN" || !session.sub) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const links = await prisma.agentRegistrationLink.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        superAdmin: {
          select: { name: true, email: true }
        }
      }
    });
    return Response.json({ links });
  } catch (err) {
    return Response.json({ error: "Gagal memuat link agen" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN" || !session.sub) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const data = await req.json();
    let token = data.customSlug || "";

    if (!token) {
      token = randomBytes(8).toString("hex");
    }

    // Cek apakah custom slug ini sudah ada
    const existing = await prisma.agentRegistrationLink.findUnique({
      where: { token }
    });

    if (existing) {
      return Response.json({ error: "Slug atau custom link ini sudah dipakai, coba yang lain" }, { status: 400 });
    }

    const link = await prisma.agentRegistrationLink.create({
      data: {
        superAdminId: session.sub,
        token,
        label: data.label || null,
      },
    });

    return Response.json({ success: true, link });
  } catch (err) {
    return Response.json({ error: "Gagal membuat link agen" }, { status: 500 });
  }
}
