"use client";

import { useEffect, useState } from "react";
import { getDb } from "@/lib/db";
import { useAuth } from "@/contexts/AppProviders";
import { useLiveQuery } from "dexie-react-hooks";

// ============================================================
// AUTO-LOCK ENGINE
// CMO: Mengunci layar otomatis jika premiumUntil terlewati
// ============================================================

export default function TenantLockWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // Karena user adalah tenant/cashier, kita ambil tenant id dari user session
  // dan baca datanya secara real-time dari Dexie.js
  const tenant = useLiveQuery(() => {
    if (!user?.tenantId) return undefined;
    return getDb().tenants.get(user.tenantId);
  }, [user?.tenantId]);

  const [isLocked, setIsLocked] = useState(false);

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

  if (!user || user.role === "SUPERADMIN" || user.role === "AGENT") {
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
           <button className="btn btn-ghost" style={{ marginTop: "20px", color: "white", borderColor: "rgba(255,255,255,0.3)" }} onClick={() => window.location.reload()}>
             Muat Ulang
           </button>
        </div>
      )}
    </>
  );
}
