import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ============================================================
// API: INITIAL DOWNLOAD MASTER DATA
// Tujuan: Mengisi IndexedDB agar Kasir beroperasi 100% offline
// ============================================================

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.tenantId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.tenantId;

    // Ambil data tenant & status
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        agentId: true,
        name: true,
        status: true,
        premiumUntil: true,
        updatedAt: true,
      },
    });

    if (!tenant) throw new Error("Tenant tidak ditemukan");

    // Ambil Master Data
    const products = await prisma.product.findMany({
      where: { tenantId, isActive: true },
    });

    const rawMaterials = await prisma.rawMaterial.findMany({
      where: { tenantId },
    });

    const bomList = await prisma.billOfMaterial.findMany({
      where: { product: { tenantId } },
      select: {
        id: true,
        productId: true,
        rawMaterialId: true,
        quantity: true,
        product: {
          select: {
            localId: true,
          },
        },
        rawMaterial: {
          select: {
            localId: true,
          },
        },
      },
    });

    const posTerminals = await prisma.posTerminal.findMany({
      where: { tenantId },
    });

    const productAssignments = await prisma.productAssignment.findMany({
      where: { product: { tenantId } },
      include: {
        product: { select: { localId: true } }
      }
    });

    const formattedProducts = products.map((p: any) => ({
      id: p.id,
      localId: p.localId || p.id,
      tenantId: p.tenantId,
      sku: p.sku || "",
      name: p.name,
      category: p.category || "",
      price: Number(p.price),
      costPrice: Number(p.costPrice),
      stock: Number(p.stock),
      unit: p.unit,
      showInPos: p.showInPos,
      imageUrl: p.imageUrl || "",
      isActive: p.isActive,
      hasBoM: p.hasBoM,
      syncStatus: "SYNCED",
      updatedAt: p.updatedAt.getTime(),
    }));

    const formattedRawMaterials = rawMaterials.map((r: any) => ({
      id: r.id,
      localId: r.localId || r.id,
      tenantId: r.tenantId,
      name: r.name,
      unit: r.unit,
      stock: Number(r.stock),
      costPerUnit: Number(r.costPerUnit),
      minStock: Number(r.minStock),
      syncStatus: "SYNCED",
      updatedAt: r.updatedAt.getTime(),
    }));

    const formattedBoM = bomList.map((b: any) => ({
      id: b.id,
      productId: b.product.localId || b.productId,
      rawMaterialId: b.rawMaterial.localId || b.rawMaterialId,
      quantity: Number(b.quantity),
    }));

    const formattedTerminals = posTerminals.map((t: any) => ({
      id: t.id,
      tenantId: t.tenantId,
      name: t.name,
      code: t.code,
      isDefault: t.isDefault,
      isActive: t.isActive,
      targetRevenue: Number(t.targetRevenue)
    }));

    const formattedAssignments = productAssignments.map((a: any) => ({
      id: a.id,
      productId: a.product.localId || a.productId,
      terminalId: a.terminalId,
      stock: Number(a.stock)
    }));

    return Response.json({
      tenant: {
        id: tenant.id,
        localId: tenant.id,
        agentId: tenant.agentId,
        name: tenant.name,
        status: tenant.status,
        premiumUntil: tenant.premiumUntil ? tenant.premiumUntil.getTime() : null,
        syncStatus: "SYNCED",
        updatedAt: tenant.updatedAt.getTime(),
      },
      products: formattedProducts,
      rawMaterials: formattedRawMaterials,
      billOfMaterials: formattedBoM,
      posTerminals: formattedTerminals,
      productAssignments: formattedAssignments
    });

  } catch (error: unknown) {
    console.error("Initial Sync Error:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
