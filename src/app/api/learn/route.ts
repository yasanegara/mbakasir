import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBrandConfig } from "@/lib/brand-config";

export async function GET() {
  try {
    console.log("[API Learn] Starting fetch...");
    const session = await getSession();
    const role = session?.role;
    console.log("[API Learn] Session role:", role);

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
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    console.log("[API Learn] Query success, docs count:", docs.length);
    
    let defaultAgentRegistrationToken = null;
    const activeLink = await prisma.agentRegistrationLink.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' }
    });

    if (activeLink) {
      console.log("[API Learn] Active link found:", activeLink.token);
      defaultAgentRegistrationToken = activeLink.token;
    } else {
      console.log("[API Learn] No active link, checking fallback...");
      const sa = await prisma.superAdmin.findFirst();
      if (sa) {
        const link = await prisma.agentRegistrationLink.upsert({
          where: { token: "default-agent" },
          update: { isActive: true },
          create: {
            superAdminId: sa.id,
            token: "default-agent",
            label: "Public Article Auto Generated",
            isActive: true,
          }
        });
        defaultAgentRegistrationToken = link.token;
        console.log("[API Learn] Fallback link created/updated:", link.token);
      }
    }
    
    return NextResponse.json({
      docs,
      defaultAgentRegistrationToken
    });
  } catch (error: any) {
    console.error("[API Learn] CRITICAL ERROR:", error);
    if (error.stack) console.error(error.stack);
    return NextResponse.json({ error: error.message || "Failed to fetch docs", docs: [] }, { status: 500 });
  }
}
