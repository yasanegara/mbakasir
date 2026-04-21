import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.role;
  const now = new Date();

  const items = await prisma.announcement.findMany({
    where: {
      isActive: true,
      OR: [{ targetRole: "ALL" }, { targetRole: role }],
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}
