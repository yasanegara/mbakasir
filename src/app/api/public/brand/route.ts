import { getBrandConfig } from "@/lib/brand-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const brand = await getBrandConfig();
  return Response.json({ brand });
}
