import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { newAgentId } = await req.json();

    if (!newAgentId) {
      return Response.json({ error: "ID agen baru tidak valid" }, { status: 400 });
    }

    let finalAgentId = newAgentId;

    if (newAgentId === "PUSAT") {
      let pusat = await prisma.agent.findFirst({ where: { email: "pusat@mbakasir.local" } });
      if (!pusat) {
        pusat = await prisma.agent.create({
          data: {
            name: "Pusat (SuperAdmin)",
            email: "pusat@mbakasir.local",
            passwordHash: "NO_LOGIN_ALLOWED_USE_SUPERADMIN",
            tokenBalance: 9999999,
            tokenResalePrice: 0,
            isActive: true,
          }
        });
      }
      finalAgentId = pusat.id;
    } else {
      const newAgent = await prisma.agent.findUnique({ where: { id: newAgentId } });
      if (!newAgent || !newAgent.isActive) {
        return Response.json({ error: "Agen tujuan tidak ditemukan atau tidak aktif" }, { status: 400 });
      }
    }

    await prisma.tenant.update({
      where: { id },
      data: { agentId: finalAgentId }
    });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: "Gagal memindah agen" }, { status: 500 });
  }
}
