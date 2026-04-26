import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    let where: any = {};

    if (session.role === "AGENT" && session.agentId) {
      where = { agentId: session.agentId };
    } else if (session.role === "TENANT" && session.tenantId) {
      where = { tenantId: session.tenantId };
    } else if (session.role === "SUPERADMIN") {
      // Superadmin can see everything or filter by agentId
      const targetAgentId = searchParams.get("agentId");
      if (targetAgentId) {
        where = { agentId: targetAgentId };
      }
    } else {
      return Response.json({ error: "Role tidak memiliki akses ledger" }, { status: 403 });
    }

    const ledger = await prisma.tokenLedger.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        tenant: { select: { name: true } },
        agent: { select: { name: true } }
      }
    });

    return Response.json({ ledger });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
