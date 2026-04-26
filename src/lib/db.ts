import Dexie, { type EntityTable } from "dexie";

// ============================================================
// MBAKASIR — DEXIE.JS (IndexedDB) LOCAL-FIRST DATABASE
// CDO × CTO: Mirror struktur PostgreSQL untuk keperluan offline
//
// STRATEGY:
//  - Frontend HANYA baca/tulis ke Dexie
//  - Background sync worker mendorong data ke PostgreSQL
//  - localId (UUID) = primary key IndexedDB = foreign key mapping ke server
// ============================================================

// ─── TIPE DATA ───────────────────────────────────────────────

export interface LocalTenant {
  id: string; // Server ID (setelah sync) atau localId
  localId: string; // UUID lokal, selalu ada
  agentId: string;
  name: string;
  businessType?: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  status: "ACTIVE" | "LOCKED" | "SUSPENDED" | "DORMANT";
  premiumUntil?: number; // Unix timestamp (ms)
  syncStatus: "PENDING" | "SYNCED" | "CONFLICT";
  updatedAt: number;
}

export interface LocalPosTerminal {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  isDefault: boolean;
  isActive: boolean;
  targetRevenue: number;
}

export interface LocalUser {
  id: string;
  localId: string;
  tenantId: string;
  name: string;
  email: string;
  role: "SUPERADMIN" | "AGENT" | "TENANT" | "CASHIER";
  pin?: string;
  isActive: boolean;
  syncStatus: "PENDING" | "SYNCED" | "CONFLICT";
  updatedAt: number;
}

export interface LocalProduct {
  id: string;
  localId: string;
  tenantId: string;
  sku?: string;
  name: string;
  category?: string;
  price: number; // dalam Rupiah (integer)
  costPrice: number;
  stock: number;
  unit: string;
  imageUrl?: string;
  isActive: boolean;
  showInPos: boolean;
  hasBoM: boolean;
  syncStatus: "PENDING" | "SYNCED" | "CONFLICT";
  updatedAt: number;
}

export interface LocalProductAssignment {
  id: string;
  productId: string; // localId product
  terminalId: string; // id terminal (karena terminal ID server-side/cuid)
  stock: number;
}

export interface LocalRawMaterial {
  id: string;
  localId: string;
  tenantId: string;
  name: string;
  unit: string;
  stock: number;
  costPerUnit: number;
  minStock: number;
  syncStatus: "PENDING" | "SYNCED" | "CONFLICT";
  updatedAt: number;
}

export interface LocalBillOfMaterial {
  id: string;
  productId: string;
  rawMaterialId: string;
  quantity: number;
}

export interface LocalSaleItem {
  id: string;
  localId: string;
  saleLocalId: string; // Relasi ke LocalSale
  productId: string;
  productName: string; // Snapshot nama produk saat transaksi
  price: number;
  costPrice: number;
  quantity: number;
  discount: number;
  subtotal: number;
}

export interface LocalSale {
  id?: string; // Server ID — kosong sebelum sync
  localId: string; // UUID lokal — primary key di IndexedDB
  tenantId: string;
  userId: string;
  shiftLocalId?: string;
  terminalId?: string; // ID terminal pengirim transaksi
  invoiceNo: string;
  status: "PENDING" | "COMPLETED" | "VOIDED";
  paymentMethod: "CASH" | "TRANSFER" | "QRIS" | "CREDIT";
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  notes?: string;
  customerName?: string;
  customerWa?: string;
  voidReason?: string;
  syncStatus: "PENDING" | "SYNCED" | "CONFLICT";
  createdAt: number; // Unix timestamp (ms)
  updatedAt: number;
}

export interface LocalShift {
  id?: string;
  localId: string;
  tenantId: string;
  userId: string;
  openingCash: number;
  closingCash?: number;
  totalSales: number;
  totalVoid: number;
  startedAt: number;
  closedAt?: number;
  notes?: string;
  syncStatus: "PENDING" | "SYNCED" | "CONFLICT";
}

export interface LocalSyncQueue {
  id?: number; // Auto-increment
  table: string; // Nama tabel: 'sales', 'products', dll
  localId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  payload: string; // JSON string dari data yang akan di-sync
  retries: number;
  lastError?: string;
  createdAt: number;
}

export interface LocalStoreProfile {
  id: string;              // Selalu "default" — satu record per tenant
  tenantId: string;
  storeName: string;
  address?: string;
  phone?: string;
  qrisImageUrl?: string;   // URL gambar QRIS statis (base64 atau URL)
  footerNote?: string;     // Keterangan footer struk
  // Template pesan WhatsApp (bisa diedit manual)
  waReceiptTemplate?: string; // Template struk via WA
  waOrderTemplate?: string;   // Template order/pesanan via WA
  isCrmEnabled: boolean;
  updatedAt: number;
}

