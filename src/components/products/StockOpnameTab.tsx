"use client";

import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import BarcodeScanner from "@/components/common/BarcodeScanner";
import { useAuth, useToast } from "@/contexts/AppProviders";
import {
  enqueueSyncOp,
  getDb,
  type LocalPosTerminal,
  type LocalProduct,
  type LocalProductAssignment,
  type LocalRawMaterial,
} from "@/lib/db";
import { buildTerminalNameById } from "@/lib/inventory";

type OpnameEntityType =
  | "product-central"
  | "product-terminal"
  | "raw-material";

interface OpnameItem {
  key: string;
  entityType: OpnameEntityType;
  entityId: string;
  productId?: string;
  sku?: string;
  name: string;
  locationLabel: string;
  unit: string;
  systemStock: number;
  physicalStock: number;
}

function buildInitialOpnameItems(
  products: LocalProduct[],
  rawMaterials: LocalRawMaterial[],
  productAssignments: LocalProductAssignment[],
  posTerminals: LocalPosTerminal[]
): OpnameItem[] {
  const terminalNameById = buildTerminalNameById(posTerminals);

  const productRows = products
    .flatMap<OpnameItem>((product) => {
      const centralRow: OpnameItem = {
        key: `product-central:${product.localId}`,
        entityType: "product-central",
        entityId: product.localId,
        productId: product.localId,
        sku: product.sku,
        name: product.name,
        locationLabel: "Gudang Pusat",
        unit: product.unit,
        systemStock: product.stock,
        physicalStock: product.stock,
      };

      const terminalRows = productAssignments
        .filter((assignment) => assignment.productId === product.localId)
        .map<OpnameItem>((assignment) => ({
          key: `product-terminal:${assignment.id}`,
          entityType: "product-terminal",
          entityId: assignment.id,
          productId: product.localId,
          sku: product.sku,
          name: product.name,
          locationLabel:
            terminalNameById.get(assignment.terminalId) || "Terminal POS",
          unit: product.unit,
          systemStock: assignment.stock,
          physicalStock: assignment.stock,
        }));

      return [centralRow, ...terminalRows];
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  const materialRows = rawMaterials
    .map<OpnameItem>((material) => ({
      key: `raw-material:${material.localId}`,
      entityType: "raw-material",
      entityId: material.localId,
      name: material.name,
      locationLabel: "Stok Bahan Baku",
      unit: material.unit,
      systemStock: material.stock,
      physicalStock: material.stock,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return [...productRows, ...materialRows];
}

export default function StockOpnameTab() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const { toast } = useToast();

  const products = useLiveQuery<LocalProduct[]>(
    () =>
      tenantId
        ? getDb().products.where("tenantId").equals(tenantId).toArray()
        : [],
    [tenantId]
  ) ?? [];

  const rawMaterials = useLiveQuery<LocalRawMaterial[]>(
    () =>
      tenantId
        ? getDb().rawMaterials.where("tenantId").equals(tenantId).toArray()
        : [],
    [tenantId]
  ) ?? [];

  const posTerminals = useLiveQuery<LocalPosTerminal[]>(
    () =>
      tenantId
        ? getDb().posTerminals.where("tenantId").equals(tenantId).toArray()
        : [],
    [tenantId]
  ) ?? [];

  const productAssignments = useLiveQuery<LocalProductAssignment[]>(
    async () => {
      if (!tenantId) return [];
      const productIds = products.map((product) => product.localId);
      if (productIds.length === 0) return [];
      return getDb().productAssignments.where("productId").anyOf(productIds).toArray();
    },
    [tenantId, products.length]
  ) ?? [];

  const initialOpnameItems = useMemo(
    () =>
      buildInitialOpnameItems(
        products,
        rawMaterials,
        productAssignments,
        posTerminals
      ),
    [posTerminals, productAssignments, products, rawMaterials]
  );

  const [opnameItems, setOpnameItems] = useState<OpnameItem[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [isOpnameActive, setIsOpnameActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewFilter, setViewFilter] = useState<
    "all" | "products" | "terminals" | "materials"
  >("all");

  const activeItems = isOpnameActive ? opnameItems : initialOpnameItems;

  const differenceCount = useMemo(
    () =>
      activeItems.filter((item) => item.physicalStock !== item.systemStock).length,
    [activeItems]
  );

  const handleStartOpname = () => {
    setOpnameItems(initialOpnameItems);
    setIsOpnameActive(true);
    toast("Opname stok semua posisi dimulai.", "info");
  };

  const handleUpdatePhysical = (key: string, value: number) => {
    setOpnameItems((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, physicalStock: Math.max(0, value) } : item
      )
    );
  };

  const handleScan = (code: string) => {
    const item = activeItems.find(
      (entry) =>
        entry.entityType === "product-central" &&
        entry.sku === code.toUpperCase()
    );

    if (item) {
      handleUpdatePhysical(item.key, item.physicalStock + 1);
      toast(`+1 ${item.name} ke Gudang Pusat`, "success");
    } else {
      toast(
        `SKU ${code} tidak ditemukan di gudang pusat. Untuk stok terminal atau bahan baku, edit manual.`,
        "warning"
      );
    }
  };

  const handleFinalize = async () => {
    if (!confirm("Update semua posisi stok sistem sesuai data fisik?")) return;

    try {
      const db = getDb();
      const now = Date.now();

      await db.transaction(
        "rw",
        [db.products, db.productAssignments, db.rawMaterials, db.syncQueue],
        async () => {
          for (const item of opnameItems) {
            if (item.physicalStock === item.systemStock) continue;

            if (item.entityType === "product-central") {
              const product = products.find(
                (entry) => entry.localId === item.entityId
              );
              if (!product) continue;

              const updatedProduct: LocalProduct = {
                ...product,
                stock: item.physicalStock,
                updatedAt: now,
                syncStatus: "PENDING",
              };

              await db.products.put(updatedProduct);
              await enqueueSyncOp(
                "products",
                updatedProduct.localId,
                "UPDATE",
                updatedProduct
              );
              continue;
            }

            if (item.entityType === "product-terminal") {
              const assignment = productAssignments.find(
                (entry) => entry.id === item.entityId
              );
              if (!assignment) continue;

              const updatedAssignment: LocalProductAssignment = {
                ...assignment,
                stock: item.physicalStock,
              };

              await db.productAssignments.put(updatedAssignment);
              await enqueueSyncOp(
                "productAssignments",
                updatedAssignment.id,
                "UPDATE",
                updatedAssignment
              );
              continue;
            }

            const material = rawMaterials.find(
              (entry) => entry.localId === item.entityId
            );
            if (!material) continue;

            const updatedMaterial: LocalRawMaterial = {
              ...material,
              stock: item.physicalStock,
              updatedAt: now,
              syncStatus: "PENDING",
            };

            await db.rawMaterials.put(updatedMaterial);
            await enqueueSyncOp(
              "rawMaterials",
              updatedMaterial.localId,
              "UPDATE",
              updatedMaterial
            );
          }
        }
      );

      setIsOpnameActive(false);
      setOpnameItems([]);
      toast("Posisi stok berhasil diperbarui!", "success");
    } catch {
      toast("Gagal menyimpan perubahan posisi stok.", "error");
    }
  };

  const filteredItems = activeItems.filter((item) => {
    const normalizedQuery = searchQuery.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.locationLabel.toLowerCase().includes(normalizedQuery) ||
      (item.sku && item.sku.toLowerCase().includes(normalizedQuery));

    const matchesView =
      viewFilter === "all" ||
      (viewFilter === "products" && item.entityType === "product-central") ||
      (viewFilter === "terminals" && item.entityType === "product-terminal") ||
      (viewFilter === "materials" && item.entityType === "raw-material");

    return matchesSearch && matchesView;
  });

  const productCentralCount = activeItems.filter(
    (item) => item.entityType === "product-central"
  ).length;
  const productTerminalCount = activeItems.filter(
    (item) => item.entityType === "product-terminal"
  ).length;
  const rawMaterialCount = activeItems.filter(
    (item) => item.entityType === "raw-material"
  ).length;

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
        }}
      >
        <div className="stat-card">
          <span style={statLabelStyle}>Produk Gudang</span>
          <span className="stat-value">{productCentralCount}</span>
        </div>
        <div className="stat-card">
          <span style={statLabelStyle}>Posisi Terminal POS</span>
          <span className="stat-value">{productTerminalCount}</span>
        </div>
        <div className="stat-card">
          <span style={statLabelStyle}>Bahan Baku</span>
          <span className="stat-value">{rawMaterialCount}</span>
        </div>
        <div className="stat-card" style={{ background: "var(--gradient-primary)" }}>
          <span style={{ ...statLabelStyle, color: "white", opacity: 0.82 }}>
            Item Berselisih
          </span>
          <span
            className="stat-value"
            style={{ color: "white", WebkitTextFillColor: "white" }}
          >
            {differenceCount}
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
          <h2 style={{ fontSize: "18px" }}>Audit Posisi Stok</h2>
          <p
            style={{ fontSize: "14px", color: "hsl(var(--text-secondary))" }}
          >
            Koreksi stok gudang pusat, stok terminal POS, dan bahan baku dalam
            satu sesi opname.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {!isOpnameActive ? (
            <button className="btn btn-primary" onClick={handleStartOpname}>
              ▶️ Mulai Opname
            </button>
          ) : (
            <>
              <button
                className="btn btn-outline"
                onClick={() => setShowScanner(true)}
              >
                📷 Scan Gudang
              </button>
              <button className="btn btn-primary" onClick={handleFinalize}>
                💾 Simpan Perubahan
              </button>
            </>
          )}
        </div>
      </section>

      <section className="card" style={{ display: "grid", gap: "12px" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {([
            { id: "all", label: "Semua Posisi" },
            { id: "products", label: "Produk Gudang" },
            { id: "terminals", label: "Terminal POS" },
            { id: "materials", label: "Bahan Baku" },
          ] as const).map((filter) => (
            <button
              key={filter.id}
              className={`btn btn-sm ${
                viewFilter === filter.id ? "btn-primary" : "btn-ghost"
              }`}
              onClick={() => setViewFilter(filter.id)}
              style={{ borderRadius: "999px" }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: "8px" }}>
          <input
            className="input-field"
            placeholder="🔍 Cari nama item, SKU, atau lokasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
            Scan barcode hanya menambah hitung gudang pusat. Posisi terminal POS
            dan bahan baku tetap bisa diedit manual.
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}
          >
            <thead
              style={{
                background: "hsl(var(--bg-elevated))",
                borderBottom: "1px solid hsl(var(--border))",
              }}
            >
              <tr>
                <th style={cellStyle}>Item</th>
                <th style={cellStyle}>Lokasi</th>
                <th style={cellStyle}>Stok Sistem</th>
                <th style={cellStyle}>Stok Fisik</th>
                <th style={cellStyle}>Selisih</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: "28px",
                      textAlign: "center",
                      color: "hsl(var(--text-muted))",
                    }}
                  >
                    Tidak ada item yang cocok.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const difference = item.physicalStock - item.systemStock;

                  return (
                    <tr
                      key={item.key}
                      style={{ borderBottom: "1px solid hsl(var(--border))" }}
                    >
                      <td style={cellStyle}>
                        <div style={{ display: "grid", gap: "4px" }}>
                          <div style={{ fontWeight: 700 }}>{item.name}</div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "hsl(var(--text-muted))",
                            }}
                          >
                            {item.sku ? `SKU ${item.sku}` : "Tanpa SKU"}
                          </div>
                        </div>
                      </td>
                      <td style={cellStyle}>
                        <div style={{ display: "grid", gap: "6px" }}>
                          <span>{item.locationLabel}</span>
                          <span
                            className={`badge ${
                              item.entityType === "raw-material"
                                ? "badge-warning"
                                : item.entityType === "product-terminal"
                                  ? "badge-info"
                                  : "badge-success"
                            }`}
                            style={{ width: "fit-content" }}
                          >
                            {item.entityType === "raw-material"
                              ? "Bahan Baku"
                              : item.entityType === "product-terminal"
                                ? "Terminal POS"
                                : "Gudang Pusat"}
                          </span>
                        </div>
                      </td>
                      <td style={cellStyle}>
                        {item.systemStock} {item.unit}
                      </td>
                      <td style={cellStyle}>
                        <input
                          type="number"
                          min="0"
                          className="input-field"
                          style={{ width: "110px" }}
                          value={item.physicalStock}
                          onChange={(e) =>
                            handleUpdatePhysical(
                              item.key,
                              Number(e.target.value) || 0
                            )
                          }
                          disabled={!isOpnameActive}
                        />
                      </td>
                      <td style={cellStyle}>
                        <span
                          style={{
                            fontWeight: 700,
                            color:
                              difference === 0
                                ? "hsl(var(--text-muted))"
                                : difference > 0
                                  ? "hsl(var(--success))"
                                  : "hsl(var(--error))",
                          }}
                        >
                          {difference > 0 ? "+" : ""}
                          {difference} {item.unit}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showScanner && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.8)",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "hsl(var(--bg-elevated))",
              padding: "24px",
              borderRadius: "24px",
              width: "100%",
              maxWidth: "500px",
            }}
          >
            <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: "20px" }}
              onClick={() => setShowScanner(false)}
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const statLabelStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "hsl(var(--text-secondary))",
  fontWeight: 600,
};

const cellStyle: React.CSSProperties = { padding: "16px", fontSize: "14px" };
