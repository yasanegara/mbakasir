import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";

// ============================================================
// SYNC BATCH API — /api/sync/batch
// CTO: Endpoint idempoten untuk batch upsert dari IndexedDB
//
// POST body: { batches: { [table]: SyncQueueItem[] } }
// Response: SyncResult[]
// ============================================================

interface SyncQueueItem {
  id?: number;
  table: string;
  localId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  payload: string; // JSON string
  retries: number;
}

interface SyncResult {
  localId: string;
  success: boolean;
  serverId?: string;
  error?: string;
}

export async function POST(req: NextRequest): Promise<Response> {
  // Auth check
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { batches: Record<string, SyncQueueItem[]> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const results: SyncResult[] = [];

  for (const [table, items] of Object.entries(body.batches)) {
    for (const item of items) {
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(item.payload);
      } catch {
        results.push({
          localId: item.localId,
          success: false,
          error: "Invalid payload JSON",
        });
        continue;
      }

      try {
        const result = await processSyncItem(
          table,
          item.action,
          item.localId,
          payload,
          session.tenantId
        );
        results.push(result);
      } catch (err) {
        results.push({
          localId: item.localId,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  }

  return Response.json(results);
}

// ─── Router per tabel ─────────────────────────────────────────

async function processSyncItem(
  table: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  localId: string,
  payload: Record<string, unknown>,
  tenantId?: string
): Promise<SyncResult> {
  switch (table) {
    case "sales":
      return upsertSale(localId, payload, tenantId);
    case "products":
      return upsertProduct(localId, payload, tenantId);
    case "rawMaterials":
      return upsertRawMaterial(localId, payload, tenantId);
    case "billOfMaterials":
      return upsertBillOfMaterial(localId, payload, tenantId);
    case "shifts":
      return upsertShift(localId, payload, tenantId);
    case "productAssignments":
      return upsertProductAssignment(localId, payload, tenantId);
    case "storeProfile":
      return upsertStoreProfile(localId, payload, tenantId);
    default:
      return { localId, success: false, error: `Unknown table: ${table}` };
  }
}

// ─── SALES UPSERT (Idempoten via localId) ────────────────────

async function upsertSale(
  localId: string,
  payload: Record<string, unknown>,
  tenantId?: string
): Promise<SyncResult> {
  const sale = await prisma.sale.upsert({
    where: { localId },
    create: {
      localId,
      tenantId: (payload.tenantId as string) || tenantId!,
      userId: payload.userId as string,
      shiftId: payload.shiftId as string | undefined,
      invoiceNo: payload.invoiceNo as string,
      status: (payload.status as "PENDING" | "COMPLETED" | "VOIDED") || "COMPLETED",
      paymentMethod: (payload.paymentMethod as "CASH" | "TRANSFER" | "QRIS" | "CREDIT") || "CASH",
      subtotal: payload.subtotal as number,
      discountAmount: (payload.discountAmount as number) || 0,
      taxAmount: (payload.taxAmount as number) || 0,
      totalAmount: payload.totalAmount as number,
      paidAmount: payload.paidAmount as number,
      changeAmount: (payload.changeAmount as number) || 0,
      notes: payload.notes as string | undefined,
      terminalId: payload.terminalId as string | undefined,
      syncStatus: "SYNCED",
      items: {
        create: ((payload.items as Record<string, unknown>[]) || []).map(
          (item) => ({
            localId: item.localId as string,
            productId: item.productId as string,
            productName: item.productName as string,
            price: item.price as number,
            costPrice: (item.costPrice as number) || 0,
            quantity: item.quantity as number,
            discount: (item.discount as number) || 0,
            subtotal: item.subtotal as number,
          })
        ),
      },
    },
    update: {
      status: payload.status as "PENDING" | "COMPLETED" | "VOIDED",
      voidReason: payload.voidReason as string | undefined,
      voidedAt: payload.voidedAt ? new Date(payload.voidedAt as string) : undefined,
      syncStatus: "SYNCED",
    },
  });

  return { localId, success: true, serverId: sale.id };
}

// ─── PRODUCT UPSERT ───────────────────────────────────────────

async function upsertProduct(
  localId: string,
  payload: Record<string, unknown>,
  tenantId?: string
): Promise<SyncResult> {
  const product = await prisma.product.upsert({
    where: { localId } as { localId: string },
    create: {
      localId,
      tenantId: (payload.tenantId as string) || tenantId!,
      sku: payload.sku as string | undefined,
      name: payload.name as string,
      category: payload.category as string | undefined,
      price: payload.price as number,
      costPrice: (payload.costPrice as number) || 0,
      stock: (payload.stock as number) || 0,
      unit: (payload.unit as string) || "pcs",
      imageUrl: (payload.imageUrl as string) || undefined,
      isActive: (payload.isActive as boolean) ?? true,
      showInPos: (payload.showInPos as boolean) ?? true,
      hasBoM: (payload.hasBoM as boolean) || false,
      syncStatus: "SYNCED",
    },
    update: {
      sku: payload.sku as string | undefined,
      name: payload.name as string,
      category: payload.category as string | undefined,
      price: payload.price as number,
      costPrice: payload.costPrice as number,
      stock: payload.stock as number,
      unit: (payload.unit as string) || "pcs",
      imageUrl: (payload.imageUrl as string) || undefined,
      isActive: payload.isActive as boolean,
      showInPos: (payload.showInPos as boolean) ?? true,
      hasBoM: (payload.hasBoM as boolean) || false,
      syncStatus: "SYNCED",
    },
  });

  return { localId, success: true, serverId: product.id };
}

// ─── RAW MATERIAL UPSERT ─────────────────────────────────────

async function upsertRawMaterial(
  localId: string,
  payload: Record<string, unknown>,
  tenantId?: string
): Promise<SyncResult> {
  const material = await prisma.rawMaterial.upsert({
    where: { localId } as { localId: string },
    create: {
      localId,
      tenantId: (payload.tenantId as string) || tenantId!,
      name: payload.name as string,
      unit: (payload.unit as string) || "gr",
      stock: (payload.stock as number) || 0,
      costPerUnit: (payload.costPerUnit as number) || 0,
      minStock: (payload.minStock as number) || 0,
      syncStatus: "SYNCED",
    },
    update: {
      name: payload.name as string,
      unit: (payload.unit as string) || "gr",
      stock: payload.stock as number,
      costPerUnit: payload.costPerUnit as number,
      minStock: payload.minStock as number,
      syncStatus: "SYNCED",
    },
  });

  return { localId, success: true, serverId: material.id };
}

// ─── BILL OF MATERIAL UPSERT ─────────────────────────────────

async function upsertBillOfMaterial(
  localId: string,
  payload: Record<string, unknown>,
  tenantId?: string
): Promise<SyncResult> {
  if (!tenantId) {
    return { localId, success: false, error: "Tenant context missing" };
  }

  const quantity = Number(payload.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { localId, success: false, error: "Quantity BoM harus lebih dari 0" };
  }

  const [product, material] = await Promise.all([
    prisma.product.findFirst({
      where: {
        tenantId,
        OR: [
          { id: payload.productId as string },
          { localId: payload.productId as string },
        ],
      },
      select: { id: true },
    }),
    prisma.rawMaterial.findFirst({
      where: {
        tenantId,
        OR: [
          { id: payload.rawMaterialId as string },
          { localId: payload.rawMaterialId as string },
        ],
      },
      select: { id: true },
    }),
  ]);

  if (!product) {
    return { localId, success: false, error: "Produk BoM tidak ditemukan" };
  }

  if (!material) {
    return { localId, success: false, error: "Bahan baku BoM tidak ditemukan" };
  }

  const bom = await prisma.billOfMaterial.upsert({
    where: {
      productId_rawMaterialId: {
        productId: product.id,
        rawMaterialId: material.id,
      },
    },
    create: {
      productId: product.id,
      rawMaterialId: material.id,
      quantity,
    },
    update: {
      quantity,
    },
  });

  return { localId, success: true, serverId: bom.id };
}

// ─── SHIFT UPSERT ────────────────────────────────────────────

async function upsertShift(
  localId: string,
  payload: Record<string, unknown>,
  tenantId?: string
): Promise<SyncResult> {
  const shift = await prisma.shift.upsert({
    where: { localId } as { localId: string },
    create: {
      localId,
      tenantId: (payload.tenantId as string) || tenantId!,
      userId: payload.userId as string,
      openingCash: payload.openingCash as number,
      closingCash: payload.closingCash as number | undefined,
      totalSales: (payload.totalSales as number) || 0,
      totalVoid: (payload.totalVoid as number) || 0,
      startedAt: new Date(payload.startedAt as string),
      closedAt: payload.closedAt ? new Date(payload.closedAt as string) : undefined,
      notes: payload.notes as string | undefined,
      syncStatus: "SYNCED",
    },
    update: {
      closingCash: payload.closingCash as number,
      totalSales: payload.totalSales as number,
      totalVoid: payload.totalVoid as number,
      closedAt: payload.closedAt ? new Date(payload.closedAt as string) : undefined,
      syncStatus: "SYNCED",
    },
  });

  return { localId, success: true, serverId: shift.id };
}

// ─── PRODUCT ASSIGNMENT UPSERT ───────────────────────────────

async function upsertProductAssignment(
  localId: string,
  payload: Record<string, unknown>,
  tenantId?: string
): Promise<SyncResult> {
  if (!tenantId) {
    return { localId, success: false, error: "Tenant context missing" };
  }

  const [product, terminal] = await Promise.all([
    prisma.product.findFirst({
      where: {
        tenantId,
        OR: [
          { id: payload.productId as string },
          { localId: payload.productId as string },
        ],
      },
      select: { id: true },
    }),
    prisma.posTerminal.findFirst({
      where: { id: payload.terminalId as string, tenantId },
      select: { id: true },
    }),
  ]);

  if (!product) {
    return { localId, success: false, error: "Produk assignment tidak ditemukan" };
  }

  if (!terminal) {
    return { localId, success: false, error: "Terminal assignment tidak ditemukan" };
  }

  const assignment = await prisma.productAssignment.upsert({
    where: {
      productId_terminalId: {
        productId: product.id,
        terminalId: terminal.id,
      },
    },
    create: {
      productId: product.id,
      terminalId: terminal.id,
      stock: (payload.stock as number) || 0,
    },
    update: {
      stock: (payload.stock as number) || 0,
    },
  });

  return { localId, success: true, serverId: assignment.id };
}

// ─── STORE PROFILE UPSERT ────────────────────────────────────

async function upsertStoreProfile(
  localId: string,
  payload: Record<string, unknown>,
  tenantId?: string
): Promise<SyncResult> {
  const targetTenantId = (payload.tenantId as string) || tenantId;
  if (!targetTenantId) {
    return { localId, success: false, error: "Tenant context missing" };
  }

  await prisma.tenant.update({
    where: { id: targetTenantId },
    data: {
      name: payload.storeName as string | undefined,
      logoUrl: payload.logoUrl as string | undefined,
      address: payload.address as string | undefined,
      phone: payload.phone as string | undefined,
    },
  });

  return { localId, success: true };
}
