"use client";

import { useState, useMemo, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb, LocalShoppingItem, enqueueSyncOp } from "@/lib/db";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatRupiahFull, generateUUID } from "@/lib/utils";
import { useAuth, useToast } from "@/contexts/AppProviders";

// ────────────────────────────────────────────────────────────────
// AUTO-SKU GENERATOR
// ────────────────────────────────────────────────────────────────
function generateSku(name: string, category?: string): string {
  const prefix = (category?.slice(0, 3) || name.slice(0, 3)).toUpperCase().replace(/\s/g, "");
  const suffix = name.replace(/\s/g, "").toUpperCase().slice(0, 4);
  const num = String(Date.now()).slice(-4);
  return `${prefix}-${suffix}${num}`;
}

// ────────────────────────────────────────────────────────────────
// MODAL TAMBAH ITEM BARU
// ────────────────────────────────────────────────────────────────
type ToastFn = (msg: string, type?: "success" | "error" | "warning" | "info") => void;

interface AddItemModalProps {
  tenantId: string;
  onClose: () => void;
  toast: ToastFn;
}

function AddItemModal({ tenantId, onClose, toast }: AddItemModalProps) {
  const [type, setType] = useState<"product" | "rawMaterial">("product");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [qtyToBuy, setQtyToBuy] = useState(1);
  const [price, setPrice] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [costPerUnit, setCostPerUnit] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [notes, setNotes] = useState("");
  const [autoSku, setAutoSku] = useState(true);

  // Auto-generate SKU saat nama/kategori berubah
  const handleNameChange = (val: string) => {
    setName(val);
    if (autoSku && val.trim()) {
      setSku(generateSku(val, category));
    }
  };

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    if (autoSku && name.trim()) {
      setSku(generateSku(name, val));
    }
  };

  const isValid = name.trim().length > 0 && unit.trim().length > 0 && qtyToBuy > 0;

  const handleSave = async () => {
    if (!isValid) return;
    const db = getDb();
    const now = Date.now();
    const item: LocalShoppingItem = {
      id: generateUUID(),
      tenantId,
      type,
      status: "pending",
      name: name.trim(),
      sku: type === "product" ? (sku || generateSku(name, category)) : undefined,
      category: type === "product" ? category : undefined,
      unit,
      qtyToBuy,
      price: type === "product" ? price : undefined,
      costPrice: type === "product" ? costPrice : undefined,
      costPerUnit: type === "rawMaterial" ? costPerUnit : undefined,
      minStock: type === "rawMaterial" ? minStock : undefined,
      notes,
      isNew: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.shoppingList.add(item);
    toast(`✅ ${name} ditambahkan ke daftar belanja`, "success");
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div className="card" style={{ width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 700 }}>➕ Tambah Item ke Daftar Belanja</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>

        {/* Type toggle */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "20px" }}>
          <button
            className={`btn btn-sm ${type === "product" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => { setType("product"); setUnit("pcs"); }}
          >
            🛍️ Produk Jadi
          </button>
          <button
            className={`btn btn-sm ${type === "rawMaterial" ? "btn-accent" : "btn-ghost"}`}
            onClick={() => { setType("rawMaterial"); setUnit("gr"); }}
          >
            🧪 Bahan Baku
          </button>
        </div>

        <div style={{ display: "grid", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, marginBottom: "6px", display: "block" }}>
              Nama {type === "product" ? "Produk" : "Bahan Baku"} *
            </label>
            <input className="input-field" value={name} onChange={e => handleNameChange(e.target.value)} placeholder="Contoh: Kopi Arabica" />
          </div>

          {type === "product" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, marginBottom: "6px", display: "block" }}>
                    SKU
                    <span
                      style={{ marginLeft: "8px", fontSize: "11px", cursor: "pointer", color: "hsl(var(--primary))" }}
                      onClick={() => { setAutoSku(!autoSku); if (!autoSku && name) setSku(generateSku(name, category)); }}
                    >
                      {autoSku ? "🔄 Auto" : "✏️ Manual"}
                    </span>
                  </label>
                  <input className="input-field" value={sku} onChange={e => { setAutoSku(false); setSku(e.target.value); }} placeholder="Auto-generate" />
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, marginBottom: "6px", display: "block" }}>Kategori</label>
                  <input className="input-field" value={category} onChange={e => handleCategoryChange(e.target.value)} placeholder="Minuman, Makanan, dll" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, marginBottom: "6px", display: "block" }}>HPP / Harga Beli</label>
                  <input className="input-field" type="number" value={costPrice || ""} onChange={e => setCostPrice(Number(e.target.value))} placeholder="0" />
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, marginBottom: "6px", display: "block" }}>Harga Jual</label>
                  <input className="input-field" type="number" value={price || ""} onChange={e => setPrice(Number(e.target.value))} placeholder="0" />
                </div>
              </div>
            </>
          )}

          {type === "rawMaterial" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, marginBottom: "6px", display: "block" }}>Harga per Satuan</label>
                <input className="input-field" type="number" value={costPerUnit || ""} onChange={e => setCostPerUnit(Number(e.target.value))} placeholder="0" />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, marginBottom: "6px", display: "block" }}>Batas Minimum Stok</label>
                <input className="input-field" type="number" value={minStock || ""} onChange={e => setMinStock(Number(e.target.value))} placeholder="0" />
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, marginBottom: "6px", display: "block" }}>Satuan *</label>
              <input className="input-field" value={unit} onChange={e => setUnit(e.target.value)} placeholder="pcs / kg / gr / ltr" />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, marginBottom: "6px", display: "block" }}>Qty Target Beli *</label>
              <input className="input-field" type="number" value={qtyToBuy} min={1} onChange={e => setQtyToBuy(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, marginBottom: "6px", display: "block" }}>Catatan (Opsional)</label>
            <input className="input-field" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Merk tertentu, toko langganan, dll" />
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Batal</button>
          <button className={`btn ${type === "product" ? "btn-primary" : "btn-accent"}`} style={{ flex: 2 }} disabled={!isValid} onClick={handleSave}>
            ✅ Tambahkan
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// KOMPONEN ROW ITEM
// ────────────────────────────────────────────────────────────────
interface ShoppingRowProps {
  item: LocalShoppingItem;
  onToggle: (item: LocalShoppingItem) => void;
  onDelete: (id: string) => void;
}

function ShoppingRow({ item, onToggle, onDelete }: ShoppingRowProps) {
  const isDone = item.status === "done";
  const priorityColor = item.isNew ? "hsl(var(--primary))" : "hsl(var(--warning))";
  const badgeText = item.isNew ? "Baru" : "Restock";

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      padding: "12px 0",
      borderBottom: "1px solid hsl(var(--border))",
      opacity: isDone ? 0.6 : 1,
      transition: "opacity 0.2s",
    }}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item)}
        style={{
          flexShrink: 0,
          width: "24px",
          height: "24px",
          borderRadius: "6px",
          border: isDone ? "2px solid hsl(var(--success))" : "2px solid hsl(var(--border))",
          background: isDone ? "hsl(var(--success))" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          marginTop: "2px",
          fontSize: "14px",
          transition: "all 0.2s",
        }}
      >
        {isDone && <span style={{ color: "white" }}>✓</span>}
      </button>

      {/* Detail */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: "15px", textDecoration: isDone ? "line-through" : "none" }}>
            {item.name}
          </span>
          <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px", background: `${priorityColor}20`, color: priorityColor, border: `1px solid ${priorityColor}40` }}>
            {badgeText}
          </span>
          {item.type === "product" && (
            <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "99px", background: "hsl(var(--primary)/0.1)", color: "hsl(var(--primary))" }}>Produk</span>
          )}
          {item.type === "rawMaterial" && (
            <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "99px", background: "hsl(var(--accent)/0.1)", color: "hsl(var(--accent))" }}>Bahan Baku</span>
          )}
        </div>
        <div style={{ fontSize: "12px", color: "hsl(var(--text-secondary))", marginTop: "4px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {item.sku && <span>SKU: <b>{item.sku}</b></span>}
          {item.category && <span>Kat: {item.category}</span>}
          <span>Target: <b>{item.qtyToBuy} {item.unit}</b></span>
          {item.price ? <span>Jual: {formatRupiahFull(item.price)}</span> : null}
          {item.costPerUnit ? <span>Harga/Unit: {formatRupiahFull(item.costPerUnit)}</span> : null}
        </div>
        {item.notes && <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "2px", fontStyle: "italic" }}>📝 {item.notes}</div>}
        {isDone && item.completedAt && (
          <div style={{ fontSize: "11px", color: "hsl(var(--success))", marginTop: "4px" }}>
            ✅ Selesai dibeli — {new Date(item.completedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>

      {/* Hapus */}
      <button className="btn btn-ghost btn-icon btn-sm" style={{ color: "hsl(var(--text-muted))", flexShrink: 0 }} onClick={() => onDelete(item.id)}>
        🗑
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// HALAMAN UTAMA
// ────────────────────────────────────────────────────────────────
export default function ShoppingListPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const tenantId = user?.tenantId ?? "";

  // Data dari IndexedDB
  const products = useLiveQuery(() => getDb().products.toArray()) || [];
  const rawMaterials = useLiveQuery(() => getDb().rawMaterials.toArray()) || [];
  const shoppingItems = useLiveQuery<LocalShoppingItem[]>(
    () => (tenantId ? getDb().shoppingList.where("tenantId").equals(tenantId).toArray() : []),
    [tenantId]
  ) ?? [];

  const sales = useLiveQuery(() => tenantId ? getDb().sales.where("tenantId").equals(tenantId).and(s => s.status === "COMPLETED").toArray() : [], [tenantId]) || [];
  const expenses = useLiveQuery(() => tenantId ? getDb().expenses.where("tenantId").equals(tenantId).toArray() : [], [tenantId]) || [];
  const allAssets = useLiveQuery(() => tenantId ? getDb().assets.where("tenantId").equals(tenantId).toArray() : [], [tenantId]) || [];
  const returns = useLiveQuery(() => tenantId ? getDb().salesReturns.where("tenantId").equals(tenantId).toArray() : [], [tenantId]) || [];
  
  const initialCapitalValue = useLiveQuery(async () => {
    const pDefault = await getDb().storeProfile.get("default");
    if (!tenantId) return pDefault?.initialCapital || 0;
    const pTenant = await getDb().storeProfile.get(tenantId);
    return pTenant?.initialCapital || pDefault?.initialCapital || 0;
  }, [tenantId]) || 0;

  const currentCash = useMemo(() => {
    const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalReturns = returns.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalAssetValue = allAssets.reduce((sum, a) => sum + a.purchasePrice, 0);
    const persediaanProduk = products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0);
    const persediaanBahan = rawMaterials.reduce((sum, m) => sum + (m.stock * m.costPerUnit), 0);
    const totalPersediaan = persediaanProduk + persediaanBahan;

    return initialCapitalValue + totalSales - totalExpenses - totalReturns - totalAssetValue - totalPersediaan;
  }, [initialCapitalValue, sales, expenses, returns, allAssets, products, rawMaterials]);

  const storeProfile = useLiveQuery(() => 
    tenantId ? getDb().storeProfile.get(tenantId).then(p => p || getDb().storeProfile.get("default")) : getDb().storeProfile.get("default")
  , [tenantId]);

  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState<"belanja" | "selesai">("belanja");

  // ── Auto-populate dari threshold stok ──────────────────────
  const autoSuggestedProducts = useMemo(() => {
    const existingExistingIds = new Set(shoppingItems.map(i => i.existingLocalId).filter(Boolean));
    return products.filter(p => p.isActive && p.stock <= 5 && !existingExistingIds.has(p.localId));
  }, [products, shoppingItems]);

  const autoSuggestedMaterials = useMemo(() => {
    const existingExistingIds = new Set(shoppingItems.map(i => i.existingLocalId).filter(Boolean));
    return rawMaterials.filter(m => m.stock <= m.minStock && !existingExistingIds.has(m.localId));
  }, [rawMaterials, shoppingItems]);

  // ── Masukkan item auto-suggest ke daftar belanja ──────────
  const handleAddSuggestion = useCallback(async (
    item: (typeof products)[0] | (typeof rawMaterials)[0],
    type: "product" | "rawMaterial"
  ) => {
    const now = Date.now();
    const db = getDb();
    const isProduct = type === "product";
    const prod = item as typeof products[0];
    const mat = item as typeof rawMaterials[0];

    const newItem: LocalShoppingItem = {
      id: generateUUID(),
      tenantId,
      type,
      status: "pending",
      name: item.name,
      sku: isProduct ? prod.sku : undefined,
      category: isProduct ? prod.category : undefined,
      unit: item.unit,
      qtyToBuy: isProduct ? Math.max(10 - prod.stock, 1) : Math.max((mat.minStock * 3) - mat.stock, 1),
      price: isProduct ? prod.price : undefined,
      costPrice: isProduct ? prod.costPrice : undefined,
      costPerUnit: !isProduct ? mat.costPerUnit : undefined,
      minStock: !isProduct ? mat.minStock : undefined,
      existingLocalId: item.localId,
      isNew: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.shoppingList.add(newItem);
    toast(`✅ ${item.name} ditambahkan ke daftar belanja`, "success");
  }, [tenantId, toast]);

  // ── Toggle centang selesai → otomatis update/create produk atau bahan ──
  const handleToggle = useCallback(async (item: LocalShoppingItem) => {
    const db = getDb();
    const now = Date.now();

    if (item.status === "pending") {
      const itemCost = item.type === "product" ? (item.qtyToBuy * (item.costPrice || 0)) : (item.qtyToBuy * (item.costPerUnit || 0));
      
      if (itemCost > currentCash) {
        if (!confirm(`⚠️ Kas di laci (${formatRupiahFull(currentCash)}) tidak cukup untuk belanja ini (${formatRupiahFull(itemCost)}). Tetap lanjutkan?`)) {
          return;
        }
      }

      // Tandai selesai
      await db.shoppingList.update(item.id, { status: "done", completedAt: now, updatedAt: now });

      // Kalau item ini restock → update stok produk/bahan di IndexedDB
      if (!item.isNew && item.existingLocalId) {
        if (item.type === "product") {
          const existing = await db.products.get(item.existingLocalId);
          if (existing) {
            const newStock = (existing.stock || 0) + item.qtyToBuy;
            const updatedProd = { ...existing, stock: newStock, updatedAt: now };
            await db.products.update(item.existingLocalId, { stock: newStock, updatedAt: now });
            await enqueueSyncOp("products", item.existingLocalId, "UPDATE", updatedProd);
            toast(`📦 Stok ${item.name} +${item.qtyToBuy} diperbarui`, "success");
          }
        } else {
          const existing = await db.rawMaterials.get(item.existingLocalId);
          if (existing) {
            const newStock = (existing.stock || 0) + item.qtyToBuy;
            const updatedMat = { ...existing, stock: newStock, updatedAt: now };
            await db.rawMaterials.update(item.existingLocalId, { stock: newStock, updatedAt: now });
            await enqueueSyncOp("rawMaterials", item.existingLocalId, "UPDATE", updatedMat);
            toast(`🧪 Stok ${item.name} +${item.qtyToBuy} ${item.unit} diperbarui`, "success");
          }
        }
      }

      // Kalau item BARU → tambahkan sebagai produk/bahan baku baru di IndexedDB
      if (item.isNew) {
        const newLocalId = generateUUID();
        if (item.type === "product") {
          const newProduct = {
            id: newLocalId,
            localId: newLocalId,
            tenantId: item.tenantId,
            sku: item.sku || generateSku(item.name, item.category),
            name: item.name,
            category: item.category,
            price: item.price || 0,
            costPrice: item.costPrice || 0,
            stock: item.qtyToBuy,
            unit: item.unit,
            isActive: true,
            showInPos: true,
            hasBoM: false,
            syncStatus: "PENDING" as const,
            updatedAt: now,
          };
          await db.products.add(newProduct);
          await enqueueSyncOp("products", newLocalId, "CREATE", newProduct);
          toast(`🛍️ Produk baru "${item.name}" ditambahkan ke master produk!`, "success");
        } else {
          const newMaterial = {
            id: newLocalId,
            localId: newLocalId,
            tenantId: item.tenantId,
            name: item.name,
            unit: item.unit,
            stock: item.qtyToBuy,
            costPerUnit: item.costPerUnit || 0,
            minStock: item.minStock || 0,
            syncStatus: "PENDING" as const,
            updatedAt: now,
          };
          await db.rawMaterials.add(newMaterial);
          await enqueueSyncOp("rawMaterials", newLocalId, "CREATE", newMaterial);
          toast(`🧪 Bahan baku "${item.name}" ditambahkan ke master bahan baku!`, "success");
        }
        // Update shoppingList item dengan existingLocalId baru
        await db.shoppingList.update(item.id, { existingLocalId: newLocalId, isNew: false, updatedAt: now });
      }
    } else {
      // Batal selesai
      await db.shoppingList.update(item.id, { status: "pending", completedAt: undefined, updatedAt: now });
      
      // Kembalikan (Revert) stok di IndexedDB jika batal
      if (!item.isNew && item.existingLocalId) {
        if (item.type === "product") {
          const existing = await db.products.get(item.existingLocalId);
          if (existing) {
            const newStock = Math.max(0, (existing.stock || 0) - item.qtyToBuy);
            const updatedProd = { ...existing, stock: newStock, updatedAt: now };
            await db.products.update(item.existingLocalId, { stock: newStock, updatedAt: now });
            await enqueueSyncOp("products", item.existingLocalId, "UPDATE", updatedProd);
            toast(`📦 Stok ${item.name} dikembalikan (-${item.qtyToBuy})`, "info");
          }
        } else {
          const existing = await db.rawMaterials.get(item.existingLocalId);
          if (existing) {
            const newStock = Math.max(0, (existing.stock || 0) - item.qtyToBuy);
            const updatedMat = { ...existing, stock: newStock, updatedAt: now };
            await db.rawMaterials.update(item.existingLocalId, { stock: newStock, updatedAt: now });
            await enqueueSyncOp("rawMaterials", item.existingLocalId, "UPDATE", updatedMat);
            toast(`🧪 Stok ${item.name} dikembalikan (-${item.qtyToBuy})`, "info");
          }
        }
      } else {
        toast("↩️ Dibatalkan", "info");
      }
    }
  }, [toast]);

  const handleDelete = useCallback(async (id: string) => {
    await getDb().shoppingList.delete(id);
    toast("🗑️ Item dihapus", "info");
  }, [toast]);

  const pendingItems = shoppingItems.filter(i => i.status === "pending");
  const doneItems = shoppingItems.filter(i => i.status === "done");

  const handleSeedDummy = async () => {
    const db = getDb();
    const now = Date.now();
    const dummyItems: LocalShoppingItem[] = [
      {
        id: generateUUID(),
        tenantId,
        type: "product",
        status: "pending",
        name: "Susu UHT Full Cream",
        sku: "M-MILK101",
        category: "Bahan Minuman",
        unit: "Liter",
        qtyToBuy: 12,
        costPrice: 18000,
        price: 22000,
        isNew: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: generateUUID(),
        tenantId,
        type: "product",
        status: "pending",
        name: "Kopi Arabica Gayo 1kg",
        sku: "K-GAYO202",
        category: "Kopi",
        unit: "Pack",
        qtyToBuy: 5,
        costPrice: 120000,
        price: 150000,
        isNew: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: generateUUID(),
        tenantId,
        type: "rawMaterial",
        status: "pending",
        name: "Gula Pasir",
        unit: "kg",
        qtyToBuy: 10,
        costPerUnit: 14500,
        minStock: 5,
        isNew: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
    await db.shoppingList.bulkAdd(dummyItems);
    toast("✅ Dummy belanja berhasil ditambahkan", "success");
  };

  const completionRate = shoppingItems.length > 0
    ? Math.round((doneItems.length / shoppingItems.length) * 100)
    : 0;

  return (
    <DashboardLayout title="Daftar Belanja">
      <div style={{ display: "grid", gap: "20px" }}>

        {/* Header Card */}
        <div style={{
          background: "var(--gradient-primary)",
          borderRadius: "16px",
          padding: "20px 24px",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>🛒 Daftar Belanja Owner</h2>
            <p style={{ opacity: 0.85, fontSize: "13px", marginTop: "4px" }}>
              {pendingItems.length} item perlu dibeli · {doneItems.length} sudah selesai
            </p>
          </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {shoppingItems.length === 0 && (
              <button className="btn btn-sm btn-ghost no-print" style={{ color: "white", borderColor: "rgba(255,255,255,0.4)" }} onClick={handleSeedDummy}>
                🧪 Isi Dummy
              </button>
            )}
            {shoppingItems.length > 0 && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "32px", fontWeight: 800, lineHeight: 1 }}>{completionRate}%</div>
                <div style={{ fontSize: "11px", opacity: 0.8 }}>Selesai</div>
              </div>
            )}
            <button className="btn btn-sm no-print" style={{ background: "white", color: "hsl(var(--primary))", fontWeight: 700 }} onClick={() => setShowAdd(true)}>
              ➕ Tambah Baru
            </button>
          </div>
        </div>

        {/* Auto-suggest section */}
        {(autoSuggestedProducts.length > 0 || autoSuggestedMaterials.length > 0) && (
          <div className="card" style={{ borderLeft: "4px solid hsl(var(--warning))" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px", color: "hsl(var(--warning))" }}>
              ⚡ Saran Prioritas (Stok Kritis)
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {autoSuggestedProducts.slice(0, 8).map(p => (
                <button
                  key={p.localId}
                  className="btn btn-sm btn-ghost"
                  style={{ border: "1px solid hsl(var(--warning)/0.4)", color: "hsl(var(--warning))", fontSize: "12px" }}
                  onClick={() => handleAddSuggestion(p, "product")}
                >
                  🛍️ {p.name} ({p.stock} {p.unit} sisa)
                </button>
              ))}
              {autoSuggestedMaterials.slice(0, 8).map(m => (
                <button
                  key={m.localId}
                  className="btn btn-sm btn-ghost"
                  style={{ border: "1px solid hsl(var(--accent)/0.4)", color: "hsl(var(--accent))", fontSize: "12px" }}
                  onClick={() => handleAddSuggestion(m, "rawMaterial")}
                >
                  🧪 {m.name} ({m.stock}/{m.minStock} {m.unit})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {shoppingItems.length > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px", fontWeight: 600 }}>
              <span>Progress Belanja</span>
              <span>{doneItems.length} / {shoppingItems.length}</span>
            </div>
            <div style={{ height: "10px", borderRadius: "99px", background: "hsl(var(--bg-elevated))", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${completionRate}%`,
                background: completionRate === 100 ? "hsl(var(--success))" : "var(--gradient-primary)",
                borderRadius: "99px",
                transition: "width 0.4s ease",
              }} />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid hsl(var(--border))", paddingBottom: "0" }}>
          {[
            { key: "belanja", label: `🛒 Perlu Dibeli (${pendingItems.length})` },
            { key: "selesai", label: `✅ Sudah Selesai (${doneItems.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              className="btn btn-ghost btn-sm"
              style={{
                borderBottom: activeTab === tab.key ? "3px solid hsl(var(--primary))" : "3px solid transparent",
                borderRadius: 0,
                color: activeTab === tab.key ? "hsl(var(--primary))" : "hsl(var(--text-secondary))",
                fontWeight: activeTab === tab.key ? 700 : 400,
                paddingBottom: "10px",
              }}
              onClick={() => setActiveTab(tab.key as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="card" style={{ padding: "4px 16px" }}>
          {activeTab === "belanja" && (
            pendingItems.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "hsl(var(--text-muted))" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎉</div>
                <p style={{ fontWeight: 600 }}>Semua belanjaan sudah selesai!</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: "12px" }} onClick={() => setShowAdd(true)}>+ Tambah Item Baru</button>
              </div>
            ) : (
              <div>
                {pendingItems.sort((a, b) => (a.createdAt - b.createdAt)).map(item => (
                  <ShoppingRow key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
                ))}
              </div>
            )
          )}

          {activeTab === "selesai" && (
            doneItems.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "hsl(var(--text-muted))" }}>
                <p>Belum ada item yang selesai dibeli.</p>
              </div>
            ) : (
              <div>
                {doneItems.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)).map(item => (
                  <ShoppingRow key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
                ))}
                <div style={{ padding: "12px 0", display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost btn-sm" style={{ color: "hsl(var(--error))", fontSize: "12px" }}
                    onClick={async () => {
                      const ids = doneItems.map(i => i.id);
                      await getDb().shoppingList.bulkDelete(ids);
                      toast("🗑️ Riwayat belanja dihapus", "info");
                    }}>
                    🗑️ Hapus Semua yang Selesai
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {/* Tombol cetak */}
        <div style={{ display: "flex", justifyContent: "flex-end" }} className="no-print">
          <button 
            className="btn btn-ghost" 
            style={{ fontSize: "13px" }} 
            onClick={() => window.print()}
            disabled={pendingItems.length === 0}
          >
            🖨️ Cetak Daftar Belanja
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* PRINT AREA — Hanya muncul saat Cetak (via globals.css) */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <div id="print-area" style={{ padding: "40px", color: "black", background: "white" }}>
        <div style={{ textAlign: "center", marginBottom: "30px", borderBottom: "2px solid black", paddingBottom: "20px" }}>
          <h1 style={{ fontSize: "24px", margin: "0 0 5px 0", textTransform: "uppercase" }}>
            Daftar Belanja {storeProfile?.storeName || user?.name || "Toko"}
          </h1>
          <p style={{ margin: 0, fontSize: "14px" }}>
            Tanggal: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid black", padding: "10px", textAlign: "left", width: "40px" }}>No</th>
              <th style={{ border: "1px solid black", padding: "10px", textAlign: "left" }}>Nama Item</th>
              <th style={{ border: "1px solid black", padding: "10px", textAlign: "center", width: "100px" }}>Jumlah</th>
              <th style={{ border: "1px solid black", padding: "10px", textAlign: "left", width: "80px" }}>Satuan</th>
              <th style={{ border: "1px solid black", padding: "10px", textAlign: "left" }}>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {pendingItems.length > 0 ? (
              pendingItems.sort((a, b) => a.createdAt - b.createdAt).map((item, idx) => (
                <tr key={item.id}>
                  <td style={{ border: "1px solid black", padding: "10px", textAlign: "center" }}>{idx + 1}</td>
                  <td style={{ border: "1px solid black", padding: "10px" }}>
                    <div style={{ fontWeight: "bold" }}>{item.name}</div>
                    <div style={{ fontSize: "12px" }}>{item.sku ? `SKU: ${item.sku}` : (item.category ? `Kat: ${item.category}` : "")}</div>
                  </td>
                  <td style={{ border: "1px solid black", padding: "10px", textAlign: "center", fontWeight: "bold" }}>{item.qtyToBuy}</td>
                  <td style={{ border: "1px solid black", padding: "10px" }}>{item.unit}</td>
                  <td style={{ border: "1px solid black", padding: "10px", fontSize: "12px" }}>{item.notes || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ border: "1px solid black", padding: "20px", textAlign: "center" }}>Tidak ada item untuk dibeli.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ marginTop: "40px", fontSize: "12px", fontStyle: "italic", textAlign: "center", opacity: 0.7 }}>
          Dicetak melalui aplikasi MbakKasir pada {new Date().toLocaleString("id-ID")}
        </div>
      </div>

      {/* Modal Tambah */}
      {showAdd && tenantId && (
        <AddItemModal tenantId={tenantId} onClose={() => setShowAdd(false)} toast={toast} />
      )}
    </DashboardLayout>
  );
}
