import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const doc = await prisma.learnDocument.update({
      where: { id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, viewCount: doc.viewCount });
  } catch (error) {
    console.error("Error updating view count:", error);
    return NextResponse.json({ error: "Failed to update view count" }, { status: 500 });
  }
}
