"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatDateShort, formatDate } from "@/lib/utils";

// ============================================================
// HALAMAN: STATUS & RIWAYAT SINKRONISASI
// CTO: Menampilkan data antrean Dexie syncQueue
// ============================================================

export default function SyncStatusPage() {
  const syncQueue = useLiveQuery(() => getDb().syncQueue.reverse().toArray()) || [];
  
  // Ambil beberapa transaksi terakhir untuk diperlihatkan statusnya
  const recentSales = useLiveQuery(() => 
    getDb().sales.reverse().limit(10).toArray()
  ) || [];

  return (
    <DashboardLayout title="Status Sinkronisasi">
      <div style={{ display: "grid", gap: "24px" }}>
        {/* Antrean Background Worker */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
           <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "16px" }}>Antrean Worker Latar Belakang</h2>
              <span className={`badge ${syncQueue.length > 0 ? "badge-warning" : "badge-success"}`}>
                {syncQueue.length} Pending
              </span>
           </div>
           
           <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead style={{ background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border))" }}>
                <tr>
                   <th style={{ padding: "10px 20px", fontSize: "13px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Tabel</th>
                   <th style={{ padding: "10px 20px", fontSize: "13px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Aksi</th>
                   <th style={{ padding: "10px 20px", fontSize: "13px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Waktu Eksekusi</th>
                   <th style={{ padding: "10px 20px", fontSize: "13px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Gagal Ulang (Retry)</th>
                   <th style={{ padding: "10px 20px", fontSize: "13px", fontWeight: 600, color: "hsl(var(--text-secondary))" }}>Detail Error</th>
                </tr>
              </thead>
              <tbody>
                {syncQueue.length === 0 ? (
                  <tr>
                     <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "hsl(var(--text-muted))" }}>
                       Semua data telah disinkronkan ke server Pusat secara mulus.
                     </td>
                  </tr>
                ) : (
                  syncQueue.map((q) => (
                    <tr key={q.id} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                       <td style={{ padding: "14px 20px", fontSize: "13px", fontWeight: 600 }}>{q.table}</td>
                       <td style={{ padding: "14px 20px" }}>
                         <span className="badge badge-primary">{q.action}</span>
                       </td>
                       <td style={{ padding: "14px 20px", fontSize: "13px" }}>{formatDate(q.createdAt)}</td>
                       <td style={{ padding: "14px 20px", fontSize: "13px" }}>
                         {q.retries > 0 ? (
                            <span style={{ color: "hsl(var(--warning))", fontWeight: 700 }}>{q.retries}x Drop</span>
                         ) : "-"}
                       </td>
                       <td style={{ padding: "14px 20px", fontSize: "13px", color: "hsl(var(--error))" }}>
                         {q.lastError || "-"}
                       </td>
                    </tr>
                  ))
                )}
              </tbody>
           </table>
        </div>

        {/* Status 10 Penjualan Terakhir */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
           <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(var(--border))" }}>
              <h2 style={{ fontSize: "16px" }}>10 Transaksi Penjualan Terakhir</h2>
           </div>
           
           <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <tbody>
                {recentSales.map((sale) => (
                  <tr key={sale.localId} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                     <td style={{ padding: "14px 20px", fontSize: "13px", fontWeight: 600 }}>{sale.invoiceNo}</td>
                     <td style={{ padding: "14px 20px", fontSize: "13px" }}>{formatDate(sale.createdAt)}</td>
                     <td style={{ padding: "14px 20px", textAlign: "right" }}>
                       {sale.syncStatus === "SYNCED" && <span className="badge badge-success">✓ Cloud Synced</span>}
                       {sale.syncStatus === "PENDING" && <span className="badge badge-warning">⧗ Menunggu Sync</span>}
                       {sale.syncStatus === "CONFLICT" && <span className="badge badge-error">⚠ Konflik</span>}
                     </td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
