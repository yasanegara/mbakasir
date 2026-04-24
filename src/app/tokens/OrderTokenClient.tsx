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
  const [submittingPackageId, setSubmittingPackageId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [tokenPrice, setTokenPrice] = useState<number>(0);
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);
  const { toast } = useToast();

  const fetchPackages = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/agent/packages");
      const data = await res.json();
      if (res.ok) {
        setPackages(data.packages);
        setTokenPrice(data.tokenPrice);
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

  const handleOrder = async (pkg?: AgentPackage, amount?: number) => {
    let whatsappWindow: Window | null = null;

    const isCustom = !pkg && amount;
    const orderName = isCustom ? `Custom (${amount} ${tokenSymbol})` : pkg!.name;
    const orderAmount = isCustom ? amount : pkg!.tokenAmount;
    const orderPrice = isCustom ? amount * tokenPrice : pkg!.price;
    const orderId = isCustom ? "CUSTOM" : pkg!.id;

    if (pusatInfo.phone) {
      whatsappWindow = window.open("", "_blank");
      if (whatsappWindow) {
        whatsappWindow.document.title = "Membuka WhatsApp...";
        whatsappWindow.document.body.innerHTML =
          "<p style=\"font-family: sans-serif; padding: 16px;\">Menyiapkan WhatsApp...</p>";
        whatsappWindow.opener = null;
      }
    }

    if (isCustom) {
      setIsSubmittingCustom(true);
    } else {
      setSubmittingPackageId(pkg!.id);
    }

    try {
      const requestRes = await fetch("/api/agent/purchase-token-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isCustom ? { amount: orderAmount } : { packageId: orderId }),
      });
      const requestData = await requestRes.json();

      if (!requestRes.ok) {
        throw new Error(
          requestData.error || "Gagal mengirim permintaan pembelian ke pusat"
        );
      }

      toast(
        `Permintaan ${orderName} masuk ke dashboard superadmin.`,
        "success"
      );

      const message = `Halo ${pusatInfo.name},\n\nSaya Agen ${agentName} ingin memesan token:\n\nItem: ${orderName}\nJumlah: ${orderAmount} ${tokenSymbol}\nHarga: ${formatRupiahFull(orderPrice)}\n\nSaya akan segera transfer ke rekening ${pusatInfo.bank}. Terima kasih!`;
      const url = buildWhatsappUrl(pusatInfo.phone, message);

      if (!url) {
        if (whatsappWindow && !whatsappWindow.closed) {
          whatsappWindow.close();
        }
        toast(
          "Nomor WhatsApp Pusat belum tersedia. Permintaan tetap tercatat di dashboard superadmin.",
          "warning"
        );
        return;
      }

      toast(`Pesanan ${orderName} disiapkan. Mengalihkan ke WhatsApp Pusat...`, "success");

      if (whatsappWindow && !whatsappWindow.closed) {
        whatsappWindow.location.replace(url);
        return;
      }

      window.open(url, "_blank");
    } catch (error) {
      if (whatsappWindow && !whatsappWindow.closed) {
        whatsappWindow.close();
      }
      toast(
        error instanceof Error ? error.message : "Kesalahan jaringan",
        "error"
      );
    } finally {
      setSubmittingPackageId(null);
      setIsSubmittingCustom(false);
    }
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
        ) : (
          <div style={{ display: "grid", gap: "20px" }}>
            {/* Custom Amount Field - Modernized */}
            <div style={{ 
              padding: "24px", 
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--primary) / 0.03) 100%)", 
              border: "1px solid hsl(var(--primary) / 0.15)", 
              borderRadius: "20px",
              boxShadow: "0 8px 24px -8px hsl(var(--primary) / 0.12)"
            }}>
              <div style={{ fontWeight: 800, fontSize: "16px", marginBottom: "6px", color: "hsl(var(--primary))", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "20px" }}>💎</span> Beli Jumlah Custom
              </div>
              <p style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", marginBottom: "20px", lineHeight: 1.5 }}>
                Masukkan jumlah token yang diinginkan.<br/> 
                Harga: <strong style={{ color: "hsl(var(--text-primary))" }}>{formatRupiahFull(tokenPrice)}</strong> / {tokenSymbol}
              </p>
              
              <div style={{ display: "flex", gap: "12px", alignItems: "stretch" }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    type="number"
                    placeholder="0"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    style={{ 
                      width: "100%",
                      height: "48px",
                      padding: "0 48px 0 16px",
                      fontSize: "18px",
                      fontWeight: 700,
                      borderRadius: "12px",
                      border: "2px solid hsl(var(--border))",
                      background: "hsl(var(--bg-card))",
                      outline: "none",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      appearance: "none",
                      margin: 0,
                    }}
                    className="modern-number-input"
                  />
                  <style dangerouslySetInnerHTML={{ __html: `
                    .modern-number-input::-webkit-outer-spin-button,
                    .modern-number-input::-webkit-inner-spin-button {
                      -webkit-appearance: none;
                      margin: 0;
                    }
                    .modern-number-input:focus {
                      border-color: hsl(var(--primary));
                      box-shadow: 0 0 0 4px hsl(var(--primary) / 0.1);
                      transform: translateY(-1px);
                    }
                  `}} />
                  <span style={{ 
                    position: "absolute", 
                    right: "16px", 
                    top: "50%", 
                    transform: "translateY(-50%)", 
                    fontSize: "14px", 
                    fontWeight: 800, 
                    color: "hsl(var(--primary))",
                    pointerEvents: "none",
                    opacity: 0.6
                  }}>
                    {tokenSymbol}
                  </span>
                </div>
                <button 
                  className="btn btn-primary"
                  disabled={!customAmount || Number(customAmount) <= 0 || isSubmittingCustom}
                  onClick={() => handleOrder(undefined, Number(customAmount))}
                  style={{ 
                    padding: "0 24px", 
                    height: "48px", 
                    borderRadius: "12px",
                    fontWeight: 700,
                    boxShadow: "0 4px 12px hsl(var(--primary) / 0.3)",
                    transition: "all 0.2s"
                  }}
                >
                  {isSubmittingCustom ? "..." : "Pesan Sekarang"}
                </button>
              </div>

              {customAmount && Number(customAmount) > 0 && (
                <div style={{ 
                  marginTop: "20px", 
                  padding: "16px", 
                  background: "white", 
                  borderRadius: "14px", 
                  border: "1px solid hsl(var(--primary) / 0.1)",
                  display: "flex", 
                  justifyContent: "space-between",
                  alignItems: "center",
                  animation: "fadeUp 0.3s ease-out"
                }}>
                  <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes fadeUp {
                      from { opacity: 0; transform: translateY(10px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                  `}} />
                  <span style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>Estimasi Total Bayar:</span>
                  <span style={{ fontSize: "18px", fontWeight: 900, color: "hsl(var(--primary))" }}>
                    {formatRupiahFull(Number(customAmount) * tokenPrice)}
                  </span>
                </div>
              )}
            </div>

            <div style={{ height: "1px", background: "hsl(var(--border))" }} />

            <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "-8px", color: "hsl(var(--text-secondary))" }}>
              Atau Pilih Paket Bundling:
            </div>

            {packages.length === 0 ? (
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
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ fontWeight: 700, fontSize: "16px" }}>{pkg.name}</div>
                        <span className="badge badge-primary" style={{ fontSize: "11px" }}>
                          {pkg.tokenAmount.toLocaleString("id-ID")} {tokenSymbol}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "hsl(var(--text-secondary))", marginTop: "4px" }}>
                        {pkg.description || `Pembelian paket bundling ${pkg.tokenAmount} token.`}
                      </div>
                      <div style={{ fontSize: "18px", fontWeight: 800, color: "hsl(var(--text-primary))", marginTop: "8px" }}>
                        {formatRupiahFull(pkg.price)}
                      </div>
                    </div>
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleOrder(pkg)}
                      style={{ whiteSpace: "nowrap" }}
                      disabled={submittingPackageId !== null}
                    >
                      {submittingPackageId === pkg.id ? "Mengirim..." : "Pesan"}
                    </button>
                  </div>
                ))}
              </div>
            )}

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
