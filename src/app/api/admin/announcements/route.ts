import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { title, content, type, targetRole, isActive, expiresAt } = body;
  if (!title || !content) {
    return NextResponse.json({ error: "title dan content wajib" }, { status: 400 });
  }
  const item = await prisma.announcement.create({
    data: {
      title,
      content,
      type: type || "info",
      targetRole: targetRole || "ALL",
      isActive: isActive ?? true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
