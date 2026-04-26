"use client";

import { useState, useTransition } from "react";
import { useAuth, useToast } from "@/contexts/AppProviders";
import { TokenConversionSnapshot } from "@/lib/token-settings-shared";
import { formatRupiahFull } from "@/lib/utils";
import TokenLedgerModal from "@/components/ui/TokenLedgerModal";

interface MarketplaceClientProps {
  addons: TokenConversionSnapshot[];
  activeModules: Record<string, string>; // key -> date string
}

export default function MarketplaceClient({ addons, activeModules }: MarketplaceClientProps) {
  const { user, refetch } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selectedAddon, setSelectedAddon] = useState<TokenConversionSnapshot | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  async function handleActivate() {
    if (!selectedAddon) return;
    
    startTransition(async () => {
      try {
        const res = await fetch("/api/tenant/modules/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetKey: selectedAddon.targetKey, quantity }),
        });
        const data = await res.json();
        
        if (!res.ok) {
          toast(data.error || "Gagal aktifasi", "error");
          return;
        }

        toast(`Berhasil mengaktifkan ${selectedAddon.targetLabel}!`, "success");
        setSelectedAddon(null);
        await refetch(); // Update token balance and active modules
        window.location.reload(); // Refresh to update sidebar/UI
      } catch {
        toast("Kesalahan jaringan", "error");
      }
    });
  }

  const tokenBalance = (user as any)?.tokenBalance || 0;

  return (
    <div style={{ display: "grid", gap: "32px" }}>
      {/* Header & Balance */}
      <div style={{ 
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px",
        background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%)",
        padding: "32px", borderRadius: "24px", color: "white", boxShadow: "0 10px 30px -10px hsl(var(--primary) / 0.5)"
      }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0 }}>Marketplace Add-on</h1>
          <p style={{ marginTop: "8px", opacity: 0.9, fontSize: "15px" }}>Tingkatkan performa tokomu dengan modul premium pilihan.</p>
        </div>
        <div 
          style={{ 
            background: "rgba(255,255,255,0.15)", 
            padding: "16px 24px", 
            borderRadius: "18px", 
            backdropFilter: "blur(10px)", 
            border: "1px solid rgba(255,255,255,0.2)",
            cursor: "pointer",
            transition: "transform 0.2s"
          }}
          onClick={() => setIsLedgerOpen(true)}
          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          title="Klik untuk lihat riwayat"
        >
          <div style={{ fontSize: "13px", fontWeight: 600, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Saldo Koin Anda</div>
          <div style={{ fontSize: "32px", fontWeight: 900, marginTop: "4px" }}>🪙 {tokenBalance} <span style={{ fontSize: "16px", fontWeight: 600, opacity: 0.8 }}>Koin</span></div>
        </div>
      </div>

      {/* Grid Addons */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
        {addons.map((addon) => {
          const isActive = activeModules[addon.targetKey];
          const expiryDate = isActive ? new Date(isActive) : null;
          const isExpired = expiryDate && expiryDate < new Date();

          return (
            <div 
              key={addon.targetKey} 
              className="card" 
              style={{ 
                display: "flex", flexDirection: "column", padding: "28px", borderRadius: "20px",
                border: isActive && !isExpired ? "2px solid hsl(var(--primary) / 0.3)" : "1px solid hsl(var(--border))",
                background: isActive && !isExpired ? "linear-gradient(to bottom, hsl(var(--bg-surface)), hsl(var(--primary) / 0.03))" : "hsl(var(--bg-surface))",
                transition: "transform 0.2s, box-shadow 0.2s",
                position: "relative", overflow: "hidden"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 20px 40px -15px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Active Badge */}
              {isActive && !isExpired && (
                <div style={{ 
                  position: "absolute", top: "12px", right: "-30px", background: "hsl(var(--primary))", color: "white",
                  fontSize: "10px", fontWeight: 800, padding: "4px 35px", transform: "rotate(45deg)", boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
                }}>
                  AKTIF
                </div>
              )}

              <div style={{ fontSize: "48px", marginBottom: "20px" }}>{addon.icon || "🧩"}</div>
              
              <h3 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 8px" }}>{addon.targetLabel}</h3>
              <p style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", lineHeight: 1.5, margin: "0 0 20px", flex: 1 }}>
                {addon.description || "Tingkatkan efisiensi tokomu dengan modul ini."}
              </p>

              <div style={{ background: "hsl(var(--bg-elevated))", padding: "16px", borderRadius: "14px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "hsl(var(--text-muted))" }}>Harga Aktifasi</span>
                  <span style={{ fontSize: "18px", fontWeight: 800, color: "hsl(var(--primary))" }}>🪙 {addon.tokenCost} <span style={{ fontSize: "12px", opacity: 0.7 }}>/ {addon.rewardQuantity} {addon.rewardUnit}</span></span>
                </div>
              </div>

              {isActive && !isExpired ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginBottom: "12px" }}>
                    Aktif hingga: <strong>{expiryDate?.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                  </div>
                  <button 
                    className="btn btn-ghost" 
                    style={{ width: "100%", borderRadius: "12px", opacity: 0.6, cursor: "not-allowed" }}
                    disabled
                  >
                    ✅ Sudah Aktif
                  </button>
                </div>
              ) : (
                <button 
                  className="btn btn-primary" 
                  style={{ width: "100%", borderRadius: "12px", fontWeight: 700, padding: "12px" }}
                  onClick={() => setSelectedAddon(addon)}
                >
                  🚀 Aktifkan Sekarang
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Activation Modal */}
      {selectedAddon && (
        <div style={{ 
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
        }}>
          <div className="card" style={{ maxWidth: "480px", width: "100%", padding: "32px", borderRadius: "24px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
            <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "8px" }}>Konfirmasi Aktifasi</h2>
            <p style={{ color: "hsl(var(--text-secondary))", fontSize: "14px", marginBottom: "24px" }}>
              Anda akan mengaktifkan <strong>{selectedAddon.targetLabel}</strong>. Silakan pilih durasi yang diinginkan.
            </p>

            <div style={{ display: "grid", gap: "20px", marginBottom: "32px" }}>
              <div>
                <label className="input-label">Jumlah ({selectedAddon.rewardUnit})</label>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button 
                    className="btn btn-ghost btn-icon" 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    style={{ background: "hsl(var(--bg-elevated))" }}
                  >➖</button>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={quantity} 
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    style={{ textAlign: "center", fontSize: "18px", fontWeight: 700 }}
                  />
                  <button 
                    className="btn btn-ghost btn-icon" 
                    onClick={() => setQuantity(quantity + 1)}
                    style={{ background: "hsl(var(--bg-elevated))" }}
                  >➕</button>
                </div>
              </div>

              <div style={{ background: "hsl(var(--primary) / 0.05)", padding: "20px", borderRadius: "16px", border: "1px solid hsl(var(--primary) / 0.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))" }}>Total Koin Dibutuhkan</span>
                  <span style={{ fontSize: "18px", fontWeight: 800, color: "hsl(var(--primary))" }}>🪙 {selectedAddon.tokenCost * quantity} Koin</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))" }}>Saldo Koin Saat Ini</span>
                  <span style={{ fontSize: "14px", fontWeight: 600 }}>🪙 {tokenBalance} Koin</span>
                </div>
              </div>

              {tokenBalance < (selectedAddon.tokenCost * quantity) && (
                <div style={{ padding: "12px 16px", borderRadius: "12px", background: "hsl(var(--error) / 0.1)", color: "hsl(var(--error))", fontSize: "13px", fontWeight: 600 }}>
                  ⚠️ Saldo koin tidak mencukupi. Silakan hubungi agen Anda untuk top-up koin.
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button 
                className="btn btn-ghost" 
                style={{ flex: 1 }} 
                onClick={() => { setSelectedAddon(null); setQuantity(1); }}
                disabled={isPending}
              >Batal</button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 2, fontWeight: 700 }}
                disabled={isPending || tokenBalance < (selectedAddon.tokenCost * quantity)}
                onClick={handleActivate}
              >
                {isPending ? "Memproses..." : "Konfirmasi & Aktifkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      <TokenLedgerModal 
        isOpen={isLedgerOpen} 
        onClose={() => setIsLedgerOpen(false)} 
        title="Riwayat Pemakaian Koin"
      />
    </div>
  );
}
