import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBrandConfig } from "@/lib/brand-config";
import { ensureTokenConfig } from "@/lib/token-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "AGENT") {
      return Response.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const [packages, brand, tokenConfig] = await Promise.all([
      prisma.agentPackage.findMany({
        where: { isActive: true },
        orderBy: { price: "asc" },
      }),
      getBrandConfig(),
      ensureTokenConfig(),
    ]);

    return Response.json({ 
      packages,
      tokenPrice: tokenConfig.pricePerToken,
      pusatPhone: brand.supportPhone,
      pusatName: brand.appName,
      pusatBank: brand.bankDetails
    });
  } catch (err) {
    return Response.json({ error: "Gagal memuat paket agen" }, { status: 500 });
  }
}
