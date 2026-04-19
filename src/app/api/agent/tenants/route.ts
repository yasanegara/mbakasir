import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// ============================================================
// API: AGENT TENANTS DATA FETCH
// ============================================================

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "AGENT" || !session.agentId) {
      return Response.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: session.agentId },
      include: {
        tenants: {
          select: {
            id: true,
            name: true,
            status: true,
            premiumUntil: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!agent) {
      return Response.json({ error: "Agen tidak ditemukan" }, { status: 404 });
    }

    return Response.json({
      balance: agent.tokenBalance,
      tenants: agent.tenants,
    });
  } catch (error: any) {
    console.error("Agent Tenants Fetch Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
