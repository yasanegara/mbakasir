import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { duration, isBounce } = await req.json();

    const updateData: any = {
      totalDuration: { increment: Math.floor(duration || 0) },
    };

    if (isBounce) {
      updateData.bounceCount = { increment: 1 };
    }

    await prisma.learnDocument.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating session analytics:", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}
