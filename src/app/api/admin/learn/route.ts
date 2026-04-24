import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function slug(title: string) {
  const s = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return s ? `mba-${s}`.slice(0, 80) : "mba-article";
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const docs = await prisma.learnDocument.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(docs);
  } catch (err) {
    console.error("GET /api/admin/learn Error:", err);
    return NextResponse.json({ error: "Internal Server Error", details: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { title, content, excerpt, emoji, targetRole, isPublished, sortOrder, isPublic, publicCtaTarget } = body;
  if (!title || !content) {
    return NextResponse.json({ error: "title dan content wajib diisi" }, { status: 400 });
  }

  // Generate unique slug
  let baseSlug = slug(title);
  let finalSlug = baseSlug;
  let i = 1;
  while (await prisma.learnDocument.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${baseSlug}-${i++}`;
  }

  const doc = await prisma.learnDocument.create({
    data: {
      title,
      slug: finalSlug,
      content,
      excerpt: excerpt || null,
      emoji: emoji || "📄",
      targetRole: targetRole || "AGENT",
      isPublished: isPublished ?? false,
      isPublic: isPublic ?? false,
      publicCtaTarget: publicCtaTarget || "STORE",
      sortOrder: sortOrder ?? 0,
    },
  });
  return NextResponse.json(doc, { status: 201 });
}
