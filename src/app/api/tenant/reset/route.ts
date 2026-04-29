import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "TENANT" || !session.tenantId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type } = await req.json();

  try {
    if (type === "transactions") {
      // Hapus data transaksi
      await prisma.$transaction([
        prisma.saleItem.deleteMany({ where: { sale: { tenantId: session.tenantId } } }),
        prisma.sale.deleteMany({ where: { tenantId: session.tenantId } }),
        prisma.shift.deleteMany({ where: { tenantId: session.tenantId } }),
        prisma.onlineOrderItem.deleteMany({ where: { order: { tenantId: session.tenantId } } }),
        prisma.onlineOrder.deleteMany({ where: { tenantId: session.tenantId } }),
      ]);
      return Response.json({ message: "Data transaksi berhasil direset" });
    } else if (type === "products") {
      // Hapus data produk dan assign produk
      await prisma.$transaction([
        prisma.billOfMaterial.deleteMany({ where: { product: { tenantId: session.tenantId } } }),
        prisma.productAssignment.deleteMany({ where: { product: { tenantId: session.tenantId } } }),
        prisma.onlineOrderItem.deleteMany({ where: { order: { tenantId: session.tenantId } } }), // Just in case
        prisma.saleItem.deleteMany({ where: { product: { tenantId: session.tenantId } } }), // Hapus sale items yg terkait produk
        prisma.product.deleteMany({ where: { tenantId: session.tenantId } }),
        prisma.rawMaterial.deleteMany({ where: { tenantId: session.tenantId } }),
      ]);
      return Response.json({ message: "Data produk berhasil direset" });
    } else if (type === "all") {
      // Hapus keduanya
      await prisma.$transaction([
        prisma.saleItem.deleteMany({ where: { sale: { tenantId: session.tenantId } } }),
        prisma.sale.deleteMany({ where: { tenantId: session.tenantId } }),
        prisma.shift.deleteMany({ where: { tenantId: session.tenantId } }),
        prisma.onlineOrderItem.deleteMany({ where: { order: { tenantId: session.tenantId } } }),
        prisma.onlineOrder.deleteMany({ where: { tenantId: session.tenantId } }),
        prisma.billOfMaterial.deleteMany({ where: { product: { tenantId: session.tenantId } } }),
        prisma.productAssignment.deleteMany({ where: { product: { tenantId: session.tenantId } } }),
        prisma.product.deleteMany({ where: { tenantId: session.tenantId } }),
        prisma.rawMaterial.deleteMany({ where: { tenantId: session.tenantId } }),
      ]);
      return Response.json({ message: "Data produk dan transaksi berhasil direset" });
    }

    return Response.json({ error: "Tipe reset tidak valid" }, { status: 400 });
  } catch (error) {
    console.error("Reset data error:", error);
    return Response.json({ error: "Gagal mereset data" }, { status: 500 });
  }
}
