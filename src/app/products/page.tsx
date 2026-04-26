"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { useAuth, useToast } from "@/contexts/AppProviders";
import { useInitialSync } from "@/hooks/useInitialSync";
import {
  enqueueSyncOp,
  getDb,
  type LocalBillOfMaterial,
  type LocalProduct,
} from "@/lib/db";
import { formatRupiahFull, generateUUID } from "@/lib/utils";

interface ProductFormState {
  sku: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  price: number;
  costPrice: number;
  hasBoM: boolean;
  showInPos: boolean;
  imageUrl: string;
}

interface BomDraftRow {
  rawMaterialId: string;
  quantity: number;
}

interface BomCostRow {
  rawMaterialId: string;
  rawMaterialName: string;
  unit: string;
  quantity: number;
  costPerUnit: number;
  subtotal: number;
}

const INITIAL_FORM: ProductFormState = {
  sku: "",
  name: "",
  category: "",
  unit: "pcs",
  stock: 0,
  price: 0,
  costPrice: 0,
  hasBoM: false,
  showInPos: true,
  imageUrl: "",
};

const EMPTY_BOM_ROW: BomDraftRow = {
  rawMaterialId: "",
  quantity: 1,
};

const DEFAULT_YIELD_UNITS = 1;
const DEFAULT_MARGIN_PERCENT = 30;

function calculateSuggestedSellingPrice(
  hpp: number,
  marginPercent: number
): number | null {
  if (!Number.isFinite(hpp) || hpp <= 0) {
    return null;
  }

  const marginRatio = marginPercent / 100;
  if (marginRatio >= 1) {
    return null;
  }

  return Math.ceil(hpp / (1 - marginRatio));
}

// ============================================================
// MANAJEMEN PRODUK (Offline-Ready)
// ============================================================

