"use client";

import { useState } from "react";
import { formatRupiahFull } from "@/lib/utils";
import { mintTokensAction } from "./actions";

export default function MintTokenClient({ 
  agentId, 
  agentName, 
  tokenPrice,
  initialAmount,
  autoOpen
}: { 
  agentId: string; 
  agentName: string; 
  tokenPrice: number;
  initialAmount?: number;
  autoOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(autoOpen || false);
  const [amount, setAmount] = useState<number | "">(initialAmount || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    
    setError(null);
    setIsSubmitting(true);
    
    const res = await mintTokensAction(agentId, Number(amount));
    
    setIsSubmitting(false);

    if (res.success) {
      alert(`Minting ${amount} token untuk ${agentName} berhasil!`);
      setIsOpen(false);
      setAmount("");
      // Refresh and clear query params
      window.location.href = "/admin/tokens";
    } else {
      setError(res.error || "Gagal mint token.");
    }
  };

  return (
    <>
      <button 
        className="btn btn-primary btn-sm" 
        onClick={() => setIsOpen(true)}
      >
         + Mint Token
      </button>

      {isOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "hsl(0 0% 0% / 0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "fadeIn 0.2s ease"
        }}>
          <div className="card" style={{ width: "100%", maxWidth: "400px", padding: "24px", position: "relative" }}>
             <h3 style={{ fontSize: "18px", marginBottom: "16px", color: "hsl(var(--text-primary))", fontWeight: "bold" }}>
                Mint Token untuk<br/>
                <span style={{ color: "hsl(var(--primary))" }}>{agentName}</span>
             </h3>
             
             {error && (
               <div style={{ padding: "10px", marginBottom: "16px", background: "hsl(var(--error)/0.15)", border: "1px solid hsl(var(--error)/0.3)", borderRadius: "var(--radius-md)", color: "hsl(var(--error))", fontSize: "14px" }}>
                 {error}
               </div>
             )}

             <form onSubmit={handleMint}>
               <div style={{ marginBottom: "16px" }}>
                 <label className="input-label" htmlFor="tokenAmount">Jumlah Token</label>
                 <input 
                   id="tokenAmount"
                   type="number"
                   className="input-field"
                   placeholder="1"
                   value={amount}
                   onChange={e => setAmount(e.target.value ? Number(e.target.value) : "")}
                   required
                   min={1}
                 />
                 {amount && (
                   <p style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", marginTop: "8px" }}>
                     Estimasi Tagihan: <span style={{ fontWeight: 600, color: "hsl(var(--primary))" }}>{formatRupiahFull(Number(amount) * tokenPrice)}</span>
                   </p>
                 )}
               </div>

               <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                 <button 
                   type="button" 
                   className="btn btn-ghost" 
                   onClick={() => setIsOpen(false)}
                   disabled={isSubmitting}
                 >
                   Batal
                 </button>
                 <button 
                   type="submit" 
                   className="btn btn-primary"
                   disabled={isSubmitting || !amount}
                 >
                   {isSubmitting ? "Memproses..." : "Konfirmasi Minting"}
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}
    </>
  );
}
