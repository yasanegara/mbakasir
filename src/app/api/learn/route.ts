import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBrandConfig } from "@/lib/brand-config";

export async function GET() {
  try {
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
        content: true, isPublic: true, publicCtaTarget: true,
        category: true, seoKeywords: true, viewCount: true,
        totalDuration: true, bounceCount: true,
        avgScrollDepth: true, finishCount: true,
        createdAt: true, updatedAt: true,
      } as any,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    
    let defaultAgentRegistrationToken = null;
    const link = await prisma.agentRegistrationLink.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' }
    });
    if (link) {
      defaultAgentRegistrationToken = link.token;
    } else {
      const sa = await prisma.superAdmin.findFirst();
      if (sa) {
        const newLink = await prisma.agentRegistrationLink.create({
          data: {
            superAdminId: sa.id,
            token: "default-agent",
            label: "Public Article Auto Generated",
          }
        });
        defaultAgentRegistrationToken = newLink.token;
      }
    }
    
    return NextResponse.json({
      docs,
      defaultAgentRegistrationToken
    });
  } catch (error) {
    console.error("Error fetching learn docs:", error);
    return NextResponse.json({ error: "Failed to fetch docs", docs: [] }, { status: 500 });
  }
}
