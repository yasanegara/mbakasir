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
      if (!user?.tenantId || (user.role !== "TENANT" && user.role !== "CASHIER")) {
        if (mounted) {
          setIsSyncing(false);
          setHasSynced(false);
          setError(null);
        }
        return;
      }
      // Hanya Tenant & Cashier yg butuh sync master data ke Dexie

      setIsSyncing(true);
      setError(null);

      try {
        const db = getDb();
        const [tenantCount, terminalCount] = await Promise.all([
          db.tenants.count(),
          db.posTerminals.count()
        ]);

        // Selalu coba sync jika online untuk memastikan status lisensi terbaru
        if (navigator.onLine) {
          const res = await fetch("/api/sync/initial");
          const data = await res.json();
          
          if (!res.ok) {
            throw new Error(data.error || "Gagal mengambil data master");
          }
          
          await db.transaction('rw', [db.tenants, db.products, db.rawMaterials, db.billOfMaterials, db.posTerminals, db.productAssignments], async () => {
             await db.tenants.put(data.tenant);
             await db.products.bulkPut(data.products);
             await db.rawMaterials.bulkPut(data.rawMaterials);
             await db.billOfMaterials.bulkPut(data.billOfMaterials);
             if (data.posTerminals) await db.posTerminals.bulkPut(data.posTerminals);
             if (data.productAssignments) await db.productAssignments.bulkPut(data.productAssignments);
          });
          
          if (mounted) setHasSynced(true);
        } else {
          // Jika offline, cek apakah data sudah ada
          if (tenantCount > 0 && terminalCount > 0) {
            if (mounted) setHasSynced(true);
          }
        }
      } catch (err: unknown) {
         if (mounted) {
           setError(err instanceof Error ? err.message : "Gagal sinkronisasi awal");
         }
      } finally {
         if (mounted) setIsSyncing(false);
      }
    }

    doSync();

    return () => { mounted = false; };
  }, [user]);

  return { isSyncing, hasSynced, error };
}
