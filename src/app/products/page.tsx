"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb, enqueueSyncOp } from "@/lib/db";
import type { LocalProduct } from "@/lib/db";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatRupiahFull, generateUUID } from "@/lib/utils";
import { useAuth, useToast } from "@/contexts/AppProviders";

// ============================================================
// MANAJEMEN PRODUK (Offline-Ready)
// ============================================================

export default function ProductsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Baca langsung dari IndexedDB supaya seketika muncul
  const products = useLiveQuery(() => getDb().products.toArray()) || [];
  
  const toggleStatus = async (p: LocalProduct) => {
    try {
      const db = getDb();
      const updated = { ...p, isActive: !p.isActive, updatedAt: Date.now() };
      await db.products.put(updated);
      await enqueueSyncOp("products", p.localId, "UPDATE", updated);
      toast(`Produk ${updated.isActive ? "diaktifkan" : "dinonaktifkan"}`, "success");
    } catch (err) {
      toast("Gagal mengubah status produk", "error");
    }
  };

  return (
    <DashboardLayout title="Manajemen Produk">
       <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2>Daftar Produk</h2>
          <button className="btn btn-primary" onClick={() => toast("Fitur tambah produk belum UI-nya", "info")}>
             + Tambah Produk
          </button>
       </div>

       <div className="card" style={{ padding: 0, overflow: "hidden" }}>
         <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border))" }}>
              <tr>
                 <th style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>SKU</th>
                 <th style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Nama Produk</th>
                 <th style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Kategori</th>
                 <th style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Harga</th>
                 <th style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Stok</th>
                 <th style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Status</th>
                 <th style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))", textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                   <td colSpan={7} style={{ padding: "30px", textAlign: "center", color: "hsl(var(--text-muted))" }}>
                     Belum ada produk.
                   </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.localId} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                     <td style={{ padding: "16px", fontSize: "14px" }}>{p.sku || "-"}</td>
                     <td style={{ padding: "16px", fontSize: "14px", fontWeight: 600 }}>{p.name} {p.hasBoM && <span className="badge badge-info" style={{ marginLeft: "6px" }}>BoM</span>}</td>
                     <td style={{ padding: "16px", fontSize: "14px", color: "hsl(var(--text-secondary))" }}>{p.category || "-"}</td>
                     <td style={{ padding: "16px", fontSize: "14px" }}>{formatRupiahFull(p.price)}</td>
                     <td style={{ padding: "16px", fontSize: "14px" }}>{p.stock} <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>{p.unit}</span></td>
                     <td style={{ padding: "16px" }}>
                        <span className={`badge ${p.isActive ? 'badge-success' : 'badge-error'}`}>
                          {p.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                     </td>
                     <td style={{ padding: "16px", textAlign: "right" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleStatus(p)}>
                           {p.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                     </td>
                  </tr>
                ))
              )}
            </tbody>
         </table>
       </div>
    </DashboardLayout>
  );
}
