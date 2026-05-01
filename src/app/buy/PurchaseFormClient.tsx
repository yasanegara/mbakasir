"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/AppProviders";
import { buildWhatsappUrl, formatRupiahFull } from "@/lib/utils";
import CopyButton from "./CopyButton";

interface PurchaseFormProps {
  tokenPrice: number;
  tokenSymbol: string;
  agentName: string;
  agentPhone: string;
  tenantName: string;
  agentBankDetails: string;
  agentQrisUrl?: string | null;
  lastPurchasePrice?: number | null;
}

export default function PurchaseFormClient({
  tokenPrice,
  tokenSymbol,
  agentName,
  agentPhone,
  tenantName,
  agentBankDetails,
  agentQrisUrl,
  lastPurchasePrice,
}: PurchaseFormProps) {
  const { toast } = useToast();
  const [view, setView] = useState<"FORM" | "CHECKOUT">("FORM");
  const [amount, setAmount] = useState<number>(1);
  const [voucherCode, setVoucherCode] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);
  const [checkingVoucher, setCheckingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState("");
  const [voucherSuccess, setVoucherSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [timeLeft, setTimeLeft] = useState(7200);
  const [isWaitingActivation, setIsWaitingActivation] = useState(false);
  const [activationTimeLeft, setActivationTimeLeft] = useState(0);

  // Load waiting state from localStorage
  useEffect(() => {
    const savedWait = localStorage.getItem(`activationWait_${tenantName}`);
    if (savedWait) {
      const waitUntil = parseInt(savedWait);
      const now = Date.now();
      if (waitUntil > now) {
        setIsWaitingActivation(true);
        setActivationTimeLeft(Math.floor((waitUntil - now) / 1000));
      } else {
        localStorage.removeItem(`activationWait_${tenantName}`);
      }
    }
  }, [tenantName]);

  // Activation Wait Countdown timer
  useEffect(() => {
    if (isWaitingActivation && activationTimeLeft > 0) {
      const timer = setInterval(() => {
        setActivationTimeLeft((prev) => {
          if (prev <= 1) {
            setIsWaitingActivation(false);
            localStorage.removeItem(`activationWait_${tenantName}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isWaitingActivation, activationTimeLeft, tenantName]);

  const subtotal = amount * tokenPrice;
  const totalPrice = Math.max(0, subtotal - discount);

  // Countdown timer
  useEffect(() => {
    if (view === "CHECKOUT" && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [view, timeLeft]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hrs > 0 
      ? `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  async function handleCheckVoucher() {
    if (!voucherCode.trim()) {
      setVoucherError("Masukkan kode voucher");
      setVoucherSuccess("");
      setDiscount(0);
      return;
    }

    setCheckingVoucher(true);
    setVoucherError("");
    setVoucherSuccess("");
    try {
      const res = await fetch("/api/tenant/check-voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: voucherCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal cek voucher");
      }

      setDiscount(data.discountValue);
      setVoucherSuccess(`Diskon ${formatRupiahFull(data.discountValue)} berhasil digunakan!`);
    } catch (e: any) {
      setVoucherError(e.message);
      setDiscount(0);
    } finally {
      setCheckingVoucher(false);
    }
  }

  async function handleStartCheckout() {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tenant/purchase-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, totalPrice, voucherCode: voucherCode || "" }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses pesanan");

      setView("CHECKOUT");
      setTimeLeft(7200);
      toast("Pesanan dicatat. Silakan selesaikan pembayaran.", "success");
    } catch (e: any) {
      toast(e.message || "Gagal memproses pesanan.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFinalPurchase() {
    setIsSubmitting(true);
    try {
      let proofUrl = "";
      if (proofFile) {
        const formData = new FormData();
        formData.append("file", proofFile);
        const uploadRes = await fetch("/api/upload/proof", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok) {
          const baseUrl = window.location.origin;
          proofUrl = `${baseUrl}${uploadData.url}`;
        }
      }

      const waMessage = `Halo Agen ${agentName},\n\nSaya ${tenantName} mau mengonfirmasi pembelian token ${tokenSymbol}.\n\nJumlah: ${amount} ${tokenSymbol}\nVoucher: ${voucherCode || "-"}${discount > 0 ? ` (Potongan: ${formatRupiahFull(discount)})` : ""}\nTotal Estimasi: ${formatRupiahFull(totalPrice)}\n\nSaya sudah transfer ke rekening ${agentBankDetails}.${proofUrl ? `\n\nBukti Transfer: ${proofUrl}` : "\n\n(Bukti transfer menyusul)"}\n\nMohon segera diproses!`;
      const waUrl = buildWhatsappUrl(agentPhone, waMessage);

      if (!waUrl) {
        toast("WhatsApp Agen tidak tersedia.", "error");
        return;
      }

      // Start 15 minute wait
      const waitMinutes = 15;
      const waitUntil = Date.now() + (waitMinutes * 60 * 1000);
      localStorage.setItem(`activationWait_${tenantName}`, waitUntil.toString());
      setIsWaitingActivation(true);
      setActivationTimeLeft(waitMinutes * 60);

      window.open(waUrl, "_blank");
      toast("WhatsApp terkirim. Mohon tunggu aktivasi dari Agen.", "success");
    } catch {
      toast("Gagal memproses pengiriman WA", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (view === "CHECKOUT") {
    return (
      <div className="animate-fade-in" style={{ textAlign: "left" }}>
        <button 
          onClick={() => setView("FORM")}
          className="btn btn-ghost"
          style={{ marginBottom: "20px", padding: 0 }}
        >
          ← Kembali ke Form
        </button>

        <section className="card" style={{ marginBottom: "20px", border: "1px solid hsl(var(--primary) / 0.2)", background: "hsl(var(--primary) / 0.02)" }}>
          <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))", textTransform: "uppercase", fontWeight: 700, marginBottom: "12px" }}>Rincian Pembelian</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontWeight: 600 }}>Beli {amount} {tokenSymbol}</span>
            <span style={{ fontWeight: 800, color: "hsl(var(--primary))" }}>{formatRupiahFull(totalPrice)}</span>
          </div>
          {discount > 0 && (
            <div style={{ fontSize: "13px", color: "hsl(var(--success))" }}>
              Potongan Voucher: -{formatRupiahFull(discount)}
            </div>
          )}
        </section>

        <section className="card" style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))", textTransform: "uppercase", fontWeight: 700 }}>Info Rekening Agen</div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "hsl(var(--error))", background: "hsl(var(--error) / 0.1)", padding: "4px 8px", borderRadius: "6px" }}>
              ⏱️ {formatTime(timeLeft)}
            </div>
          </div>
          
          <div style={{ background: "hsl(var(--bg-elevated))", padding: "16px", borderRadius: "12px", border: "1px solid hsl(var(--border))", marginBottom: "12px" }}>
            <div style={{ fontSize: "16px", fontWeight: 700, whiteSpace: "pre-wrap", lineHeight: 1.6, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span>{agentBankDetails || "Tanyakan agen via WhatsApp"}</span>
              {agentBankDetails && <CopyButton textToCopy={agentBankDetails} />}
            </div>
          </div>
          
          {agentQrisUrl && (
            <div style={{ marginBottom: "16px", textAlign: "center", background: "white", padding: "16px", borderRadius: "12px", border: "1px solid hsl(var(--border))" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--text-muted))", marginBottom: "10px", textTransform: "uppercase" }}>Scan QRIS Agen</div>
              <img 
                src={agentQrisUrl} 
                alt="QRIS" 
                style={{ width: "100%", maxWidth: "240px", height: "auto", margin: "0 auto", display: "block" }} 
              />
            </div>
          )}

          <p style={{ fontSize: "12px", color: "hsl(var(--text-secondary))", lineHeight: 1.5 }}>
            Silakan transfer sesuai nominal di atas sebelum waktu habis agar segera diproses oleh Agen.
          </p>
        </section>

        <section className="card" style={{ marginBottom: "20px" }}>
          <label className="input-label" style={{ display: "block", marginBottom: "12px" }}>Upload Bukti Transfer</label>
          <div 
            style={{ 
              border: "2px dashed hsl(var(--border))", 
              borderRadius: "16px", 
              padding: "24px", 
              textAlign: "center",
              cursor: "pointer",
              background: proofFile ? "hsl(var(--success) / 0.05)" : "transparent",
              borderColor: proofFile ? "hsl(var(--success))" : "hsl(var(--border))"
            }}
            onClick={() => document.getElementById("proof-upload-tenant")?.click()}
          >
            <input 
              type="file" 
              id="proof-upload-tenant" 
              hidden 
              accept="image/*"
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
            />
            {proofFile ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                <span style={{ fontSize: "24px" }}>✅</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "hsl(var(--success))" }}>Bukti Terpilih</div>
                  <div style={{ fontSize: "12px", color: "hsl(var(--text-secondary))" }}>{proofFile.name}</div>
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: "28px", marginBottom: "8px" }}>📸</div>
                <div style={{ fontSize: "14px", fontWeight: 700 }}>Klik untuk Upload Bukti</div>
                <div style={{ fontSize: "11px", color: "hsl(var(--text-muted))", marginTop: "4px" }}>Format Gambar (Maks 5MB)</div>
              </>
            )}
          </div>
        </section>

        <button
          onClick={handleFinalPurchase}
          disabled={!proofFile || isSubmitting || isWaitingActivation}
          className="btn btn-primary"
          style={{ 
            width: "100%", 
            height: "56px", 
            fontSize: "16px", 
            fontWeight: 800, 
            borderRadius: "16px",
            background: isWaitingActivation ? "hsl(var(--warning) / 0.1)" : "hsl(var(--primary))",
            color: isWaitingActivation ? "hsl(var(--warning))" : "white",
            border: isWaitingActivation ? "2px solid hsl(var(--warning))" : "none",
            cursor: isWaitingActivation ? "wait" : "pointer"
          }}
        >
          {isWaitingActivation ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <span>⏳ Mohon Tunggu Aktivasi...</span>
              <span style={{ fontVariantNumeric: "tabular-nums", opacity: 0.8 }}>({formatTime(activationTimeLeft)})</span>
            </div>
          ) : (
            isSubmitting ? "Memproses..." : "Konfirmasi & Buka WhatsApp"
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ margin: "24px 0", padding: "20px", background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border))", borderRadius: "12px", textAlign: "left" }}>
        
        <div style={{ padding: "16px", background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border))", borderRadius: "12px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: "hsl(var(--text-secondary))" }}>
              {tokenPrice > 0 ? "Harga Satuan dari Agen:" : "Harga Satuan Standar:"}
            </span>
            <span style={{ fontWeight: 600 }}>{formatRupiahFull(tokenPrice)} / token</span>
          </div>
          {lastPurchasePrice !== undefined && lastPurchasePrice !== null && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
              <span style={{ color: "hsl(var(--text-muted))" }}>Histori Harga Beli Terakhirmu:</span>
              <span style={{ fontWeight: 500, color: "hsl(var(--text-secondary))" }}>{formatRupiahFull(lastPurchasePrice)} / token</span>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <label className="input-label" style={{ display: "block", marginBottom: "8px", fontSize: "14px" }}>Jumlah {tokenSymbol}</label>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "hsl(var(--bg-card))", padding: "4px", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}>
                <button className="btn" onClick={() => setAmount(Math.max(1, amount - 1))} style={{ padding: "8px 16px", fontSize: "18px", border: "none", background: "transparent", cursor: "pointer" }}>-</button>
                <span style={{ fontSize: "20px", fontWeight: 700, width: "36px", textAlign: "center" }}>{amount}</span>
                <button className="btn" onClick={() => setAmount(amount + 1)} style={{ padding: "8px 16px", fontSize: "18px", border: "none", background: "transparent", cursor: "pointer" }}>+</button>
              </div>
            </div>

            <div style={{ textAlign: "right", alignSelf: "center", paddingRight: "8px" }}>
              <div style={{ color: "hsl(var(--text-secondary))", fontSize: "13px", marginBottom: "4px" }}>Estimasi Harga</div>
              {discount > 0 && (
                 <div style={{ fontSize: "14px", color: "hsl(var(--text-muted))", textDecoration: "line-through", marginBottom: "2px" }}>
                   {formatRupiahFull(subtotal)}
                 </div>
              )}
              <div style={{ fontSize: "28px", fontWeight: 700, color: discount > 0 ? "hsl(var(--success))" : "hsl(var(--primary))", letterSpacing: "-0.5px" }}>
                {tokenPrice > 0 ? formatRupiahFull(totalPrice) : "Gratis / Hubungi Agen"}
              </div>
            </div>
          </div>

          <div>
            <label className="input-label" htmlFor="voucher" style={{ display: "block", marginBottom: "8px", fontSize: "14px" }}>Kode Voucher (Promo dari Agen)</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                id="voucher"
                className="input-field"
                placeholder="PROMO202X"
                value={voucherCode}
                onChange={(e) => {
                  setVoucherCode(e.target.value.toUpperCase());
                  if (discount > 0) {
                     setDiscount(0);
                     setVoucherSuccess("");
                  }
                  if (voucherError) setVoucherError("");
                }}
                style={{ flex: 1, textTransform: "uppercase", background: "hsl(var(--bg-card))" }}
              />
              <button className="btn btn-outline" onClick={handleCheckVoucher} disabled={checkingVoucher || !voucherCode.trim()}>
                {checkingVoucher ? "Cek..." : "Terapkan"}
              </button>
            </div>
            {voucherError && <div style={{ color: "hsl(var(--error))", fontSize: "13px", marginTop: "6px" }}>❌ {voucherError}</div>}
            {voucherSuccess && <div style={{ color: "hsl(var(--success))", fontSize: "13px", marginTop: "6px" }}>✅ {voucherSuccess}</div>}
          </div>
        </div>
      </div>

      <button
        onClick={handleStartCheckout}
        disabled={isSubmitting}
        className="btn btn-primary"
        style={{ width: "100%", justifyContent: "center", height: "52px", fontSize: "16px", fontWeight: 700 }}
      >
        {isSubmitting ? "Memproses..." : `Lanjutkan ke Pembayaran (${formatRupiahFull(totalPrice)})`}
      </button>
    </div>
  );
}
