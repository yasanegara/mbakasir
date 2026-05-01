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
  qrisUrl: string | null;
}

interface OrderTokenClientProps {
  agentName: string;
  tokenSymbol: string;
}

export default function OrderTokenClient({ agentName, tokenSymbol }: OrderTokenClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"PACKAGE_LIST" | "CHECKOUT">("PACKAGE_LIST");
  const [packages, setPackages] = useState<AgentPackage[]>([]);
  const [pusatInfo, setPusatInfo] = useState({ phone: "", name: "", bank: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [submittingPackageId, setSubmittingPackageId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [tokenPrice, setTokenPrice] = useState<number>(0);
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<{
    name: string;
    amount: number;
    price: number;
    id: string;
    isCustom: boolean;
  } | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [timeLeft, setTimeLeft] = useState(7200); // 2 jam dalam detik
  const [paymentData, setPaymentData] = useState<any>(null); // State baru untuk Tripay
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
    } else {
      setView("PACKAGE_LIST");
      setSelectedOrder(null);
      setProofFile(null);
    }
  }, [isOpen]);

  // Countdown timer effect
  useEffect(() => {
    if (view === "CHECKOUT" && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [view, timeLeft]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectPackage = (pkg?: AgentPackage, amount?: number) => {
    const isCustom = !pkg && amount;
    const order = {
      name: isCustom ? `Custom (${amount} ${tokenSymbol})` : pkg!.name,
      amount: isCustom ? amount : pkg!.tokenAmount,
      price: isCustom ? amount * tokenPrice : pkg!.price,
      id: isCustom ? "CUSTOM" : pkg!.id,
      isCustom: !!isCustom
    };
    setSelectedOrder(order);
    setView("CHECKOUT");
    setTimeLeft(7200); // Reset timer ke 2 jam
  };

  const handleFinalOrder = async () => {
    if (!selectedOrder) return;
    
    if (selectedOrder.isCustom) {
      setIsSubmittingCustom(true);
    } else {
      setSubmittingPackageId(selectedOrder.id);
    }

    try {
      const requestRes = await fetch("/api/agent/purchase-token-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedOrder.isCustom ? { amount: selectedOrder.amount } : { packageId: selectedOrder.id }),
      });
      const requestData = await requestRes.json();

      if (requestRes.ok && requestData.payment) {
        setPaymentData(requestData.payment);
      }

      if (!requestRes.ok) {
        throw new Error(
          requestData.error || "Gagal mengirim permintaan pembelian ke pusat"
        );
      }

      toast(
        `Permintaan ${selectedOrder.name} berhasil dibuat. Silakan selesaikan pembayaran.`,
        "success"
      );
    } catch (error) {
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
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(true);
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px" }}>
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        Beli Token ke Pusat
      </button>
    );
  }

  return (
    <div
      className="modal-overlay active"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      onClick={(event) => {
        event.stopPropagation();
        setIsOpen(false);
      }}
    >
      <div
        className="card animate-fade-in"
        style={{ maxWidth: "500px", width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative" }}
        onClick={(event) => event.stopPropagation()}
      >
        <button 
          onClick={(event) => {
            event.stopPropagation();
            setIsOpen(false);
          }}
          style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "hsl(var(--text-muted))" }}
        >
          ✕
        </button>

        {view === "PACKAGE_LIST" ? (
          <>
            <h2 style={{ fontSize: "20px", marginBottom: "8px" }}>Beli Token {tokenSymbol}</h2>
            <p style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", marginBottom: "24px" }}>
              Pilih paket bundling di bawah untuk melakukan pemesanan ke {pusatInfo.name || "Pusat"}.
            </p>

            {isLoading ? (
              <div style={{ textAlign: "center", padding: "40px" }}>Memuat paket...</div>
            ) : (
              <div style={{ display: "grid", gap: "20px" }}>
                {/* Custom Amount Field */}
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
                      onClick={() => handleSelectPackage(undefined, Number(customAmount))}
                      style={{ 
                        padding: "0 24px", 
                        height: "48px", 
                        borderRadius: "12px",
                        fontWeight: 700,
                        boxShadow: "0 4px 12px hsl(var(--primary) / 0.3)",
                        transition: "all 0.2s"
                      }}
                    >
                      Pesan Sekarang
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
                          onClick={() => handleSelectPackage(pkg)}
                          style={{ whiteSpace: "nowrap" }}
                        >
                          Pesan
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="animate-fade-in">
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <button 
                onClick={() => setView("PACKAGE_LIST")}
                style={{ background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border))", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                ←
              </button>
              <h2 style={{ fontSize: "20px" }}>Checkout Pembelian</h2>
            </div>

            <div style={{ display: "grid", gap: "20px" }}>
              <div style={{ padding: "16px", background: "hsl(var(--primary) / 0.05)", borderRadius: "12px", border: "1px solid hsl(var(--primary) / 0.1)" }}>
                <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))", textTransform: "uppercase", fontWeight: 700, marginBottom: "8px" }}>Rincian Pesanan</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "15px", fontWeight: 600 }}>{selectedOrder?.name}</span>
                  <span style={{ fontWeight: 700 }}>{formatRupiahFull(selectedOrder?.price || 0)}</span>
                </div>
                <div style={{ fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
                  {selectedOrder?.amount} {tokenSymbol}
                </div>
              </div>

              <div style={{ padding: "16px", background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))", textTransform: "uppercase", fontWeight: 700 }}>Info Rekening Pusat</div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "hsl(var(--error))", background: "hsl(var(--error) / 0.1)", padding: "4px 8px", borderRadius: "6px" }}>
                    ⏱️ {formatTime(timeLeft)}
                  </div>
                </div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "hsl(var(--text-primary))", whiteSpace: "pre-wrap", lineHeight: 1.6, marginBottom: "12px" }}>
                  {pusatInfo.bank || "Hubungi Pusat untuk info rekening."}
                </div>
                
                {/* DISPLAY TRIPAY PAYMENT INFO (QRIS or VA) */}
                {paymentData && (
                  <div style={{ marginBottom: "20px", background: "white", padding: "16px", borderRadius: "12px", border: "2px solid hsl(var(--primary))" }}>
                    
                    {/* Jika QRIS */}
                    {paymentData.qr_url && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--primary))", marginBottom: "10px", textTransform: "uppercase" }}>Scan QRIS di Bawah</div>
                        <img 
                          src={paymentData.qr_url} 
                          alt="Tripay QRIS" 
                          style={{ width: "100%", maxWidth: "260px", height: "auto", margin: "0 auto", display: "block" }} 
                        />
                      </div>
                    )}

                    {/* Jika VA atau Metode Lain (Ada Pay Code) */}
                    {paymentData.pay_code && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--text-muted))", marginBottom: "4px", textTransform: "uppercase" }}>Nomor {paymentData.payment_name}</div>
                        <div style={{ fontSize: "24px", fontWeight: 800, color: "hsl(var(--primary))", letterSpacing: "1px", margin: "8px 0" }}>
                          {paymentData.pay_code}
                        </div>
                        <button 
                          className="btn btn-ghost" 
                          onClick={() => {
                            navigator.clipboard.writeText(paymentData.pay_code);
                            toast("Nomor berhasil disalin", "success");
                          }}
                          style={{ fontSize: "12px", height: "auto", padding: "4px 8px" }}
                        >
                          Salin Nomor
                        </button>
                      </div>
                    )}

                    <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid hsl(var(--border))", textAlign: "center" }}>
                      <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>Total Pembayaran</div>
                      <div style={{ fontSize: "18px", fontWeight: 800 }}>
                        {formatRupiahFull(paymentData.amount)}
                      </div>
                    </div>

                    {/* Instruksi Pembayaran */}
                    {paymentData.instructions && (
                      <div style={{ marginTop: "16px", textAlign: "left" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, marginBottom: "8px", textTransform: "uppercase" }}>Cara Pembayaran:</div>
                        <div style={{ maxHeight: "200px", overflowY: "auto", fontSize: "12px", border: "1px solid hsl(var(--border))", borderRadius: "8px", padding: "8px" }}>
                          {paymentData.instructions.map((step: any, idx: number) => (
                            <div key={idx} style={{ marginBottom: "12px" }}>
                              <div style={{ fontWeight: 700, color: "hsl(var(--primary))", marginBottom: "4px" }}>{step.title}</div>
                              <ul style={{ paddingLeft: "16px", margin: 0 }}>
                                {step.steps.map((s: string, sidx: number) => (
                                  <li key={sidx} style={{ marginBottom: "4px" }} dangerouslySetInnerHTML={{ __html: s }}></li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* FALLBACK TO STATIC QRIS IF NO TRIPAY AND PACKAGE HAS QRIS */}
                {!paymentData && packages.find(p => p.id === selectedOrder?.id)?.qrisUrl && (
                  <div style={{ marginBottom: "16px", textAlign: "center", background: "white", padding: "12px", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--text-muted))", marginBottom: "8px", textTransform: "uppercase" }}>Scan QRIS Pembayaran</div>
                    <img 
                      src={packages.find(p => p.id === selectedOrder?.id)!.qrisUrl!} 
                      alt="QRIS" 
                      style={{ width: "100%", maxWidth: "200px", height: "auto", margin: "0 auto", display: "block" }} 
                    />
                  </div>
                )}
                
                <p style={{ fontSize: "12px", color: "hsl(var(--text-secondary))", lineHeight: 1.5 }}>
                  {paymentData 
                    ? "Saldo akan otomatis masuk setelah pembayaran Anda terdeteksi oleh sistem."
                    : "Silakan transfer sesuai nominal di atas sebelum waktu habis."}
                </p>
              </div>

              <div>
                <label className="input-label" style={{ display: "block", marginBottom: "8px" }}>Upload Bukti Transfer</label>
                <div 
                  style={{ 
                    border: "2px dashed hsl(var(--border))", 
                    borderRadius: "12px", 
                    padding: "20px", 
                    textAlign: "center",
                    cursor: "pointer",
                    position: "relative",
                    background: proofFile ? "hsl(var(--success) / 0.05)" : "transparent",
                    borderColor: proofFile ? "hsl(var(--success))" : "hsl(var(--border))"
                  }}
                  onClick={() => document.getElementById("proof-upload")?.click()}
                >
                  <input 
                    type="file" 
                    id="proof-upload" 
                    hidden 
                    accept="image/*"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  />
                  {proofFile ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <span style={{ fontSize: "20px" }}>✅</span>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "hsl(var(--success))" }}>Bukti Terpilih</div>
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>📸</div>
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>
                    {proofFile ? proofFile.name : "Klik untuk Upload Bukti"}
                  </div>
                  <div style={{ fontSize: "11px", color: "hsl(var(--text-secondary))", marginTop: "4px" }}>
                    Format JPG, PNG (Maks 5MB)
                  </div>
                </label>
              </div>
            )}

            <button 
              className="btn btn-primary"
              onClick={handleFinalOrder}
              disabled={
                (!paymentData && !proofFile && !selectedOrder?.isCustom) || // Jika manual wajib upload bukti
                (selectedOrder?.isCustom ? isSubmittingCustom : submittingPackageId === selectedOrder?.id) ||
                (paymentData !== null) // Jika sudah ada data payment, tombol didisable (sudah dipesan)
              }
              style={{ width: "100%", height: "48px", fontSize: "16px", fontWeight: 700 }}
            >
              {selectedOrder?.isCustom 
                ? (isSubmittingCustom ? "Memproses..." : (paymentData ? "Pesanan Dibuat" : "Pesan Sekarang"))
                : (submittingPackageId === selectedOrder?.id ? "Memproses..." : (paymentData ? "Pesanan Dibuat" : "Pesan Sekarang"))
              }
            </button>

            {paymentData && (
              <p style={{ fontSize: "11px", color: "hsl(var(--success))", textAlign: "center", fontWeight: 600 }}>
                ✓ Pesanan berhasil dibuat. Silakan bayar sesuai instruksi di atas.
              </p>
            )}
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
