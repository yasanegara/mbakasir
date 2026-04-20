"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/AppProviders";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { formatRupiahFull } from "@/lib/utils";

interface Voucher {
  id: string;
  code: string;
  discountValue: number;
}

export default function AgentVoucherManager() {
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [code, setCode] = useState("");
  const [discountValue, setDiscountValue] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchVouchers();
  }, []);

  async function fetchVouchers() {
    try {
      const res = await fetch("/api/agent/vouchers");
      const data = await res.json();
      if (res.ok) setVouchers(data.vouchers);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!code || discountValue <= 0) return toast("Isian tidak valid", "error");

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/agent/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.toUpperCase(), discountValue }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setVouchers([data.voucher, ...vouchers]);
        setCode("");
        setDiscountValue(0);
        toast("Voucher berhasil dibuat", "success");
      } else {
        toast(data.error, "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus voucher ini?")) return;
    try {
      const res = await fetch(`/api/agent/vouchers/${id}`, { method: "DELETE" });
      if (res.ok) {
        setVouchers(vouchers.filter(v => v.id !== id));
        toast("Voucher dihapus", "success");
      }
    } catch (e) {
      toast("Gagal menghapus", "error");
    }
  }

  return (
    <section className="card">
      <h2 style={{ fontSize: "20px", marginBottom: "16px" }}>Manajemen Promo & Voucher</h2>
      
      <form onSubmit={handleCreate} style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "24px" }}>
        <div style={{ flex: 1, minWidth: "180px" }}>
          <label className="input-label" htmlFor="v-code">Kode Voucher (Baru)</label>
          <input
            id="v-code"
            className="input-field"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
            placeholder="Misal: PROMO50"
            maxLength={20}
          />
        </div>
        <div style={{ flex: 1, minWidth: "180px" }}>
          <CurrencyInput
            id="v-discount"
            label="Potongan / Diskon (Rp)"
            value={discountValue}
            onChange={(val: number) => setDiscountValue(val)}
            placeholder="0"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting || !code || discountValue <= 0}>
          Tambah
        </button>
      </form>

      {isLoading ? (
        <div style={{ textAlign: "center", color: "hsl(var(--text-muted))" }}>Memuat...</div>
      ) : vouchers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px", background: "hsl(var(--bg-elevated))", borderRadius: "12px" }}>
          Belum ada voucher yang dibuat.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "8px" }}>
          {vouchers.map(v => (
            <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "hsl(var(--bg-elevated))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}>
              <div>
                <strong style={{ fontSize: "15px", letterSpacing: "1px", color: "hsl(var(--primary))" }}>{v.code}</strong>
                <div style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", marginTop: "4px" }}>
                  Diskon: {formatRupiahFull(v.discountValue)}
                </div>
              </div>
              <button 
                onClick={() => handleDelete(v.id)} 
                className="btn" 
                style={{ background: "hsl(var(--danger)/0.1)", color: "hsl(var(--danger))", padding: "6px 12px", fontSize: "13px", border: "none" }}
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
