import { getSession } from "@/lib/auth";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  
  if (!session) {
    return Response.json({ user: null }, { status: 401 });
  }

  let pin = undefined;
  if (session.role === "CASHIER" && session.sub) {
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { pin: true }
    });
    pin = user?.pin || undefined;
  }

  return Response.json({ user: { ...session, pin } });
}
