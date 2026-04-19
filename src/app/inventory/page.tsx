"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb, enqueueSyncOp } from "@/lib/db";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatRupiahFull } from "@/lib/utils";
import { useAuth, useToast } from "@/contexts/AppProviders";

// ============================================================
// MANAJEMEN BAHAN BAKU (Offline-Ready)
// ============================================================

export default function InventoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const rawMaterials = useLiveQuery(() => getDb().rawMaterials.toArray()) || [];

  return (
    <DashboardLayout title="Bahan Baku (Inventory)">
       <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2>Daftar Bahan Baku</h2>
          <button className="btn btn-primary" onClick={() => toast("Cooming soon", "info")}>
             + Tambah Bahan Baku
          </button>
       </div>

       <div className="card" style={{ padding: 0, overflow: "hidden" }}>
         <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border))" }}>
              <tr>
                 <th style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Nama Bahan</th>
                 <th style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Sisa Stok</th>
                 <th style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Satuan</th>
                 <th style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Harga Pokok per Satuan</th>
                 <th style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rawMaterials.length === 0 ? (
                <tr>
                   <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "hsl(var(--text-muted))" }}>
                     Belum ada data bahan baku.
                   </td>
                </tr>
              ) : (
                rawMaterials.map((r) => {
                  const isLow = r.stock <= r.minStock;
                  return (
                    <tr key={r.localId} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                       <td style={{ padding: "16px", fontSize: "14px", fontWeight: 600 }}>{r.name}</td>
                       <td style={{ padding: "16px", fontSize: "14px", color: isLow ? "hsl(var(--error))" : "inherit", fontWeight: isLow ? 700 : 400 }}>
                         {r.stock.toLocaleString("id-ID", { maximumFractionDigits: 2 })}
                       </td>
                       <td style={{ padding: "16px", fontSize: "14px", color: "hsl(var(--text-secondary))" }}>{r.unit}</td>
                       <td style={{ padding: "16px", fontSize: "14px" }}>{formatRupiahFull(r.costPerUnit)}</td>
                       <td style={{ padding: "16px" }}>
                          {isLow ? (
                            <span className="badge badge-error">Stok Menipis</span>
                          ) : (
                            <span className="badge badge-success">Aman</span>
                          )}
                       </td>
                    </tr>
                  );
                })
              )}
            </tbody>
         </table>
       </div>
    </DashboardLayout>
  );
}
