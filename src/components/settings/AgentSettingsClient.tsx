"use client";

import { useState } from "react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { useToast } from "@/contexts/AppProviders";
import { formatRupiahFull } from "@/lib/utils";

interface AgentSettingsProps {
  initialResalePrice: number;
  initialWhatsappNumber: string;
  initialBankDetails: string;
  tokenName: string;
  tokenSymbol: string;
}

export default function AgentSettingsClient({
  initialResalePrice,
  initialWhatsappNumber,
  initialBankDetails,
  tokenName,
  tokenSymbol,
}: AgentSettingsProps) {
  const { toast } = useToast();
  const [resalePrice, setResalePrice] = useState(initialResalePrice);
  const [whatsappNumber, setWhatsappNumber] = useState(initialWhatsappNumber);
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
          bankDetails
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
