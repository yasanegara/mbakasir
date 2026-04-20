import { randomBytes } from "node:crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildStoreRegistrationPath } from "@/lib/store-registration-shared";

function serializeLink(link: {
  id: string;
  token: string;
  useCount: number;
  createdAt: Date;
  lastUsedAt: Date | null;
}) {
  return {
    id: link.id,
    token: link.token,
    path: buildStoreRegistrationPath(link.token),
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
    try {
      const body = await req.json();
      if (body?.slug && typeof body.slug === "string") {
        slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9\-]/g, "-");
      }
    } catch (e) {
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
        },
        select: {
          id: true,
          token: true,
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
