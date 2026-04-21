"use client";

import { useState } from "react";
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
  lastPurchasePrice?: number | null;
}

export default function PurchaseFormClient({
  tokenPrice,
  tokenSymbol,
  agentName,
  agentPhone,
  tenantName,
  agentBankDetails,
  lastPurchasePrice,
}: PurchaseFormProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState<number>(1);
  const [voucherCode, setVoucherCode] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);
  const [checkingVoucher, setCheckingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState("");
  const [voucherSuccess, setVoucherSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = amount * tokenPrice;
  const totalPrice = Math.max(0, subtotal - discount);

  // The actual WA message (to build the URL)
  const waMessage = `Halo Agen ${agentName},\n\nSaya ${tenantName} mau mengonfirmasi pembelian token ${tokenSymbol}.\n\nJumlah: ${amount} ${tokenSymbol}\nVoucher: ${voucherCode || "-"}${discount > 0 ? ` (Potongan: ${formatRupiahFull(discount)})` : ""}\nTotal Estimasi: ${formatRupiahFull(totalPrice)}\n\nMohon pesanan saya segera diproses, ini bukti transfernya...`;
  const waUrl = buildWhatsappUrl(agentPhone, waMessage);

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

  async function handleConfirmPurchase() {
    let whatsappWindow: Window | null = null;

    if (waUrl) {
      whatsappWindow = window.open("", "_blank");
      if (whatsappWindow) {
        whatsappWindow.document.title = "Membuka WhatsApp...";
        whatsappWindow.document.body.innerHTML =
          "<p style=\"font-family: sans-serif; padding: 16px;\">Menyiapkan WhatsApp...</p>";
        whatsappWindow.opener = null;
      }
    }

    setIsSubmitting(true);
    try {
      // 1. Kirim notifikasi ke DB (Dashboard Agen)
      const res = await fetch("/api/tenant/purchase-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, totalPrice, voucherCode: voucherCode || "" }),
      });
      
      if (!res.ok) {
        throw new Error("Gagal memproses pesanan ke server");
      }

      toast(
        `Permintaan pembelian sudah masuk ke dashboard agen ${agentName}.`,
        "success"
      );

      if (!waUrl) {
        toast(
          "Nomor WhatsApp agen belum tersedia. Hubungi agen lewat kontak lain.",
          "warning"
        );
        return;
      }

      if (whatsappWindow && !whatsappWindow.closed) {
        whatsappWindow.location.replace(waUrl);
        return;
      }

      window.location.assign(waUrl);

    } catch {
      if (whatsappWindow && !whatsappWindow.closed) {
        whatsappWindow.close();
      }
      toast("Terjadi kesalahan jaringan.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div style={{ margin: "24px 0", padding: "20px", background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border))", borderRadius: "12px", textAlign: "left" }}>
        
        <div style={{ padding: "16px", background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border))", borderRadius: "12px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: "hsl(var(--text-secondary))" }}>Harga Satuan Jual Agen:</span>
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
          {/* Baris Atas: Jumlah (Kiri) dan Total (Kanan) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
            
            {/* Kiri: Jumlah */}
            <div>
              <label className="input-label" style={{ display: "block", marginBottom: "8px", fontSize: "14px" }}>Jumlah {tokenSymbol}</label>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "hsl(var(--bg-card))", padding: "4px", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}>
                <button 
                  className="btn" 
                  onClick={() => setAmount(Math.max(1, amount - 1))}
                  style={{ padding: "8px 16px", fontSize: "18px", border: "none", background: "transparent", cursor: "pointer" }}
                >-</button>
                <span style={{ fontSize: "20px", fontWeight: 700, width: "36px", textAlign: "center" }}>{amount}</span>
                <button 
                  className="btn" 
                  onClick={() => setAmount(amount + 1)}
                  style={{ padding: "8px 16px", fontSize: "18px", border: "none", background: "transparent", cursor: "pointer" }}
                >+</button>
              </div>
            </div>

            {/* Kanan: Total Estimasi */}
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

          {/* Baris Bawah: Voucher */}
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
              <button 
                className="btn btn-outline" 
                onClick={handleCheckVoucher}
                disabled={checkingVoucher || !voucherCode.trim()}
              >
                {checkingVoucher ? "Cek..." : "Terapkan"}
              </button>
            </div>
            {voucherError && <div style={{ color: "hsl(var(--error))", fontSize: "13px", marginTop: "6px" }}>❌ {voucherError}</div>}
            {voucherSuccess && <div style={{ color: "hsl(var(--success))", fontSize: "13px", marginTop: "6px" }}>✅ {voucherSuccess}</div>}
          </div>

        </div>
      </div>

      <section className="card" style={{ textAlign: "left" }}>
        <h3 style={{ fontSize: "18px", borderBottom: "1px solid hsl(var(--border))", paddingBottom: "12px", marginBottom: "16px" }}>Instruksi Pembayaran</h3>
        
        <div style={{ display: "grid", gap: "16px" }}>
           <div>
              <div style={{ fontSize: "13px", color: "hsl(var(--text-muted))" }}>1. Transfer ke Rekening Agen</div>
              <div style={{ marginTop: "8px", background: "hsl(var(--bg-elevated))", padding: "12px", borderRadius: "8px", fontFamily: "monospace", fontSize: "14px", whiteSpace: "pre-wrap", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                 <span>{agentBankDetails ? agentBankDetails : "Agen belum menyertakan nomor rekening secara publik. Silakan tanyakan via WhatsApp."}</span>
                 {agentBankDetails && <CopyButton textToCopy={agentBankDetails} />}
              </div>
           </div>

           <div>
              <div style={{ fontSize: "13px", color: "hsl(var(--text-muted))", marginBottom: "8px" }}>2. Konfirmasi ke WhatsApp</div>
              <p style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", lineHeight: "1.5" }}>
                Kirim data pesanan ini beserta bukti transfer rekening ke WhatsApp agen. Agen akan memotong diskon voucher secara manual.
              </p>
              
              <button
                onClick={handleConfirmPurchase}
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", marginTop: "12px", border: "none" }}
              >
                {isSubmitting ? "Mengirim..." : `Konfirmasi (${tokenPrice > 0 ? formatRupiahFull(subtotal) : "Gratis"}) & Buka WhatsApp`}
              </button>
           </div>
        </div>
      </section>
    </>
  );
}
