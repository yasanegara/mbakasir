import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCAL_ROOT_DOMAIN = "localhost:3000";
const DEFAULT_PRODUCTION_ROOT_DOMAIN = "mbakasir.id";

function resolveRootDomain() {
  const explicitRootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  if (explicitRootDomain) {
    return explicitRootDomain;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      const host = new URL(appUrl).host;
      if (host && host !== LOCAL_ROOT_DOMAIN) {
        return host;
      }
    } catch {
      // Ignore invalid URLs and fall through to the environment default.
    }
  }

  return process.env.NODE_ENV === "production"
    ? DEFAULT_PRODUCTION_ROOT_DOMAIN
    : LOCAL_ROOT_DOMAIN;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|uploads).*)",
  ],
};

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const rootDomain = resolveRootDomain();

  // Get hostname of request (e.g. demo.vercel.pub, demo.localhost:3000)
  const hostname = req.headers
    .get("host")!
    .replace(`.${LOCAL_ROOT_DOMAIN}`, `.${rootDomain}`);

  const searchParams = req.nextUrl.searchParams.toString();
  const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ""}`;

  // DETEKSI EDU PATH
  if (url.pathname.startsWith("/edu")) {
    const newPath = url.pathname.replace("/edu", "") || "/";
    const response = NextResponse.rewrite(new URL(`${newPath}${searchParams.length > 0 ? `?${searchParams}` : ""}`, req.url));
    response.headers.set("x-brand-context", "edu");
    return response;
  }

  return NextResponse.next();
}
