"use client";

import { useState } from "react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { useToast } from "@/contexts/AppProviders";
import { formatRupiahFull } from "@/lib/utils";

interface AgentSettingsProps {
  initialResalePrice: number;
  initialWhatsappNumber: string;
  initialBankDetails: string;
  initialTelegramChatId: string;
  initialNotificationPrefs: {
    notifyNewStoreRegistration: boolean;
    notifyTokenPurchase: boolean;
  };
  tokenName: string;
  tokenSymbol: string;
}

export default function AgentSettingsClient({
  initialResalePrice,
  initialWhatsappNumber,
  initialBankDetails,
  initialTelegramChatId,
  initialNotificationPrefs,
  tokenName,
  tokenSymbol,
}: AgentSettingsProps) {
  const { toast } = useToast();
  const [resalePrice, setResalePrice] = useState(initialResalePrice);
  const [whatsappNumber, setWhatsappNumber] = useState(initialWhatsappNumber);
  const [telegramChatId, setTelegramChatId] = useState(initialTelegramChatId);
  const [notificationPrefs, setNotificationPrefs] = useState(initialNotificationPrefs);
  const [bankDetails, setBankDetails] = useState(initialBankDetails);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/agent/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          tokenResalePrice: resalePrice,
          whatsappNumber,
          telegramChatId,
          bankDetails,
          notificationPrefs
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast(data.error || "Gagal menyimpan pengaturan agen", "error");
        return;
      }

      toast("Pengaturan harga dasar token berhasil disimpan", "success");
    } catch {
      toast("Terjadi kesalahan jaringan", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <section className="card">
        <h2 style={{ fontSize: "20px" }}>Atur Harga Jual Token ({tokenSymbol})</h2>
        <p style={{ marginTop: "6px", fontSize: "14px", color: "hsl(var(--text-secondary))" }}>
          Tentukan harga jual dasar per token <strong>{tokenName}</strong> yang Anda tawarkan ke toko (Tenant). 
          Data ini akan dilaporkan ke pusat (Headquarters) sebagai referensi harga pasar dan akan digunakan sebagai standar jika terjadi proses pengambilalihan (takeover) agen.
        </p>

        <form
          onSubmit={handleSave}
          style={{
            display: "grid",
            gap: "20px",
            marginTop: "24px",
            maxWidth: "400px",
            padding: "20px",
            border: "1px solid hsl(var(--border))",
            borderRadius: "12px",
            background: "hsl(var(--bg-elevated))"
          }}
        >
          <div>
            <CurrencyInput
              id="resale-price"
              label={`Harga Jual per 1 ${tokenSymbol}`}
              value={resalePrice}
              onChange={(value) => setResalePrice(value)}
              placeholder="Contoh: 15.000"
            />
            <div style={{ marginTop: "8px", fontSize: "12px", color: "hsl(var(--text-muted))" }}>
              Nilai yang direkomendasikan adalah selisih wajar di atas harga modal.
            </div>
          </div>
          
          <div>
            <label className="input-label" htmlFor="whatsapp">Nomor WhatsApp Agen</label>
            <input
              id="whatsapp"
              className="input-field"
              type="text"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="081234567890"
            />
          </div>

          <div>
            <label className="input-label" htmlFor="telegram">Telegram Chat ID</label>
            <input
              id="telegram"
              className="input-field"
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="Contoh: 12345678"
            />
            <div style={{ marginTop: "8px", fontSize: "12px", color: "hsl(var(--text-muted))", lineHeight: "1.5" }}>
              Digunakan untuk notifikasi pendaftaran toko baru. <br />
              1. Cari dan klik <strong>START</strong> pada bot <a href="https://t.me/MbaKasirID_bot" target="_blank" rel="noreferrer" style={{ color: "hsl(var(--primary))", fontWeight: 700 }}>@MbaKasirID_bot</a> <br />
              2. Dapatkan Chat ID Anda di <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" style={{ color: "hsl(var(--primary))", fontWeight: 600 }}>@userinfobot</a>.
            </div>
          </div>

          <div>
            <label className="input-label" htmlFor="bank">Informasi Rekening Pembayaran</label>
            <textarea
              id="bank"
              className="input-field"
              rows={3}
              value={bankDetails}
              onChange={(e) => setBankDetails(e.target.value)}
              placeholder="BCA 123456789 a/n Nama Lengkap"
              style={{ resize: "vertical" }}
            />
          </div>

          <div style={{ borderTop: "1px solid hsl(var(--border))", paddingTop: "20px", marginTop: "10px" }}>
             <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>Preferensi Notifikasi Telegram</h3>
             
             <div style={{ display: "grid", gap: "12px" }}>
               <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px" }}>
                 <input 
                   type="checkbox" 
                   checked={notificationPrefs.notifyNewStoreRegistration}
                   onChange={(e) => setNotificationPrefs(p => ({ ...p, notifyNewStoreRegistration: e.target.checked }))}
                   style={{ width: "16px", height: "16px" }}
                 />
                 Notifikasi Pendaftaran Toko Baru
               </label>

               <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px" }}>
                 <input 
                   type="checkbox" 
                   checked={notificationPrefs.notifyTokenPurchase}
                   onChange={(e) => setNotificationPrefs(p => ({ ...p, notifyTokenPurchase: e.target.checked }))}
                   style={{ width: "16px", height: "16px" }}
                 />
                 Notifikasi Pembelian Token Agen
               </label>
             </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || resalePrice <= 0}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {isSubmitting ? "Menyimpan..." : "Simpan Harga Jual"}
          </button>
        </form>
      </section>
    </div>
  );
}
