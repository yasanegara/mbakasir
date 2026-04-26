"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getDb } from "@/lib/db";
import { useAuth } from "@/contexts/AppProviders";
import { useLiveQuery } from "dexie-react-hooks";

// ============================================================
// AUTO-LOCK ENGINE
// CMO: Mengunci layar otomatis jika premiumUntil terlewati
// ============================================================

export default function TenantLockWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  
  // Karena user adalah tenant/cashier, kita ambil tenant id dari user session
  // dan baca datanya secara real-time dari Dexie.js
  const tenant = useLiveQuery(() => {
    if (!user?.tenantId) return undefined;
    return getDb().tenants.get(user.tenantId);
  }, [user?.tenantId]);

  const [isLocked, setIsLocked] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/tenant/status");
      if (res.ok) {
        const serverTenant = await res.json();
        const db = getDb();
        const localTenant = await db.tenants.get(user!.tenantId!);
        if (localTenant) {
          await db.tenants.update(localTenant.localId, {
            status: serverTenant.status,
            premiumUntil: serverTenant.premiumUntil,
            updatedAt: serverTenant.updatedAt,
          });
        }
      }
    } catch (_) {}
    window.location.reload();
  };

  useEffect(() => {
    if (!tenant) return;

    const checkLock = () => {
      // Logic penguncian
      if (tenant.status === "LOCKED" || tenant.status === "SUSPENDED") {
         setIsLocked(true);
         return;
      }
      
      if (!tenant.premiumUntil) {
         setIsLocked(true); // Belum pernah diaktifkan sama sekali
         return;
      }

      if (Date.now() > tenant.premiumUntil) {
         setIsLocked(true); 
         return;
      }

      setIsLocked(false);
    };

    checkLock();

    // Cek berkala setiap 1 menit berjaga kalau lewat tengah malam dll
    const timer = setInterval(checkLock, 60_000);
    return () => clearInterval(timer);
  }, [tenant]);

  if (!user || user.role === "SUPERADMIN" || user.role === "AGENT" || pathname === "/buy") {
    return <>{children}</>; 
  }

  return (
    <>
      <div style={{ pointerEvents: isLocked ? "none" : "auto", opacity: isLocked ? 0.3 : 1, filter: isLocked ? "blur(4px)" : "none", transition: "all 0.3s ease" }}>
        {children}
      </div>

      {isLocked && (
        <div className="lock-screen">
           <div style={{ fontSize: "64px", marginBottom: "16px" }}>🔒</div>
           <h1 style={{ fontSize: "28px", color: "white", textAlign: "center" }}>Layanan Terkunci</h1>
           <p style={{ color: "hsl(var(--text-secondary))", textAlign: "center", maxWidth: "400px", fontSize: "16px" }}>
             Masa aktif langganan toko Anda telah kedaluwarsa. Silakan hubungi Agen Anda untuk melakukan perpanjangan lisensi Token.
           </p>
           <button 
             className="btn btn-primary" 
             style={{ marginTop: "24px", width: "100%", maxWidth: "220px", fontWeight: 800 }} 
             onClick={() => window.location.href = "/buy"}
           >
             Beli Token Sekarang
           </button>
           <button 
              className="btn btn-ghost" 
              style={{ marginTop: "12px", color: "white", opacity: 0.6, fontSize: "14px" }} 
              onClick={handleRefresh}
              disabled={isSyncing}
            >
              {isSyncing ? "Memeriksa status..." : "Muat Ulang"}
            </button>
        </div>
      )}
    </>
  );
}
