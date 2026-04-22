"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/AppProviders";
import { formatRupiahFull, buildWhatsappUrl } from "@/lib/utils";

interface AgentPackage {
  id: string;
  name: string;
  tokenAmount: number;
  price: number;
  description: string | null;
}

interface OrderTokenClientProps {
  agentName: string;
  tokenSymbol: string;
}

export default function OrderTokenClient({ agentName, tokenSymbol }: OrderTokenClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [packages, setPackages] = useState<AgentPackage[]>([]);
  const [pusatInfo, setPusatInfo] = useState({ phone: "", name: "", bank: "" });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchPackages = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/agent/packages");
      const data = await res.json();
      if (res.ok) {
        setPackages(data.packages);
        setPusatInfo({ 
          phone: data.pusatPhone, 
          name: data.pusatName,
          bank: data.pusatBank
        });
      } else {
        toast(data.error || "Gagal memuat paket", "error");
      }
    } catch {
      toast("Kesalahan jaringan", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen]);

  const handleOrder = (pkg: AgentPackage) => {
    const message = `Halo ${pusatInfo.name},\n\nSaya Agen ${agentName} ingin memesan paket token:\n\nPaket: ${pkg.name}\nJumlah: ${pkg.tokenAmount} ${tokenSymbol}\nHarga: ${formatRupiahFull(pkg.price)}\n\nSaya akan segera transfer ke rekening ${pusatInfo.bank}. Terima kasih!`;
    const url = buildWhatsappUrl(pusatInfo.phone, message);
    window.open(url, "_blank");
  };

  if (!isOpen) {
    return (
      <button 
        className="btn btn-primary" 
        style={{ marginTop: "16px", width: "100%", justifyContent: "center" }}
        onClick={() => setIsOpen(true)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px" }}>
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        Beli Token ke Pusat
      </button>
    );
  }

  return (
    <div className="modal-overlay active" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div className="card animate-fade-in" style={{ maxWidth: "500px", width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
        <button 
          onClick={() => setIsOpen(false)} 
          style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "hsl(var(--text-muted))" }}
        >
          ✕
        </button>

        <h2 style={{ fontSize: "20px", marginBottom: "8px" }}>Beli Token {tokenSymbol}</h2>
        <p style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", marginBottom: "24px" }}>
          Pilih paket bundling di bawah untuk melakukan pemesanan ke {pusatInfo.name || "Pusat"}.
        </p>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>Memuat paket...</div>
        ) : packages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", border: "1px dashed hsl(var(--border))", borderRadius: "12px" }}>
            Belum ada paket yang tersedia dari Pusat.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {packages.map((pkg) => (
              <div 
                key={pkg.id} 
                style={{ 
                  padding: "16px", 
                  background: "hsl(var(--bg-elevated))", 
                  border: "1px solid hsl(var(--border))", 
                  borderRadius: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px"
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "16px" }}>{pkg.name}</div>
                  <div style={{ fontSize: "12px", color: "hsl(var(--text-secondary))", marginTop: "2px" }}>{pkg.description || `Dapatkan ${pkg.tokenAmount} ${tokenSymbol}`}</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "hsl(var(--primary))", marginTop: "8px" }}>
                    {formatRupiahFull(pkg.price)}
                  </div>
                </div>
                <button 
                  className="btn btn-primary"
                  onClick={() => handleOrder(pkg)}
                  style={{ whiteSpace: "nowrap" }}
                >
                  Pesan
                </button>
              </div>
            ))}

            <div style={{ marginTop: "20px", padding: "16px", background: "hsl(var(--bg-surface))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }}>
              <div style={{ fontSize: "13px", color: "hsl(var(--text-muted))", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Info Rekening Pusat</div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "hsl(var(--text-primary))", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {pusatInfo.bank || "Hubungi Pusat untuk info rekening."}
              </div>
              <div style={{ marginTop: "12px", fontSize: "12px", color: "hsl(var(--text-secondary))", borderTop: "1px solid hsl(var(--border))", paddingTop: "12px" }}>
                Setelah transfer, klik tombol <strong>Pesan</strong> di atas untuk konfirmasi via WhatsApp dengan bukti transfer Anda.
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid hsl(var(--border))", textAlign: "center" }}>
           <button className="btn btn-ghost" onClick={() => setIsOpen(false)} style={{ width: "100%", justifyContent: "center" }}>
             Tutup
           </button>
        </div>
      </div>
    </div>
  );
}
