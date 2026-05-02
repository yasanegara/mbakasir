"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { useAuth, useToast } from "@/contexts/AppProviders";
import {
  enqueueSyncOp,
  getDb,
  type LocalRawMaterial,
  type LocalShoppingItem,
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

export default function InventoryTab() {
  const { user } = useAuth();
  const { toast } = useToast();

  const rawMaterials = useLiveQuery(
    () => (user?.tenantId ? getDb().rawMaterials.where("tenantId").equals(user.tenantId).toArray() : []),
    [user?.tenantId]
  ) || [];

  const billOfMaterials = useLiveQuery(() => {
    if (!user?.tenantId) return [];
    return getDb().billOfMaterials.toArray(); // Simplifikasi: BoM biasanya sedikit
  }, [user?.tenantId]) || [];

  const storeProfile = useLiveQuery(async () => {
    const db = getDb();
    const pDefault = await db.storeProfile.get("default");
    if (!user?.tenantId) return pDefault;
    const pTenant = await db.storeProfile.get(user.tenantId);
    return pTenant || pDefault;
  }, [user?.tenantId]);

  const products = useLiveQuery(() => {
    if (!user?.tenantId) return [];
    return getDb().products.where("tenantId").equals(user.tenantId).toArray();
  }, [user?.tenantId]) || [];

  const bomCountByProductId = billOfMaterials.reduce<Record<string, number>>(
    (acc, bom) => {
      acc[bom.productId] = (acc[bom.productId] || 0) + 1;
      return acc;
    },
    {}
  );

  const productsWithBoM = products.filter(
    (product) => (bomCountByProductId[product.localId] || 0) > 0
  ).length;

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
    if (!confirm(`Yakin ingin menghapus bahan baku "${material.name}"?`)) return;

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
    if (!user?.tenantId) return;
    const tenantId = user.tenantId;

    if (!form.name.trim()) {
      toast("Nama bahan baku wajib diisi", "warning");
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
        tenantId,
        name: form.name.trim(),
        unit: form.unit.trim(),
        stock: form.stock,
        costPerUnit: form.costPerUnit,
        minStock: form.minStock,
        syncStatus: "PENDING",
        updatedAt,
      };

      // Hitung delta stok yang ditambahkan (untuk keperluan akuntansi roll-forward)
      // Setiap penambahan stok bahan baku dicatat sebagai "pembelian" di shopping list
      // agar formula expectedInventory di neraca akurat.
      const prevStock = existingMaterial?.stock ?? 0;
      const stockDelta = form.stock - prevStock; // positif = penambahan, negatif = pengurangan

      await db.transaction("rw", [db.rawMaterials, db.shoppingList, db.syncQueue], async () => {
        await db.rawMaterials.put(newMaterial);
        await enqueueSyncOp("rawMaterials", localId, editingId ? "UPDATE" : "CREATE", newMaterial);

        // Catat penambahan stok sebagai entri shopping list "done" agar
        // formula roll-forward persediaan di neraca tetap akurat.
        if (stockDelta > 0 && form.costPerUnit > 0) {
          const shoppingId = generateUUID();
          const shoppingEntry: LocalShoppingItem = {
            id: shoppingId,
            tenantId,
            type: "rawMaterial",
            status: "done",
            name: form.name.trim(),
            unit: form.unit.trim(),
            qtyToBuy: stockDelta,
            costPerUnit: form.costPerUnit,
            costPrice: form.costPerUnit,
            existingLocalId: localId,
            isNew: !editingId,
            completedAt: updatedAt,
            createdAt: updatedAt,
            updatedAt,
          };
          await db.shoppingList.add(shoppingEntry);
          await enqueueSyncOp("shoppingList", shoppingId, "CREATE", shoppingEntry);
        }
      });

      toast(editingId ? `Bahan baku diperbarui` : `Bahan baku ditambahkan`, "success");
      resetForm();
    } catch {
      toast("Gagal memproses bahan baku", "error");
    }
  };

  const handleGenerateDummy = async () => {
    if (!user?.tenantId) return;
    const tenantId = user.tenantId;
    if (!confirm("Generate 5 bahan baku dummy untuk testing?")) return;
    
    const dummyData = [
      { name: "Biji Kopi Arabika", unit: "gr", stock: 1000, cost: 250, min: 200 },
      { name: "Susu UHT Full Cream", unit: "ml", stock: 5000, cost: 20, min: 1000 },
      { name: "Gula Aren Cair", unit: "ml", stock: 2000, cost: 50, min: 500 },
      { name: "Bubuk Matcha", unit: "gr", stock: 500, cost: 800, min: 100 },
      { name: "Paper Cup 12oz", unit: "pcs", stock: 100, cost: 1200, min: 20 },
    ];

    try {
      const db = getDb();
      const now = Date.now();
      await db.transaction("rw", [db.rawMaterials, db.shoppingList, db.syncQueue], async () => {
        for (const item of dummyData) {
          const localId = generateUUID();
          const material: LocalRawMaterial = {
            id: localId,
            localId,
            tenantId,
            name: item.name,
            unit: item.unit,
            stock: item.stock,
            costPerUnit: item.cost,
            minStock: item.min,
            syncStatus: "PENDING",
            updatedAt: now,
          };
          await db.rawMaterials.add(material);
          await enqueueSyncOp("rawMaterials", localId, "CREATE", material);

          // Catat sebagai pembelian di shopping list agar terdeteksi di neraca
          const shoppingId = generateUUID();
          const shoppingEntry: LocalShoppingItem = {
            id: shoppingId,
            tenantId,
            type: "rawMaterial",
            status: "done",
            name: item.name,
            unit: item.unit,
            qtyToBuy: item.stock,
            costPerUnit: item.cost,
            costPrice: item.cost,
            existingLocalId: localId,
            isNew: true,
            completedAt: now,
            createdAt: now,
            updatedAt: now,
          };
          await db.shoppingList.add(shoppingEntry);
          await enqueueSyncOp("shoppingList", shoppingId, "CREATE", shoppingEntry);
        }
      });
      toast("5 Bahan baku dummy berhasil ditambahkan!", "success");
    } catch {
      toast("Gagal generate bahan baku dummy", "error");
    }
  };

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
        <div className="stat-card">
          <span style={statLabelStyle}>Total Bahan</span>
          <span className="stat-value">{rawMaterials.length}</span>
        </div>
        <div className="stat-card">
          <span style={statLabelStyle}>Perlu Restock</span>
          <span className="stat-value">{lowStockMaterials.length}</span>
        </div>
        <div className="stat-card" style={{ background: "var(--gradient-primary)" }}>
          <span style={{ ...statLabelStyle, color: "white", opacity: 0.8 }}>Nilai Persediaan Bahan</span>
          <span className="stat-value" style={{ color: "white", WebkitTextFillColor: "white" }}>
            {formatRupiahFull(totalInventoryValue)}
          </span>
        </div>
        <div className="stat-card">
          <span style={statLabelStyle}>Resep BoM Aktif</span>
          <span className="stat-value">{productsWithBoM}</span>
          <span style={statHintStyle}>{billOfMaterials.length} item bahan di resep</span>
        </div>
      </section>

      <section className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: "18px" }}>Kelola Bahan Baku</h2>
          <p style={{ marginTop: "6px", fontSize: "14px", color: "hsl(var(--text-secondary))" }}>Tambahkan bahan baku untuk resep BoM.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-ghost" onClick={handleGenerateDummy} title="Generate Bahan Contoh">
            🪄 Dummy Bahan
          </button>
          <button 
            className={`btn ${showCreateForm ? "btn-ghost" : "btn-primary"}`} 
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={storeProfile?.setupType !== "MIGRATE"}
            title={storeProfile?.setupType !== "MIGRATE" ? "Gunakan Daftar Belanja untuk merestock bahan baku jika tidak dalam mode migrasi awal." : "Tambah bahan baku awal (khusus masa migrasi)."}
            style={storeProfile?.setupType !== "MIGRATE" ? { opacity: 0.5, cursor: "not-allowed" } : {}}
          >
            {showCreateForm ? "Tutup Form" : "+ Tambah Bahan"}
          </button>
        </div>
      </section>

      {showCreateForm && (
        <section className="card" style={{ display: "grid", gap: "18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div>
              <label className="input-label">Nama Bahan</label>
              <input className="input-field" placeholder="Contoh: Bubuk Kopi" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <label className="input-label">Satuan</label>
              <input className="input-field" placeholder="gr / ml / pcs" value={form.unit} onChange={(e) => setForm(prev => ({ ...prev, unit: e.target.value }))} />
            </div>
            <div>
              <label className="input-label">Stok Awal</label>
              <input type="number" className="input-field" value={form.stock || ""} placeholder="0" onChange={(e) => setForm(prev => ({ ...prev, stock: Number(e.target.value) || 0 }))} />
            </div>
            <CurrencyInput label="Harga Pokok / Satuan" value={form.costPerUnit} onChange={(val) => setForm(prev => ({ ...prev, costPerUnit: val }))} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button className="btn btn-ghost" onClick={resetForm}>Batal</button>
            <button className="btn btn-primary" onClick={handleCreateMaterial}>Simpan Bahan</button>
          </div>
        </section>
      )}

      <section className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border))" }}>
            <tr>
              <th style={headerCellStyle}>Nama Bahan</th>
              <th style={headerCellStyle}>Stok</th>
              <th style={headerCellStyle}>Satuan</th>
              <th style={headerCellStyle}>HPP / Satuan</th>
              <th style={{ ...headerCellStyle, textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rawMaterials.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "hsl(var(--text-muted))" }}>Belum ada data.</td></tr>
            ) : (
              rawMaterials.map((m) => (
                <tr key={m.localId} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                  <td style={{ ...bodyCellStyle, fontWeight: 600 }}>{m.name}</td>
                  <td style={{ ...bodyCellStyle, color: m.stock <= m.minStock ? "hsl(var(--error))" : "inherit" }}>{m.stock}</td>
                  <td style={bodyCellStyle}>{m.unit}</td>
                  <td style={bodyCellStyle}>{formatRupiahFull(m.costPerUnit)}</td>
                  <td style={{ ...bodyCellStyle, textAlign: "right" }}>
                    <button className="btn btn-primary btn-sm" onClick={() => startEditMaterial(m)}>E</button>
                    <button className="btn btn-danger btn-sm" style={{ marginLeft: "8px" }} onClick={() => handleDeleteMaterial(m)}>X</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

const statLabelStyle: React.CSSProperties = { fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 };
const statHintStyle: React.CSSProperties = { fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "4px", display: "block" };
const headerCellStyle: React.CSSProperties = { padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" };
const bodyCellStyle: React.CSSProperties = { padding: "16px", fontSize: "14px" };
