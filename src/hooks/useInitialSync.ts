"use client";

import { useEffect, useState } from "react";
import { getDb } from "@/lib/db";
import { useAuth } from "@/contexts/AppProviders";

// ============================================================
// HOOK: MENGISI DEXIE DB SAAT PERTAMA KALI LOGIN / REFRESH
// ============================================================

export function useInitialSync() {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    async function doSync() {
      if (!user || user.role === "SUPERADMIN") return;
      // Hanya Tenant & Cashier yg butuh sync product ke Dexie

      setIsSyncing(true);
      setError(null);

      try {
        const db = getDb();
        const tenantCount = await db.tenants.count();
        
        // Pengecekan sederhana: Jika dexie belum terisi tenant, lakukan full hit API.
        // Untuk optimasi ke depan: gunakan timestamps sync terakhir.
        if (tenantCount > 0) {
          if (mounted) {
             setHasSynced(true);
             setIsSyncing(false); // Sembunyikan spinner seketika (Stale-while-revalidate)
          }
        }

        if (navigator.onLine) {
          const res = await fetch("/api/sync/initial");
          if (!res.ok) throw new Error("Gagal mengambil data master");

          const data = await res.json();
          
          await db.transaction('rw', [db.tenants, db.products, db.rawMaterials, db.billOfMaterials], async () => {
             await db.tenants.put(data.tenant);
             await db.products.bulkPut(data.products);
             await db.rawMaterials.bulkPut(data.rawMaterials);
             await db.billOfMaterials.bulkPut(data.billOfMaterials);
          });
          
          if (mounted) setHasSynced(true);
        }
      } catch (err: any) {
         if (mounted) setError(err.message);
      } finally {
         if (mounted) setIsSyncing(false);
      }
    }

    doSync();

    return () => { mounted = false; };
  }, [user]);

  return { isSyncing, hasSynced, error };
}
