import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.tenantId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: {
        id: true,
        status: true,
        premiumUntil: true,
        updatedAt: true,
      },
    });

    if (!tenant) {
      return Response.json({ error: "Tenant not found" }, { status: 404 });
    }

    return Response.json({
      id: tenant.id,
      status: tenant.status,
      premiumUntil: tenant.premiumUntil ? tenant.premiumUntil.getTime() : null,
      updatedAt: tenant.updatedAt.getTime(),
    });
  } catch (error) {
    console.error("Fetch Tenant Status Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