export interface LocalShoppingItem {
  id: string;           // UUID lokal sebagai primary key
  tenantId: string;
  type: "product" | "rawMaterial"; // Jenis item
  status: "pending" | "done";      // Status belanja
  // Data pokok
  name: string;
  sku?: string;         // Untuk produk  
  category?: string;    // Untuk produk
  unit: string;
  // Jumlah target beli
  qtyToBuy: number;
  price?: number;       // Harga jual (produk)
  costPrice?: number;   // HPP / harga beli
  costPerUnit?: number; // Bahan baku
  minStock?: number;    // Threshold bahan baku
  notes?: string;
  // Relasi ke record yang sudah ada (jika restock item lama)
  existingLocalId?: string;
  isNew: boolean;       // true = belum ada di sistem, false = restock item lama
  completedAt?: number; // Kapan ditandai selesai
  createdAt: number;
  updatedAt: number;
}

// ─── DEXIE DATABASE CLASS ─────────────────────────────────────

export class MbakasirDatabase extends Dexie {
  tenants!: EntityTable<LocalTenant, "localId">;
  users!: EntityTable<LocalUser, "localId">;
  products!: EntityTable<LocalProduct, "localId">;
  rawMaterials!: EntityTable<LocalRawMaterial, "localId">;
  billOfMaterials!: EntityTable<LocalBillOfMaterial, "id">;
  sales!: EntityTable<LocalSale, "localId">;
  saleItems!: EntityTable<LocalSaleItem, "localId">;
  shifts!: EntityTable<LocalShift, "localId">;
  syncQueue!: EntityTable<LocalSyncQueue, "id">;
  shoppingList!: EntityTable<LocalShoppingItem, "id">;
  storeProfile!: EntityTable<LocalStoreProfile, "id">;
  productAssignments!: EntityTable<LocalProductAssignment, "id">;
  posTerminals!: EntityTable<LocalPosTerminal, "id">;

  constructor() {
    super("MbakasirDB");

    this.version(1).stores({
      // Format: primaryKey, *index, [compoundIndex]
      tenants: "localId, id, agentId, status, syncStatus, updatedAt",
      users: "localId, id, tenantId, role, isActive, syncStatus",
      products:
        "localId, id, tenantId, sku, category, isActive, hasBoM, syncStatus, updatedAt",
      rawMaterials: "localId, id, tenantId, syncStatus, updatedAt",
      billOfMaterials: "id, productId, rawMaterialId",
      sales:
        "localId, id, tenantId, userId, shiftLocalId, status, paymentMethod, syncStatus, createdAt",
      saleItems: "localId, saleLocalId, productId",
      shifts: "localId, id, tenantId, userId, syncStatus, startedAt",
      syncQueue: "++id, table, localId, action, retries, createdAt",
    });

    this.version(2).stores({
      shoppingList: "id, tenantId, type, status, isNew, createdAt, updatedAt",
    });

    this.version(3).stores({
      storeProfile: "id, tenantId, updatedAt",
    });

    this.version(4).stores({
      productAssignments: "id, productId, terminalId",
      posTerminals: "id, tenantId, code, isActive",
    });

    this.version(5).stores({
      sales: "localId, id, tenantId, userId, shiftLocalId, terminalId, status, paymentMethod, syncStatus, createdAt, [tenantId+status]",
      productAssignments: "id, productId, terminalId, stock",
    });
  }
}

// ─── SINGLETON ───────────────────────────────────────────────

const globalForDexie = globalThis as unknown as {
  mbakasirDb: MbakasirDatabase | undefined;
};

// Hanya inisialisasi di sisi client (browser)
export function getDb(): MbakasirDatabase {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB hanya bisa diakses di sisi browser (client).");
  }
  if (!globalForDexie.mbakasirDb) {
    globalForDexie.mbakasirDb = new MbakasirDatabase();
  }
  return globalForDexie.mbakasirDb;
}

// ─── HELPER: Tambahkan operasi ke Sync Queue ─────────────────

export async function enqueueSyncOp(
  table: string,
  localId: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  payload: object
): Promise<void> {
  const db = getDb();
  await db.syncQueue.add({
    table,
    localId,
    action,
    payload: JSON.stringify(payload),
    retries: 0,
    createdAt: Date.now(),
  });
}

// ─── HELPER: Cek apakah Toko sedang LOCKED ───────────────────

export async function isTenantLocked(tenantId: string): Promise<boolean> {
  const db = getDb();
  const tenant = await db.tenants
    .where("localId")
    .equals(tenantId)
    .or("id")
    .equals(tenantId)
    .first();

  if (!tenant) return true;
  if (tenant.status === "LOCKED" || tenant.status === "SUSPENDED") return true;
  if (!tenant.premiumUntil) return true;

  return Date.now() > tenant.premiumUntil;
}
