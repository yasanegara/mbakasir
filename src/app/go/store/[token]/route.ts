import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  STORE_AFFILIATE_COOKIE,
  STORE_AFFILIATE_COOKIE_MAX_AGE,
  buildStoreRegistrationPath,
  getStoreLinkKindFromQuery,
  isStoreRegistrationToken,
  normalizeStoreRegistrationToken,
} from "@/lib/store-registration-shared";

function triggerPixel(
  pixelUrl: string | null,
  context: { token: string; kind: string; destination: string }
) {
  if (!pixelUrl) return;

  try {
    const url = new URL(pixelUrl);
    url.searchParams.set("event", "store_link_click");
    url.searchParams.set("token", context.token);
    url.searchParams.set("kind", context.kind.toLowerCase());
    url.searchParams.set("destination", context.destination);
    url.searchParams.set("ts", Date.now().toString());

    // Fire-and-forget beacon ping
    void fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      headers: {
        "user-agent": "MbaKasir-LinkTracker/1.0",
      },
    }).catch(() => {});
  } catch {
    // Ignore malformed pixel URL to avoid breaking redirect path
  }
}

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: rawToken } = await params;
  const token = normalizeStoreRegistrationToken(rawToken);

  if (!isStoreRegistrationToken(token)) {
    const errorUrl = req.nextUrl.clone();
    errorUrl.pathname = "/";
    errorUrl.search = "";
    return NextResponse.redirect(errorUrl);
  }

  const link = await prisma.storeRegistrationLink.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      isActive: true,
      defaultLinkType: true,
      pixelUrl: true,
      agent: { select: { isActive: true } },
    },
  });

  if (!link || !link.isActive || !link.agent.isActive) {
    const fallbackUrl = req.nextUrl.clone();
    fallbackUrl.pathname = buildStoreRegistrationPath(token);
    fallbackUrl.search = "";
    return NextResponse.redirect(fallbackUrl);
  }

  const requestedKindParam = req.nextUrl.searchParams.get("kind");
  const requestedKind = requestedKindParam
    ? getStoreLinkKindFromQuery(requestedKindParam)
    : null;
  const fallbackKind = getStoreLinkKindFromQuery(link.defaultLinkType);
  const resolvedKind = requestedKind ?? fallbackKind;
  const destinationPath =
    resolvedKind === "LANDING"
      ? `/?aff=${encodeURIComponent(token)}`
      : buildStoreRegistrationPath(token);

  await prisma.storeRegistrationLink.update({
    where: { id: link.id },
    data: {
      clickCount: { increment: 1 },
      lastClickedAt: new Date(),
    },
  });

  triggerPixel(link.pixelUrl, {
    token,
    kind: resolvedKind,
    destination: resolvedKind === "LANDING" ? "landing" : "register",
  });

  const redirectUrl = req.nextUrl.clone();
  if (resolvedKind === "LANDING") {
    redirectUrl.pathname = "/";
    redirectUrl.searchParams.set("aff", token);
  } else {
    redirectUrl.pathname = buildStoreRegistrationPath(token);
    redirectUrl.search = ""; // Clear existing search params for direct register
  }

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set(STORE_AFFILIATE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STORE_AFFILIATE_COOKIE_MAX_AGE,
  });
  return response;
}
