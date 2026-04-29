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
  type LocalRawMaterial,
} from "@/lib/db";
import { formatRupiahFull, generateUUID } from "@/lib/utils";

interface RawMaterialFormState {
  name: string;
  unit: string;
  stock: number;
  costPerUnit: number;
  minStock: number;
}

const INITIAL_FORM: RawMaterialFormState = {
  name: "",
  unit: "gr",
  stock: 0,
  costPerUnit: 0,
  minStock: 0,
};

// ============================================================
// MANAJEMEN BAHAN BAKU (Offline-Ready)
// ============================================================

export default function InventoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSyncing } = useInitialSync();

  const rawMaterials = useLiveQuery(() => getDb().rawMaterials.toArray()) || [];

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RawMaterialFormState>(INITIAL_FORM);

  const lowStockMaterials = rawMaterials.filter(
    (material) => material.stock <= material.minStock
  );
  const totalInventoryValue = rawMaterials.reduce(
    (total, material) => total + material.stock * material.costPerUnit,
    0
  );

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setShowCreateForm(false);
  };

  const startEditMaterial = (material: LocalRawMaterial) => {
    setEditingId(material.localId);
    setForm({
      name: material.name,
      unit: material.unit,
      stock: material.stock,
      costPerUnit: material.costPerUnit,
      minStock: material.minStock,
    });
    setShowCreateForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteMaterial = async (material: LocalRawMaterial) => {
    if (!confirm(`Yakin ingin menghapus bahan baku "${material.name}"? Jika dipakai di BoM, produk bersangkutan mungkin kehilangan komponen.`)) return;

    try {
      const db = getDb();
      await db.transaction("rw", [db.rawMaterials, db.billOfMaterials, db.syncQueue], async () => {
        const bomsToDelete = await db.billOfMaterials.toArray().then(boms => boms.filter(b => b.rawMaterialId === material.localId));
        if (bomsToDelete.length > 0) {
          await db.billOfMaterials.bulkDelete(bomsToDelete.map((b) => b.id));
          for (const b of bomsToDelete) {
            await enqueueSyncOp("billOfMaterials", b.id, "DELETE", { deleted: true });
          }
        }
        await db.rawMaterials.delete(material.localId);
        await enqueueSyncOp("rawMaterials", material.localId, "DELETE", { deleted: true });
      });
      toast("Bahan baku dihapus", "success");
    } catch {
      toast("Gagal menghapus bahan baku", "error");
    }
  };

  const handleCreateMaterial = async () => {
    if (!user?.tenantId) {
      toast("Sesi tenant tidak ditemukan", "error");
      return;
    }

    if (!form.name.trim()) {
      toast("Nama bahan baku wajib diisi", "warning");
      return;
    }

    if (!form.unit.trim()) {
      toast("Satuan bahan baku wajib diisi", "warning");
      return;
    }

    if (form.stock < 0 || form.minStock < 0) {
      toast("Stok dan minimum stok tidak boleh negatif", "warning");
      return;
    }

    if (form.costPerUnit < 0) {
      toast("Harga pokok per satuan tidak boleh negatif", "warning");
      return;
    }

    const normalizedName = form.name.trim().toLowerCase();
    const normalizedUnit = form.unit.trim().toLowerCase();
    const duplicateMaterial = rawMaterials.some(
      (material) =>
        material.name.trim().toLowerCase() === normalizedName &&
        material.unit.trim().toLowerCase() === normalizedUnit &&
        material.localId !== editingId
    );

    if (duplicateMaterial) {
      toast("Bahan baku dengan nama dan satuan yang sama sudah ada", "warning");
      return;
    }

    try {
      const db = getDb();
      const localId = editingId || generateUUID();
      const updatedAt = Date.now();
      
      const existingMaterial = editingId ? rawMaterials.find(m => m.localId === editingId) : null;

      const newMaterial: LocalRawMaterial = {
        id: existingMaterial?.id || localId,
        localId,
        tenantId: user.tenantId,
        name: form.name.trim(),
        unit: form.unit.trim(),
        stock: form.stock,
        costPerUnit: form.costPerUnit,
        minStock: form.minStock,
        syncStatus: "PENDING",
        updatedAt,
      };

      await db.transaction("rw", [db.rawMaterials, db.syncQueue], async () => {
        await db.rawMaterials.put(newMaterial);
        await enqueueSyncOp("rawMaterials", localId, editingId ? "UPDATE" : "CREATE", newMaterial);
      });

      toast(editingId ? `Bahan baku ${newMaterial.name} diperbarui` : `Bahan baku ${newMaterial.name} ditambahkan`, "success");
      resetForm();
    } catch {
      toast(editingId ? "Gagal memperbarui bahan baku" : "Gagal menambahkan bahan baku", "error");
    }
  };

  return (
    <DashboardLayout title="Bahan Baku (Inventory)">
      <div style={{ display: "grid", gap: "24px" }}>
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
          }}
        >
          <div className="stat-card">
            <span style={statLabelStyle}>Total Bahan</span>
            <span className="stat-value">{rawMaterials.length}</span>
            <span style={statHintStyle}>Master bahan baku yang tersimpan lokal</span>
          </div>

          <div className="stat-card">
            <span style={statLabelStyle}>Stok Aman</span>
            <span className="stat-value">
              {rawMaterials.length - lowStockMaterials.length}
            </span>
            <span style={statHintStyle}>
              {lowStockMaterials.length} bahan masuk alert minimum
            </span>
          </div>

          <div className="stat-card">
            <span style={statLabelStyle}>Perlu Restock</span>
            <span className="stat-value">{lowStockMaterials.length}</span>
            <span style={statHintStyle}>Pantau bahan baku yang hampir habis</span>
          </div>

          <div className="stat-card" style={{ background: "var(--gradient-primary)" }}>
            <span style={{ ...statLabelStyle, color: "white", opacity: 0.8 }}>
              Nilai Persediaan
            </span>
            <span className="stat-value" style={{ color: "white", WebkitTextFillColor: "white" }}>
              {formatRupiahFull(totalInventoryValue)}
            </span>
            <span style={{ ...statHintStyle, color: "white", opacity: 0.82 }}>
              Estimasi berbasis stok x HPP per satuan
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
            <h2 style={{ fontSize: "18px" }}>Daftar Bahan Baku</h2>
            <p style={{ marginTop: "6px", fontSize: "14px", color: "hsl(var(--text-secondary))" }}>
              Tambahkan bahan baku baru untuk dipakai di inventory dan resep BoM.
            </p>
          </div>

          <button
            className={`btn ${showCreateForm ? "btn-ghost" : "btn-primary"}`}
            onClick={() => {
              if (showCreateForm) resetForm();
              else setShowCreateForm(true);
            }}
          >
            {showCreateForm ? "Tutup Form" : "+ Tambah Bahan Baku"}
          </button>
        </section>

        {showCreateForm && (
          <section className="card" style={{ display: "grid", gap: "18px" }}>
            <div>
              <h3 style={{ fontSize: "18px" }}>{editingId ? "Edit Bahan Baku" : "Bahan Baku Baru"}</h3>
              <p style={{ marginTop: "6px", fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
                Data akan langsung tersedia untuk halaman inventory dan bisa dipakai oleh produk BoM.
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
                <label className="input-label" htmlFor="material-name">
                  Nama Bahan
                </label>
                <input
                  id="material-name"
                  className="input-field"
                  placeholder="Contoh: Bubuk Kopi"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </div>

              <div>
                <label className="input-label" htmlFor="material-unit">
                  Satuan
                </label>
                <input
                  id="material-unit"
                  className="input-field"
                  placeholder="gr / ml / pcs"
                  value={form.unit}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, unit: event.target.value }))
                  }
                />
              </div>

              <div>
                <label className="input-label" htmlFor="material-stock">
                  Stok Awal
                </label>
                <input
                  id="material-stock"
                  type="number"
                  min="0"
                  step="0.001"
                  className="input-field"
                  value={form.stock === 0 ? "" : form.stock}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      stock: Number(event.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div>
                <label className="input-label" htmlFor="material-min-stock">
                  Minimum Stok
                </label>
                <input
                  id="material-min-stock"
                  type="number"
                  min="0"
                  step="0.001"
                  className="input-field"
                  value={form.minStock === 0 ? "" : form.minStock}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      minStock: Number(event.target.value) || 0,
                    }))
                  }
                />
              </div>

              <CurrencyInput
                id="material-cost"
                label="Harga Pokok per Satuan"
                value={form.costPerUnit}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, costPerUnit: value }))
                }
                placeholder="250"
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" }}>
              <button className="btn btn-ghost" onClick={resetForm}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleCreateMaterial}>
                Simpan Bahan Baku
              </button>
            </div>
          </section>
        )}

        <section className="card" style={{ padding: 0, overflow: "hidden" }}>
          {isSyncing && rawMaterials.length === 0 ? (
            <div
              style={{
                padding: "28px 20px",
                borderBottom: "1px solid hsl(var(--border))",
                color: "hsl(var(--text-secondary))",
              }}
            >
              Sinkronisasi bahan baku dari server...
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
                <th style={headerCellStyle}>Nama Bahan</th>
                <th style={headerCellStyle}>Sisa Stok</th>
                <th style={headerCellStyle}>Satuan</th>
                <th style={headerCellStyle}>Minimum</th>
                <th style={headerCellStyle}>Harga Pokok / Satuan</th>
                <th style={headerCellStyle}>Status</th>
                <th style={{ ...headerCellStyle, textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rawMaterials.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "30px",
                      textAlign: "center",
                      color: "hsl(var(--text-muted))",
                    }}
                  >
                    Belum ada data bahan baku.
                  </td>
                </tr>
              ) : (
                rawMaterials.map((material) => {
                  const isLow = material.stock <= material.minStock;
                  return (
                    <tr
                      key={material.localId}
                      style={{ borderBottom: "1px solid hsl(var(--border))" }}
                    >
                      <td style={{ ...bodyCellStyle, fontWeight: 600 }}>
                        {material.name}
                      </td>
                      <td
                        style={{
                          ...bodyCellStyle,
                          color: isLow ? "hsl(var(--error))" : "inherit",
                          fontWeight: isLow ? 700 : 400,
                        }}
                      >
                        {material.stock.toLocaleString("id-ID", {
                          maximumFractionDigits: 3,
                        })}
                      </td>
                      <td style={{ ...bodyCellStyle, color: "hsl(var(--text-secondary))" }}>
                        {material.unit}
                      </td>
                      <td style={bodyCellStyle}>
                        {material.minStock.toLocaleString("id-ID", {
                          maximumFractionDigits: 3,
                        })}
                      </td>
                      <td style={bodyCellStyle}>
                        {formatRupiahFull(material.costPerUnit)}
                      </td>
                      <td style={bodyCellStyle}>
                        {isLow ? (
                          <>
                            <span className="badge badge-error">Stok Menipis</span>
                            <div
                              style={{
                                marginTop: "6px",
                                fontSize: "12px",
                                color: "hsl(var(--text-secondary))",
                              }}
                            >
                              Segera restock untuk jaga operasional
                            </div>
                          </>
                        ) : (
                          <span className="badge badge-success">Aman</span>
                        )}
                      </td>
                      <td style={{ ...bodyCellStyle, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                           <button
                             className="btn btn-primary btn-sm"
                             style={{ padding: "6px 10px" }}
                             onClick={() => startEditMaterial(material)}
                           >
                             E
                           </button>
                           <button
                             className="btn btn-danger btn-sm"
                             style={{ padding: "6px 10px" }}
                             onClick={() => handleDeleteMaterial(material)}
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
