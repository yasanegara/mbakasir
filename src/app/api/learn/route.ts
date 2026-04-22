import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  const role = session?.role;

  const docs = await prisma.learnDocument.findMany({
    where: {
      isPublished: true,
      OR: [
        { isPublic: true },
        ...(role ? [
          { targetRole: "ALL" },
          { targetRole: role },
        ] : []),
      ],
    },
    select: {
      id: true, title: true, slug: true, excerpt: true,
      emoji: true, targetRole: true, sortOrder: true,
      content: true, isPublic: true, createdAt: true, updatedAt: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(docs);
}
