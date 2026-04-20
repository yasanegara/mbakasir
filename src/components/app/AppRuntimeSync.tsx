"use client";

import { useBackgroundSync } from "@/hooks/useBackgroundSync";

// ============================================================
// APP RUNTIME SYNC
// Menjalankan background sync untuk tenant/cashier
// ============================================================

export default function AppRuntimeSync() {
  useBackgroundSync();

  return null;
}
