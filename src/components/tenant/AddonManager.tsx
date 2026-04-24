"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import { useToast } from "@/contexts/AppProviders";
import { useState } from "react";

export default function AddonManager() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const storeProfile = useLiveQuery(() => getDb().storeProfile.get("default"));
  const isCrmEnabled = storeProfile?.isCrmEnabled === true;

  const handleToggleCrm = async () => {
    setIsProcessing(true);
    try {
      const db = getDb();
      const current = await db.storeProfile.get("default");
      
      if (!current) {
        // Jika belum ada, buat record default
        // Kita butuh tenantId dari session, tapi untuk lokal kita bisa coba ambil dari tabel tenants
        const tenant = await db.tenants.toCollection().first();
        await db.storeProfile.add({
          id: "default",
          tenantId: tenant?.localId || "unknown",
          storeName: tenant?.name || "Toko Saya",
          isCrmEnabled: true,
          updatedAt: Date.now(),
        });
        toast("Fitur Data Pelanggan Diaktifkan!", "success");
      } else {
        await db.storeProfile.update("default", {
          isCrmEnabled: !isCrmEnabled,
          updatedAt: Date.now(),
        });
        toast(isCrmEnabled ? "Fitur Data Pelanggan Dinonaktifkan" : "Fitur Data Pelanggan Diaktifkan!", "success");
      }
    } catch (err) {
      console.error(err);
      toast("Gagal mengubah status fitur", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
      gap: "16px" 
    }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: "16px 20px",
        borderRadius: "16px",
        border: isCrmEnabled ? "1px solid hsl(var(--primary) / 0.3)" : "1px solid hsl(var(--border))",
        background: isCrmEnabled ? "hsl(var(--primary) / 0.02)" : "hsl(var(--bg-card))",
        transition: "all 0.3s ease"
      }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div style={{ 
            fontSize: "24px", 
            background: "hsl(var(--bg-elevated))", 
            width: "48px", 
            height: "48px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            borderRadius: "12px" 
          }}>
            👤
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px" }}>Data Pelanggan (CRM)</div>
            <div style={{ fontSize: "12px", color: "hsl(var(--text-secondary))", marginTop: "2px" }}>
              Lacak riwayat belanja pelanggan.
            </div>
          </div>
        </div>
        
        <div style={{ textAlign: "right" }}>
          <button 
            className={`btn btn-sm ${isCrmEnabled ? 'btn-ghost' : 'btn-primary'}`}
            style={{ 
              color: isCrmEnabled ? "hsl(var(--error))" : "white",
              fontWeight: 800,
              fontSize: "11px"
            }} 
            onClick={handleToggleCrm}
            disabled={isProcessing}
          >
            {isProcessing ? "..." : isCrmEnabled ? "Matikan" : "Aktifkan"}
          </button>
        </div>
      </div>

      {/* Placeholder untuk fitur tersedia lainnya nanti */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: "16px 20px",
        borderRadius: "16px",
        border: "1px dashed hsl(var(--border))",
        background: "rgba(0,0,0,0.02)",
        opacity: 0.7
      }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div style={{ fontSize: "24px" }}>📱</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px", color: "hsl(var(--text-muted))" }}>WhatsApp Notif</div>
            <div style={{ fontSize: "11px", color: "hsl(var(--text-muted))" }}>Segera Hadir</div>
          </div>
        </div>
        <span className="badge">Coming Soon</span>
      </div>
    </div>
  );
}
