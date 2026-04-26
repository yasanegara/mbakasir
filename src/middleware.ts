import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

  // Get hostname of request (e.g. demo.vercel.pub, demo.localhost:3000)
  let hostname = req.headers
    .get("host")!
    .replace(".localhost:3000", `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000"}`);

  const searchParams = req.nextUrl.searchParams.toString();
  const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ""}`;

  // If running locally, you might want to adjust this logic depending on how you test
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

  // If the request is for a custom domain (not the root domain)
  // we rewrite to the special /_domain/[domain] route
  if (
    hostname !== "localhost:3000" &&
    hostname !== rootDomain &&
    !hostname.endsWith(`.${rootDomain}`) // if you want to support subdomains later
  ) {
    return NextResponse.rewrite(new URL(`/_domain/${hostname}${path}`, req.url));
  }

  return NextResponse.next();
}
