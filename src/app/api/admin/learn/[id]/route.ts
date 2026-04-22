import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const doc = await prisma.learnDocument.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.excerpt !== undefined && { excerpt: body.excerpt }),
      ...(body.emoji !== undefined && { emoji: body.emoji }),
      ...(body.targetRole !== undefined && { targetRole: body.targetRole }),
      ...(body.isPublished !== undefined && { isPublished: body.isPublished }),
      ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.slug !== undefined && { slug: body.slug }),
      version: { increment: 1 },
    },
  });
  return NextResponse.json(doc);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.learnDocument.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
