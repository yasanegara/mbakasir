import { randomBytes } from "node:crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildStoreRegistrationPath,
  buildStoreTrackingPath,
  getStoreLinkKindFromQuery,
} from "@/lib/store-registration-shared";

function normalizePixelUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function serializeLink(link: {
  id: string;
  token: string;
  defaultLinkType: string;
  pixelUrl: string | null;
  clickCount: number;
  lastClickedAt: Date | null;
  useCount: number;
  createdAt: Date;
  lastUsedAt: Date | null;
}) {
  return {
    id: link.id,
    token: link.token,
    path: buildStoreRegistrationPath(link.token),
    directPath: buildStoreTrackingPath(link.token, "DIRECT"),
    landingPath: buildStoreTrackingPath(link.token, "LANDING"),
    defaultLinkType: getStoreLinkKindFromQuery(link.defaultLinkType),
    pixelUrl: link.pixelUrl,
    clickCount: link.clickCount,
    lastClickedAt: link.lastClickedAt?.toISOString() ?? null,
    useCount: link.useCount,
    createdAt: link.createdAt.toISOString(),
    lastUsedAt: link.lastUsedAt?.toISOString() ?? null,
  };
}

async function requireAgentSession() {
  const session = await getSession();

  if (!session || session.role !== "AGENT" || !session.agentId) {
    return null;
  }

  return {
    ...session,
    agentId: session.agentId,
  };
}

export async function GET() {
  const session = await requireAgentSession();
  if (!session) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const link = await prisma.storeRegistrationLink.findFirst({
    where: {
      agentId: session.agentId,
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      token: true,
      defaultLinkType: true,
      pixelUrl: true,
      clickCount: true,
      lastClickedAt: true,
      useCount: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });

  return Response.json({
    link: link ? serializeLink(link) : null,
  });
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await requireAgentSession();
  if (!session) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    let slug = null;
    let defaultLinkType = "DIRECT";
    let pixelUrl: string | null = null;
    try {
      const body = await req.json();
      if (body?.slug && typeof body.slug === "string") {
        slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9\-]/g, "-");
      }
      defaultLinkType = getStoreLinkKindFromQuery(body?.linkType);
      pixelUrl = normalizePixelUrl(body?.pixelUrl);

      if (body?.pixelUrl && typeof body.pixelUrl === "string" && !pixelUrl) {
        return Response.json(
          { error: "URL pixel tidak valid. Gunakan format http:// atau https://." },
          { status: 400 }
        );
      }
    } catch {
      // Body empty or not JSON, ignore
    }

    if (slug) {
      const existing = await prisma.storeRegistrationLink.findUnique({
        where: { token: slug }
      });
      if (existing) {
        return Response.json({ error: "Slug sudah digunakan, silakan pilih yang lain." }, { status: 400 });
      }
    }

    const link = await prisma.$transaction(async (tx) => {
      await tx.storeRegistrationLink.updateMany({
        where: {
          agentId: session.agentId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      return tx.storeRegistrationLink.create({
        data: {
          agentId: session.agentId,
          token: slug || randomBytes(12).toString("hex"),
          defaultLinkType,
          pixelUrl,
        },
        select: {
          id: true,
          token: true,
          defaultLinkType: true,
          pixelUrl: true,
          clickCount: true,
          lastClickedAt: true,
          useCount: true,
          createdAt: true,
          lastUsedAt: true,
        },
      });
    });

    return Response.json({
      success: true,
      link: serializeLink(link),
    });
  } catch (error) {
    console.error("Create Store Registration Link Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
