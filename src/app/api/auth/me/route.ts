import { getSession } from "@/lib/auth";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  
  if (!session) {
    return Response.json({ user: null }, { status: 401 });
  }

  let extraData: any = {};
  
  if (session.tenantId) {
    const tenant = (await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: {
        tokenBalance: true,
        modules: {
          where: { activeUntil: { gt: new Date() } },
          select: { moduleKey: true, activeUntil: true }
        }
      } as any
    })) as any;
    
    if (tenant) {
      extraData.tokenBalance = tenant.tokenBalance;
      const activeModulesMap: Record<string, string> = {};
      tenant.modules.forEach((m: { moduleKey: string, activeUntil: Date }) => {
        activeModulesMap[m.moduleKey] = m.activeUntil.toISOString();
      });
      extraData.activeModules = activeModulesMap;
    }
  }

  if (session.role === "CASHIER" && session.sub) {
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { pin: true }
    });
    extraData.pin = user?.pin || undefined;
  }

  return Response.json({ user: { ...session, ...extraData } });
}
