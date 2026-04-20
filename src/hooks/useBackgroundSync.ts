"use client";

import { useEffect, useRef, useCallback } from "react";
import { getDb } from "@/lib/db";
import type { LocalSyncQueue } from "@/lib/db";
import { useAuth } from "@/contexts/AppProviders";

// ============================================================
// BACKGROUND SYNC WORKER HOOK
// CTO: Batch upsert dari IndexedDB ke PostgreSQL
//
// STRATEGY:
//  1. Jalankan setiap X detik (jika online)
//  2. Ambil semua entri di syncQueue yg belum di-sync (retries < 5)
//  3. POST ke /api/sync sebagai batch
//  4. Tandai sebagai SYNCED atau increment retries jika gagal
// ============================================================

const SYNC_INTERVAL_MS = 30_000; // 30 detik
const MAX_RETRIES = 5;
const BATCH_SIZE = 50;

interface SyncResult {
  localId: string;
  success: boolean;
  serverId?: string;
  error?: string;
}

export function useBackgroundSync() {
  const { user } = useAuth();
  const isSyncing = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isEnabled =
    Boolean(user?.tenantId) &&
    (user?.role === "TENANT" || user?.role === "CASHIER");

  const runSync = useCallback(async () => {
    if (!isEnabled) return;
    if (!navigator.onLine) return;
    if (isSyncing.current) return;

    isSyncing.current = true;

    try {
      const db = getDb();

      // Ambil batch pending dari syncQueue
      const pendingItems = await db.syncQueue
        .where("retries")
        .below(MAX_RETRIES)
        .limit(BATCH_SIZE)
        .toArray();

      if (pendingItems.length === 0) {
        isSyncing.current = false;
        return;
      }

      // Group per tabel untuk efisiensi batch
      const grouped = pendingItems.reduce(
        (acc, item) => {
          if (!acc[item.table]) acc[item.table] = [];
          acc[item.table].push(item);
          return acc;
        },
        {} as Record<string, LocalSyncQueue[]>
      );

      // Kirim ke server
      const response = await fetch("/api/sync/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batches: grouped }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const results: SyncResult[] = await response.json();

      // Update status di IndexedDB berdasarkan hasil server
      await db.transaction(
        "rw",
        [
          db.syncQueue,
          db.sales,
          db.products,
          db.rawMaterials,
          db.billOfMaterials,
          db.shifts,
        ],
        async () => {
          for (const result of results) {
            const queueItem = pendingItems.find(
              (p) => p.localId === result.localId
            );
            if (!queueItem?.id) continue;

            if (result.success) {
              // Hapus dari queue
              await db.syncQueue.delete(queueItem.id);

              // Update syncStatus di tabel asal
              await updateSyncStatus(
                db,
                queueItem.table,
                result.localId,
                "SYNCED",
                result.serverId
              );
            } else {
              // Increment retry count
              await db.syncQueue.update(queueItem.id, {
                retries: queueItem.retries + 1,
                lastError: result.error,
              });
            }
          }
        }
      );
    } catch (err) {
      console.warn("[BackgroundSync] Gagal sync:", err);
    } finally {
      isSyncing.current = false;
    }
  }, [isEnabled]);

  useEffect(() => {
    if (!isEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Jalankan segera saat komponen mount
    runSync();

    // Set interval
    intervalRef.current = setInterval(runSync, SYNC_INTERVAL_MS);

    // Listener: sync saat kembali online
    const handleOnline = () => runSync();
    window.addEventListener("online", handleOnline);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("online", handleOnline);
    };
  }, [isEnabled, runSync]);

  return { triggerSync: runSync };
}

// ─── Helper: Update syncStatus & serverId di tabel asal ──────

async function updateSyncStatus(
  db: ReturnType<typeof getDb>,
  table: string,
  localId: string,
  status: "SYNCED" | "CONFLICT",
  serverId?: string
): Promise<void> {
  const update: Record<string, unknown> = { syncStatus: status };
  if (serverId) update.id = serverId;

  switch (table) {
    case "sales":
      await db.sales.where("localId").equals(localId).modify(update);
      break;
    case "products":
      await db.products.where("localId").equals(localId).modify(update);
      break;
    case "rawMaterials":
      await db.rawMaterials.where("localId").equals(localId).modify(update);
      break;
    case "billOfMaterials": {
      const existing = await db.billOfMaterials.get(localId);
      if (!existing || !serverId || serverId === existing.id) {
        break;
      }

      await db.billOfMaterials.delete(localId);
      await db.billOfMaterials.put({
        ...existing,
        id: serverId,
      });
      break;
    }
    case "shifts":
      await db.shifts.where("localId").equals(localId).modify(update);
      break;
    default:
      break;
  }
}

// ─── Hook: Status koneksi online/offline ─────────────────────

export function useOnlineStatus() {
  const isOnline =
    typeof navigator !== "undefined" ? navigator.onLine : true;
  return isOnline;
}
