import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureTokenConfig } from "@/lib/token-settings";
import { getTokenConversion } from "@/lib/token-settings-shared";

// ============================================================
// API: AGENT TENANTS DATA FETCH
// ============================================================

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "AGENT" || !session.agentId) {
      return Response.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const tokenConfig = await ensureTokenConfig();
    const licenseConversion = getTokenConversion(tokenConfig, "LICENSE_MONTH");

    const agent = await prisma.agent.findUnique({
      where: { id: session.agentId },
      include: {
        tenants: {
          select: {
            id: true,
            name: true,
            status: true,
            premiumUntil: true,
            posTerminals: {
              where: {
                isDefault: false,
                isActive: true
              },
              select: {
                tokenCost: true
              }
            }
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!agent) {
      return Response.json({ error: "Agen tidak ditemukan" }, { status: 404 });
    }

    const modifiedTenants = agent.tenants.map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      premiumUntil: t.premiumUntil,
      addonsCostPerMonth: t.posTerminals.reduce((sum, pos) => sum + pos.tokenCost, 0)
    }));

    return Response.json({
      balance: agent.tokenBalance,
      tenants: modifiedTenants,
      tokenConfig: {
        tokenName: tokenConfig.tokenName,
        tokenSymbol: tokenConfig.tokenSymbol,
      },
      licenseConversion,
    });
  } catch (error: unknown) {
    console.error("Agent Tenants Fetch Error:", error);
    return Response.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Internal Server Error";
}