export default function ProductsPage() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const { toast } = useToast();
  const { isSyncing, error } = useInitialSync();

  const products = useLiveQuery(() => 
    tenantId ? getDb().products.where("tenantId").equals(tenantId).toArray() : Promise.resolve([])
  , [tenantId]) || [];

  const rawMaterials = useLiveQuery(() => 
    tenantId ? getDb().rawMaterials.where("tenantId").equals(tenantId).toArray() : Promise.resolve([])
  , [tenantId]) || [];

  const billOfMaterials = useLiveQuery(() => {
    if (!tenantId) return Promise.resolve([]);
    // BoM doesn't have tenantId directly, we must filter by product localIds
    const productIds = products.map(p => p.localId);
    return getDb().billOfMaterials.where("productId").anyOf(productIds).toArray();
  }, [tenantId, products.length]) || [];

  const posTerminals = useLiveQuery(() => 
    tenantId ? getDb().posTerminals.where("tenantId").equals(tenantId).toArray() : Promise.resolve([])
  , [tenantId]) || [];

  const productAssignments = useLiveQuery(() => {
    if (!tenantId) return Promise.resolve([]);
    const productIds = products.map(p => p.localId);
    return getDb().productAssignments.where("productId").anyOf(productIds).toArray();
  }, [tenantId, products.length]) || [];

  const [terminalAssignments, setTerminalAssignments] = useState<{terminalId: string, stock: number}[]>([]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(INITIAL_FORM);
  const [bomRows, setBomRows] = useState<BomDraftRow[]>([{ ...EMPTY_BOM_ROW }]);
  const [yieldUnits, setYieldUnits] = useState(DEFAULT_YIELD_UNITS);
  const [marginPercent, setMarginPercent] = useState(DEFAULT_MARGIN_PERCENT);

  const bomCountByProductId = billOfMaterials.reduce<Record<string, number>>(
    (acc, bom) => {
      acc[bom.productId] = (acc[bom.productId] || 0) + 1;
      return acc;
    },
    {}
  );

  const activeProducts = products.filter((product) => product.isActive).length;
  const productsWithBoM = products.filter(
    (product) => (bomCountByProductId[product.localId] || 0) > 0
  ).length;

  const bomCostRows: BomCostRow[] = form.hasBoM
    ? bomRows
        .filter((row) => row.rawMaterialId && row.quantity > 0)
        .flatMap((row) => {
          const material = rawMaterials.find(
            (candidate) => candidate.localId === row.rawMaterialId
          );

          if (!material) {
            return [];
          }

          return [
            {
              rawMaterialId: row.rawMaterialId,
              rawMaterialName: material.name,
              unit: material.unit,
              quantity: row.quantity,
              costPerUnit: material.costPerUnit,
              subtotal: material.costPerUnit * row.quantity,
            },
          ];
        })
    : [];

  const totalBatchCost = bomCostRows.reduce((total, row) => total + row.subtotal, 0);
  const calculatedHpp =
    form.hasBoM && bomCostRows.length > 0 && yieldUnits > 0
      ? Math.ceil(totalBatchCost / yieldUnits)
      : null;
  const suggestedSellingPrice =
    calculatedHpp !== null
      ? calculateSuggestedSellingPrice(calculatedHpp, marginPercent)
      : null;
  const suggestedProfitPerUnit =
    calculatedHpp !== null && suggestedSellingPrice !== null
      ? suggestedSellingPrice - calculatedHpp
      : null;

  const resetCreateForm = () => {
    setForm(INITIAL_FORM);
    setBomRows([{ ...EMPTY_BOM_ROW }]);
    setYieldUnits(DEFAULT_YIELD_UNITS);
    setMarginPercent(DEFAULT_MARGIN_PERCENT);
    setEditingId(null);
    setShowCreateForm(false);
    setTerminalAssignments([]);
  };

  const startEditProduct = (product: LocalProduct) => {
    setEditingId(product.localId);
    setForm({
      sku: product.sku || "",
      name: product.name,
      category: product.category || "",
      unit: product.unit,
      stock: product.stock,
      price: product.price,
      costPrice: product.costPrice,
      hasBoM: product.hasBoM,
      showInPos: product.showInPos ?? true,
      imageUrl: product.imageUrl || "",
    });

    const existingBom = billOfMaterials.filter((b) => b.productId === product.localId);
    if (existingBom.length > 0) {
      setBomRows(existingBom.map((b) => ({ rawMaterialId: b.rawMaterialId, quantity: Number(b.quantity) })));
    } else {
      setBomRows([{ ...EMPTY_BOM_ROW }]);
    }

    const currentAssignments = productAssignments.filter(a => a.productId === product.localId);
    setTerminalAssignments(currentAssignments.map(a => ({ terminalId: a.terminalId, stock: a.stock })));

    setShowCreateForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteProduct = async (product: LocalProduct) => {
    if (!confirm(`Yakin ingin menghapus produk "${product.name}"? Ini juga akan menghapus resep BOM jika ada.`)) return;

    try {
      const db = getDb();
      await db.transaction("rw", [db.products, db.billOfMaterials, db.syncQueue], async () => {
        const bomsToDelete = await db.billOfMaterials.where("productId").equals(product.localId).toArray();
        if (bomsToDelete.length > 0) {
          await db.billOfMaterials.bulkDelete(bomsToDelete.map((b) => b.id));
          for (const b of bomsToDelete) {
            await enqueueSyncOp("billOfMaterials", b.id, "DELETE", { deleted: true });
          }
        }

        await db.products.delete(product.localId);
        await enqueueSyncOp("products", product.localId, "DELETE", { deleted: true });
      });

      toast("Produk berhasil dihapus", "success");
    } catch {
      toast("Gagal menghapus produk", "error");
    }
  };

  const toggleStatus = async (product: LocalProduct) => {
    try {
      const db = getDb();
      const updated = {
        ...product,
        isActive: !product.isActive,
        updatedAt: product.updatedAt + 1,
      };

      await db.products.put(updated);
      await enqueueSyncOp("products", product.localId, "UPDATE", updated);
      toast(`Produk ${updated.isActive ? "diaktifkan" : "dinonaktifkan"}`, "success");
    } catch {
      toast("Gagal mengubah status produk", "error");
    }
  };

  const handleSaveProduct = async () => {
    if (!user?.tenantId) {
      toast("Sesi tenant tidak ditemukan", "error");
      return;
    }

    if (!form.name.trim()) {
      toast("Nama produk wajib diisi", "warning");
      return;
    }

    if (form.price <= 0) {
      toast("Harga jual harus lebih dari nol", "warning");
      return;
    }

    if (!form.unit.trim()) {
      toast("Satuan produk wajib diisi", "warning");
      return;
    }

    if (
      form.sku.trim() &&
      products.some((product) => product.sku === form.sku.trim() && product.localId !== editingId)
    ) {
      toast("SKU sudah dipakai produk lain", "warning");
      return;
    }

    if (form.hasBoM && rawMaterials.length === 0) {
      toast("Tambahkan bahan baku dulu sebelum mengaktifkan BoM", "warning");
      return;
    }

    const validBomRows = bomCostRows.map((row) => ({
      rawMaterialId: row.rawMaterialId,
      quantity: row.quantity,
    }));

    if (form.hasBoM && validBomRows.length === 0) {
      toast("Pilih minimal satu bahan baku untuk BoM", "warning");
      return;
    }

    const rawMaterialIds = validBomRows.map((row) => row.rawMaterialId);
    if (new Set(rawMaterialIds).size !== rawMaterialIds.length) {
      toast("Bahan baku BoM tidak boleh duplikat", "warning");
      return;
    }

    try {
      const db = getDb();
      const localId = editingId || generateUUID();
      const updatedAt = Date.now();
      const effectiveCostPrice =
        form.hasBoM && calculatedHpp !== null ? calculatedHpp : form.costPrice;

      const existingProduct = editingId ? products.find((p) => p.localId === editingId) : null;

      const productPayload: LocalProduct = {
        id: existingProduct?.id || localId,
        localId,
        tenantId: user.tenantId,
        sku: form.sku.trim() || undefined,
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        price: form.price,
        costPrice: effectiveCostPrice,
        stock: form.stock,
        unit: form.unit.trim(),
        imageUrl: form.imageUrl.trim() || undefined,
        isActive: existingProduct ? existingProduct.isActive : true,
        showInPos: form.showInPos,
        hasBoM: validBomRows.length > 0,
        syncStatus: "PENDING",
        updatedAt,
      };

      const bomEntries: LocalBillOfMaterial[] = validBomRows.map((row) => {
        const existingRow = Array.from(billOfMaterials).find(
          (b) => b.productId === localId && b.rawMaterialId === row.rawMaterialId
        );
        return {
          id: existingRow?.id || generateUUID(),
          productId: localId,
          rawMaterialId: row.rawMaterialId,
          quantity: row.quantity,
        };
      });

      await db.transaction(
        "rw",
        [db.products, db.billOfMaterials, db.syncQueue, db.productAssignments],
        async () => {
          await db.products.put(productPayload);
          await enqueueSyncOp("products", localId, editingId ? "UPDATE" : "CREATE", productPayload);

            if (editingId) {
              const existingBoms = await db.billOfMaterials.where("productId").equals(localId).toArray();
              const bomsToDelete = existingBoms.filter((eb) => !bomEntries.some((nb) => nb.id === eb.id));

              if (bomsToDelete.length > 0) {
                await db.billOfMaterials.bulkDelete(bomsToDelete.map((b) => b.id));
                for (const b of bomsToDelete) {
                  await enqueueSyncOp("billOfMaterials", b.id, "DELETE", { deleted: true });
                }
              }

              // Assignments cleanup
              const existingAssignments = await db.productAssignments.where("productId").equals(localId).toArray();
              await db.productAssignments.bulkDelete(existingAssignments.map(a => a.id));
              // Note: For simplicity, we delete all and recreate. 
              // In a real app, we'd sync DELETE for removed ones.
              // For now, let's just push CREATE for all current ones.
            }

            if (bomEntries.length > 0) {
              await db.billOfMaterials.bulkPut(bomEntries);

              for (const bom of bomEntries) {
                await enqueueSyncOp("billOfMaterials", bom.id, editingId ? "UPDATE" : "CREATE", bom);
              }
            }

            // Save Assignments (Clean up old ones first if editing)
            if (editingId) {
              const oldAssignments = await db.productAssignments.where("productId").equals(editingId).toArray();
              for (const oa of oldAssignments) {
                await db.productAssignments.delete(oa.id);
                // Optional: enqueue DELETE sync if needed, but usually initial sync will handle reconciliation
              }
            }

            if (terminalAssignments.length > 0) {
              const newAssignments = terminalAssignments.map(ta => ({
                id: generateUUID(),
                productId: localId,
                terminalId: ta.terminalId,
                stock: ta.stock
              }));
              await db.productAssignments.bulkPut(newAssignments);
              
              for (const assignment of newAssignments) {
                await enqueueSyncOp("productAssignments", assignment.id, "CREATE", assignment);
              }
            }
          }
        );

      toast(
        editingId
          ? `Produk ${productPayload.name} berhasil diperbarui`
          : bomEntries.length > 0
            ? `Produk ${productPayload.name} ditambahkan beserta BoM`
            : `Produk ${productPayload.name} ditambahkan`,
        "success"
      );
      resetCreateForm();
    } catch {
      toast(editingId ? "Gagal memperbarui produk" : "Gagal menambahkan produk", "error");
    }
  };

  return (
    <DashboardLayout title="Manajemen Produk">
      <div style={{ display: "grid", gap: "24px" }}>
        {error && (
          <div className="card" style={{ background: "hsl(var(--error) / 0.1)", borderColor: "hsl(var(--error))", color: "hsl(var(--error))", padding: "12px 16px", fontSize: "14px" }}>
            ⚠️ <strong>Gagal Sinkronisasi:</strong> {error}
            <button 
              onClick={() => window.location.reload()}
              style={{ marginLeft: "12px", textDecoration: "underline", fontWeight: 700 }}
            >
              Coba Lagi
            </button>
          </div>
        )}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
          }}
        >
          <div className="stat-card">
            <span style={statLabelStyle}>Total Produk</span>
            <span className="stat-value">{products.length}</span>
            <span style={statHintStyle}>Semua produk yang tersimpan lokal</span>
          </div>

          <div className="stat-card">
            <span style={statLabelStyle}>Produk Aktif</span>
            <span className="stat-value">{activeProducts}</span>
            <span style={statHintStyle}>{products.length - activeProducts} nonaktif</span>
          </div>

          <div className="stat-card">
            <span style={statLabelStyle}>BoM Aktif</span>
            <span className="stat-value">{productsWithBoM}</span>
            <span style={statHintStyle}>
              {billOfMaterials.length.toLocaleString("id-ID")} resep bahan baku
            </span>
          </div>

          <div className="stat-card" style={{ background: "var(--gradient-primary)" }}>
            <span style={{ ...statLabelStyle, color: "white", opacity: 0.8 }}>
              Bahan Baku Tersedia
            </span>
            <span className="stat-value" style={{ color: "white", WebkitTextFillColor: "white" }}>
              {rawMaterials.length}
            </span>
            <span style={{ ...statHintStyle, color: "white", opacity: 0.82 }}>
              Siap dipakai untuk produk berbasis BoM
            </span>
          </div>
        </section>

        <section
          className="card"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ fontSize: "18px" }}>Daftar Produk</h2>
            <p style={{ marginTop: "6px", fontSize: "14px", color: "hsl(var(--text-secondary))" }}>
              Tambah produk baru langsung dari perangkat ini. Jika online, data akan otomatis naik ke
              server lewat background sync.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn btn-outline"
              onClick={() => window.location.reload()}
            >
              🔄 Sinkron Data
            </button>
            <button
              className={`btn ${showCreateForm ? "btn-ghost" : "btn-primary"}`}
              onClick={() => {
                if (showCreateForm) resetCreateForm();
                else setShowCreateForm(true);
              }}
            >
              {showCreateForm ? "Tutup Form" : "+ Tambah Produk"}
            </button>
          </div>
        </section>

        {showCreateForm && (
          <section className="card" style={{ display: "grid", gap: "18px" }}>
            <div>
              <h3 style={{ fontSize: "18px" }}>{editingId ? "Edit Produk" : "Produk Baru"}</h3>
              <p style={{ marginTop: "6px", fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
                Untuk produk berbasis resep, aktifkan BoM lalu pilih bahan baku dan kuantitas per 1 unit
                produk.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
              }}
            >
              <div>
                <label className="input-label" htmlFor="sku">
                  SKU
                </label>
                <input
                  id="sku"
                  className="input-field"
                  placeholder="PRD-001"
                  value={form.sku}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, sku: event.target.value.toUpperCase() }))
                  }
                />
              </div>

              <div>
                <label className="input-label" htmlFor="name">
                  Nama Produk
                </label>
                <input
                  id="name"
                  className="input-field"
                  placeholder="Contoh: Kopi Susu Gula Aren"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>

              <div>
                <label className="input-label" htmlFor="category">
                  Kategori
                </label>
                <input
                  id="category"
                  className="input-field"
                  placeholder="Minuman"
                  value={form.category}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, category: event.target.value }))
                  }
                />
              </div>

              <div>
                <label className="input-label" htmlFor="unit">
                  Satuan
                </label>
                <input
                  id="unit"
                  className="input-field"
                  placeholder="pcs / porsi / gelas"
                  value={form.unit}
                  onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))}
                />
              </div>

              <div>
                <label className="input-label" htmlFor="stock">
                  Stok Gudang (Pusat)
                </label>
                <input
                  id="stock"
                  type="number"
                  min="0"
                  step="1"
                  className="input-field"
                  value={form.stock}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      stock: Number(event.target.value) || 0,
                    }))
                  }
                />
              </div>

              {form.hasBoM ? (
                <div style={{ display: "grid", gap: "8px", alignContent: "start" }}>
                  <span className="input-label">HPP / Cost Price</span>
                  <div
                    className="card"
                    style={{
                      padding: "14px 16px",
                      minHeight: "56px",
                      display: "flex",
                      alignItems: "center",
                      background: "hsl(var(--bg-elevated) / 0.55)",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: 700 }}>
                        {calculatedHpp !== null
                          ? formatRupiahFull(calculatedHpp)
                          : formatRupiahFull(form.costPrice)}
                      </div>
                      <div
                        style={{
                          marginTop: "4px",
                          fontSize: "12px",
                          color: "hsl(var(--text-secondary))",
                        }}
                      >
                        {calculatedHpp !== null
                          ? "Terhitung otomatis dari biaya bahan dan yield"
                          : "Aktifkan dan lengkapi BoM untuk menghitung HPP otomatis"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <CurrencyInput
                  id="costPrice"
                  label="HPP / Cost Price"
                  value={form.costPrice}
                  onChange={(value) => setForm((prev) => ({ ...prev, costPrice: value }))}
                  placeholder="7000"
                />
              )}

              <CurrencyInput
                id="price"
                label="Harga Jual"
                value={form.price}
                onChange={(value) => setForm((prev) => ({ ...prev, price: value }))}
                placeholder="15000"
              />

              <div style={{ display: "grid", gap: "8px" }}>
                <label className="input-label">Foto Produk</label>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div 
                    style={{ 
                      width: "80px", 
                      height: "80px", 
                      borderRadius: "12px", 
                      background: "hsl(var(--bg-elevated))", 
                      border: "1px dashed hsl(var(--border))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0
                    }}
                  >
                    {form.imageUrl ? (
                      <img src={form.imageUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: "24px", opacity: 0.3 }}>📸</span>
                    )}
                  </div>
                  <div style={{ flex: 1, display: "grid", gap: "8px" }}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="product-image-upload"
                      style={{ display: "none" }} 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) { 
                            toast("Ukuran foto maksimal 2MB", "warning");
                            return;
                          }

                          // 1. Coba upload ke server dulu (untuk Railway Volume)
                          const formData = new FormData();
                          formData.append("file", file);

                          try {
                            const res = await fetch("/api/upload/products", {
                              method: "POST",
                              body: formData,
                            });
                            
                            if (res.ok) {
                              const data = await res.json();
                              setForm(prev => ({ ...prev, imageUrl: data.url }));
                              toast("Foto berhasil diunggah ke server", "success");
                              return;
                            }
                          } catch (err) {
                            console.error("Server upload failed, falling back to local storage", err);
                          }

                          // 2. Fallback ke Base64 jika offline atau server error
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setForm(prev => ({ ...prev, imageUrl: reader.result as string }));
                            toast("Server offline. Foto disimpan lokal (Base64).", "info");
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <label htmlFor="product-image-upload" className="btn btn-sm btn-outline" style={{ cursor: "pointer" }}>
                        {form.imageUrl ? "Ganti Foto" : "Pilih Foto"}
                      </label>
                      {form.imageUrl && (
                        <button type="button" className="btn btn-sm btn-ghost" style={{ color: "hsl(var(--error))" }} onClick={() => setForm(prev => ({ ...prev, imageUrl: "" }))}>
                          Hapus
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: "11px", color: "hsl(var(--text-muted))" }}>Maksimal 1MB. Foto akan tampil di Kasir & Toko Online.</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius-md)",
                padding: "16px",
                background: "hsl(var(--bg-elevated) / 0.5)",
                display: "grid",
                gap: "14px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.hasBoM}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, hasBoM: event.target.checked }))
                  }
                />
                Aktifkan BoM untuk produk ini
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "hsl(var(--primary))"
                }}
              >
                <input
                  type="checkbox"
                  checked={form.showInPos}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, showInPos: event.target.checked }))
                  }
                />
                Tampilkan produk ini di Kasir (POS)
              </label>

              {/* TERMINAL ASSIGNMENT */}
              {form.showInPos && (
                <div style={{ marginTop: "10px", padding: "16px", background: "hsl(var(--bg-elevated) / 0.8)", borderRadius: "12px", border: "1px solid hsl(var(--primary) / 0.2)" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, display: "block", marginBottom: "10px", color: "hsl(var(--primary))" }}>
                    📍 Distribusikan ke Terminal: 
                    <span style={{ fontWeight: 400, opacity: 0.6, marginLeft: "8px", fontSize: "11px" }}>
                      ({posTerminals.length} terminal terdeteksi)
                    </span>
                  </span>
                  
                  {posTerminals.length === 0 ? (
                    <p style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                      Belum ada terminal yang terdeteksi. Pastikan Anda sudah menambahkan terminal di Dashboard.
                    </p>
                  ) : (
                    <>
                      <div style={{ marginBottom: "12px", padding: "12px", background: "hsl(var(--primary) / 0.05)", borderRadius: "12px", border: "1px dashed hsl(var(--primary) / 0.3)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                          <span>📦 Stok di Gudang Pusat:</span>
                          <span style={{ fontWeight: 800, color: "hsl(var(--primary))" }}>{form.stock} {form.unit}</span>
                        </div>
                      </div>

                      <div style={{ display: "grid", gap: "10px" }}>
                        {posTerminals.map(terminal => {
                          const assignment = terminalAssignments.find(a => a.terminalId === terminal.id);
                          const isSelected = !!assignment;
                          return (
                            <div key={terminal.id} style={{ display: "flex", alignItems: "center", gap: "12px", background: "hsl(var(--bg-card))", padding: "10px", borderRadius: "10px", border: "1px solid hsl(var(--border))" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    // Kembalikan stok ke gudang saat terminal dilepas
                                    setForm(f => ({ ...f, stock: f.stock + assignment.stock }));
                                    setTerminalAssignments(prev => prev.filter(a => a.terminalId !== terminal.id));
                                  } else {
                                    setTerminalAssignments(prev => [...prev, { terminalId: terminal.id, stock: 0 }]);
                                  }
                                }}
                                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                                style={{ borderRadius: "8px", fontSize: "12px", minWidth: "120px" }}
                              >
                                {isSelected ? "✅ " : "➕ "} {terminal.name}
                              </button>

                              {isSelected && (
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                                  <label style={{ fontSize: "11px", whiteSpace: "nowrap" }}>Kirim ke POS:</label>
                                  <input
                                    type="number"
                                    className="input-field"
                                    style={{ height: "32px", padding: "0 8px", fontSize: "12px" }}
                                    value={assignment.stock}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                      const newVal = parseFloat(e.target.value) || 0;
                                      const diff = newVal - assignment.stock;
                                      
                                      // Validasi: Jangan sampai ambil stok lebih dari yang ada di gudang
                                      if (diff > form.stock) {
                                        toast("Stok gudang tidak mencukupi!", "error");
                                        return;
                                      }

                                      setForm(f => ({ ...f, stock: f.stock - diff }));
                                      setTerminalAssignments(prev => prev.map(a => a.terminalId === terminal.id ? { ...a, stock: newVal } : a));
                                    }}
                                  />
                                  <span style={{ fontSize: "11px", color: "hsl(var(--text-muted))" }}>{form.unit}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p style={{ marginTop: "8px", fontSize: "11px", color: "hsl(var(--text-muted))" }}>
                        Jika tidak ada yang dipilih, produk akan tampil di SEMUA terminal (Default).
                      </p>
                    </>
                  )}
                </div>
              )}

              {!form.hasBoM ? (
                <p style={{ fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
                  Produk akan diperlakukan sebagai item biasa tanpa pemotongan bahan baku otomatis.
                </p>
              ) : rawMaterials.length === 0 ? (
                <p style={{ fontSize: "13px", color: "hsl(var(--warning))" }}>
                  Belum ada bahan baku di inventory, jadi BoM belum bisa dikonfigurasi.
                </p>
              ) : (
                <>
                  <div style={{ display: "grid", gap: "12px" }}>
                    {bomRows.map((row, index) => (
                      <div
                        key={`${index}-${row.rawMaterialId}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(0, 2fr) minmax(120px, 1fr) auto",
                          gap: "10px",
                          alignItems: "end",
                        }}
                      >
                        <div>
                          <label className="input-label">Bahan Baku</label>
                          <select
                            className="input-field"
                            value={row.rawMaterialId}
                            onChange={(event) =>
                              setBomRows((prev) =>
                                prev.map((item, rowIndex) =>
                                  rowIndex === index
                                    ? { ...item, rawMaterialId: event.target.value }
                                    : item
                                )
                              )
                            }
                          >
                            <option value="">Pilih bahan baku</option>
                            {rawMaterials.map((material) => (
                              <option key={material.localId} value={material.localId}>
                                {material.name} ({material.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="input-label">Qty / Produk</label>
                          <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            className="input-field"
                            value={row.quantity}
                            onChange={(event) =>
                              setBomRows((prev) =>
                                prev.map((item, rowIndex) =>
                                  rowIndex === index
                                    ? {
                                        ...item,
                                        quantity: Number(event.target.value) || 0,
                                      }
                                    : item
                                )
                              )
                            }
                          />
                        </div>

                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() =>
                            setBomRows((prev) =>
                              prev.length === 1
                                ? [{ ...EMPTY_BOM_ROW }]
                                : prev.filter((_, rowIndex) => rowIndex !== index)
                            )
                          }
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setBomRows((prev) => [...prev, { ...EMPTY_BOM_ROW }])}
                    >
                      + Tambah Bahan
                    </button>
                    <span className="badge badge-info">
                      {rawMaterials.length} bahan baku siap dipakai
                    </span>
                  </div>

                  <div
                    className="card"
                    style={{
                      padding: "18px",
                      display: "grid",
                      gap: "16px",
                      background: "hsl(var(--bg-base) / 0.35)",
                      borderColor: "hsl(var(--primary) / 0.25)",
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: "16px" }}>Kalkulator HPP, Yield, dan Harga Saran</h4>
                      <p
                        style={{
                          marginTop: "6px",
                          fontSize: "13px",
                          color: "hsl(var(--text-secondary))",
                        }}
                      >
                        HPP per unit = total biaya batch / yield. Harga jual saran = HPP / (100% -
                        n%), dengan n sebagai persentase keuntungan.
                      </p>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: "16px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "10px",
                          }}
                        >
                          <span className="input-label" style={{ marginBottom: 0 }}>
                            Yield per Batch
                          </span>
                          <span className="badge badge-primary">{yieldUnits} unit</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="24"
                          step="1"
                          value={yieldUnits}
                          onChange={(event) =>
                            setYieldUnits(Number(event.target.value) || DEFAULT_YIELD_UNITS)
                          }
                          style={{ width: "100%", accentColor: "hsl(var(--primary))" }}
                        />
                        <p
                          style={{
                            marginTop: "8px",
                            fontSize: "12px",
                            color: "hsl(var(--text-secondary))",
                          }}
                        >
                          Geser untuk membagi biaya satu batch resep menjadi beberapa unit jual.
                        </p>
                      </div>

                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "10px",
                          }}
                        >
                          <span className="input-label" style={{ marginBottom: 0 }}>
                            Margin Keuntungan
                          </span>
                          <span className="badge badge-success">{marginPercent}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="80"
                          step="5"
                          value={marginPercent}
                          onChange={(event) =>
                            setMarginPercent(
                              Number(event.target.value) || DEFAULT_MARGIN_PERCENT
                            )
                          }
                          style={{ width: "100%", accentColor: "hsl(var(--success))" }}
                        />
                        <p
                          style={{
                            marginTop: "8px",
                            fontSize: "12px",
                            color: "hsl(var(--text-secondary))",
                          }}
                        >
                          Rumus harga jual: HPP / (100% - {marginPercent}%).
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "14px",
                      }}
                    >
                      <div className="stat-card" style={{ padding: "16px" }}>
                        <span style={statLabelStyle}>Biaya Batch</span>
                        <span className="stat-value" style={{ fontSize: "24px" }}>
                          {formatRupiahFull(totalBatchCost)}
                        </span>
                        <span style={statHintStyle}>Jumlah biaya semua bahan terpilih</span>
                      </div>

                      <div className="stat-card" style={{ padding: "16px" }}>
                        <span style={statLabelStyle}>HPP per Unit</span>
                        <span className="stat-value" style={{ fontSize: "24px" }}>
                          {calculatedHpp !== null ? formatRupiahFull(calculatedHpp) : "-"}
                        </span>
                        <span style={statHintStyle}>
                          {calculatedHpp !== null
                            ? `${formatRupiahFull(totalBatchCost)} / ${yieldUnits} unit`
                            : "Lengkapi bahan baku untuk menghitung HPP"}
                        </span>
                      </div>

                      <div className="stat-card" style={{ padding: "16px" }}>
                        <span style={statLabelStyle}>Harga Jual Saran</span>
                        <span className="stat-value" style={{ fontSize: "24px" }}>
                          {suggestedSellingPrice !== null
                            ? formatRupiahFull(suggestedSellingPrice)
                            : "-"}
                        </span>
                        <span style={statHintStyle}>
                          {calculatedHpp !== null
                            ? `${formatRupiahFull(calculatedHpp)} / (100% - ${marginPercent}%)`
                            : "Butuh HPP untuk hitung harga saran"}
                        </span>
                      </div>

                      <div className="stat-card" style={{ padding: "16px" }}>
                        <span style={statLabelStyle}>Laba per Unit</span>
                        <span className="stat-value" style={{ fontSize: "24px" }}>
                          {suggestedProfitPerUnit !== null
                            ? formatRupiahFull(suggestedProfitPerUnit)
                            : "-"}
                        </span>
                        <span style={statHintStyle}>Selisih harga jual saran dengan HPP</span>
                      </div>
                    </div>

                    {bomCostRows.length > 0 ? (
                      <div style={{ display: "grid", gap: "8px" }}>
                        <span className="input-label" style={{ marginBottom: 0 }}>
                          Rincian Perhitungan Bahan
                        </span>
                        <div style={{ display: "grid", gap: "8px" }}>
                          {bomCostRows.map((row, index) => (
                            <div
                              key={`${row.rawMaterialId}-${index}`}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "12px",
                                padding: "10px 12px",
                                borderRadius: "var(--radius-sm)",
                                background: "hsl(var(--bg-elevated) / 0.45)",
                                fontSize: "13px",
                              }}
                            >
                              <span style={{ color: "hsl(var(--text-secondary))" }}>
                                {row.rawMaterialName}:{" "}
                                {row.quantity.toLocaleString("id-ID", {
                                  maximumFractionDigits: 3,
                                })}{" "}
                                {row.unit} x {formatRupiahFull(row.costPerUnit)}
                              </span>
                              <strong>{formatRupiahFull(row.subtotal)}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={suggestedSellingPrice === null}
                        onClick={() => {
                          if (suggestedSellingPrice === null) return;
                          setForm((prev) => ({
                            ...prev,
                            price: suggestedSellingPrice,
                          }));
                        }}
                      >
                        Pakai Harga Saran
                      </button>
                      <span className="badge badge-primary">
                        HPP otomatis akan disimpan ke Cost Price saat produk dibuat
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button className="btn btn-ghost" onClick={resetCreateForm}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleSaveProduct}>
                Simpan Produk
              </button>
            </div>
          </section>
        )}

        <section className="card" style={{ padding: 0, overflow: "hidden" }}>
          {isSyncing && products.length === 0 ? (
            <div
              style={{
                padding: "28px 20px",
                borderBottom: "1px solid hsl(var(--border))",
                color: "hsl(var(--text-secondary))",
              }}
            >
              Sinkronisasi produk dan resep BoM dari server...
            </div>
          ) : null}

          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead
              style={{
                background: "hsl(var(--bg-elevated))",
                borderBottom: "1px solid hsl(var(--border))",
              }}
            >
              <tr>
                <th style={headerCellStyle}>SKU</th>
                <th style={headerCellStyle}>Nama Produk</th>
                <th style={headerCellStyle}>Kategori</th>
                <th style={headerCellStyle}>Harga</th>
                <th style={headerCellStyle}>HPP</th>
                <th style={headerCellStyle}>Stok</th>
                <th style={headerCellStyle}>BoM</th>
                <th style={headerCellStyle}>Status</th>
                <th style={{ ...headerCellStyle, textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: "30px",
                      textAlign: "center",
                      color: "hsl(var(--text-muted))",
                    }}
                  >
                    Belum ada produk. Tambahkan produk pertama untuk mulai jualan.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const bomCount = bomCountByProductId[product.localId] || 0;

                  return (
                    <tr
                      key={product.localId}
                      style={{ borderBottom: "1px solid hsl(var(--border))" }}
                    >
                      <td style={bodyCellStyle}>{product.sku || "-"}</td>
                      <td style={{ padding: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div 
                              style={{ 
                                width: "40px", 
                                height: "40px", 
                                borderRadius: "8px", 
                                background: "hsl(var(--bg-elevated))", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center",
                                overflow: "hidden",
                                border: "1px solid hsl(var(--border))",
                                flexShrink: 0
                              }}
                            >
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <span style={{ fontSize: "18px", opacity: 0.3 }}>📦</span>
                              )}
                            </div>
                            <div style={{ display: "grid", gap: "2px" }}>
                              <div style={{ fontSize: "14px", fontWeight: 700, color: "hsl(var(--text-primary))" }}>
                                {product.name}
                              </div>
                              {!product.showInPos && (
                                <div style={{ marginTop: "4px" }}>
                                  <span className="badge badge-warning" style={{ fontSize: "10px", padding: "2px 6px" }}>
                                    Tersembunyi di POS
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                      </td>
                      <td style={{ ...bodyCellStyle, color: "hsl(var(--text-secondary))" }}>
                        {product.category || "-"}
                      </td>
                      <td style={bodyCellStyle}>{formatRupiahFull(product.price)}</td>
                      <td style={bodyCellStyle}>{formatRupiahFull(product.costPrice)}</td>
                      <td style={bodyCellStyle}>
                        {product.stock}{" "}
                        <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                          {product.unit}
                        </span>
                      </td>
                      <td style={bodyCellStyle}>
                        {bomCount > 0 ? (
                          <>
                            <span className="badge badge-info">BoM Aktif</span>
                            <div
                              style={{
                                marginTop: "6px",
                                fontSize: "12px",
                                color: "hsl(var(--text-secondary))",
                              }}
                            >
                              {bomCount} bahan baku / resep
                            </div>
                          </>
                        ) : product.hasBoM ? (
                          <>
                            <span className="badge badge-warning">BoM Kosong</span>
                            <div
                              style={{
                                marginTop: "6px",
                                fontSize: "12px",
                                color: "hsl(var(--text-secondary))",
                              }}
                            >
                              Flag aktif, resep belum diisi
                            </div>
                          </>
                        ) : (
                          <span style={{ color: "hsl(var(--text-muted))" }}>-</span>
                        )}
                      </td>
                      <td style={bodyCellStyle}>
                        <span
                          className={`badge ${
                            product.isActive ? "badge-success" : "badge-error"
                          }`}
                        >
                          {product.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td style={{ ...bodyCellStyle, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                           <button
                             className="btn btn-ghost btn-sm"
                             onClick={() => toggleStatus(product)}
                           >
                             {product.isActive ? "Diaktifkan" : "Berhenti"}
                           </button>
                           <button
                             className="btn btn-primary btn-sm"
                             style={{ padding: "6px 10px" }}
                             onClick={() => startEditProduct(product)}
                           >
                             E
                           </button>
                           <button
                             className="btn btn-danger btn-sm"
                             style={{ padding: "6px 10px" }}
                             onClick={() => handleDeleteProduct(product)}
                           >
                             X
                           </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      </div>
    </DashboardLayout>
  );
}

const statLabelStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "hsl(var(--text-secondary))",
  fontWeight: 600,
};

const statHintStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "hsl(var(--text-muted))",
};

const headerCellStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: "14px",
  fontWeight: 600,
  color: "hsl(var(--text-secondary))",
};

const bodyCellStyle: React.CSSProperties = {
  padding: "16px",
  fontSize: "14px",
};
