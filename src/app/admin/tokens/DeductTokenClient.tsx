"use client";

import { useState } from "react";
import { deductTokensAction } from "./actions";

export default function DeductTokenClient({ 
  agentId, 
  agentName,
}: { 
  agentId: string; 
  agentName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    
    if (!confirm(`Apakah Anda yakin ingin MENGURANGI ${amount} token dari ${agentName}? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setError(null);
    setIsSubmitting(true);
    
    const res = await deductTokensAction(agentId, Number(amount));
    
    setIsSubmitting(false);

    if (res.success) {
      alert(`Pengurangan ${amount} token untuk ${agentName} berhasil!`);
      setIsOpen(false);
      setAmount("");
      window.location.reload();
    } else {
      setError(res.error || "Gagal mengurangi token.");
    }
  };

  return (
    <>
      <button 
        className="btn btn-outline btn-sm" 
        onClick={() => setIsOpen(true)}
        style={{ color: "hsl(var(--error))", borderColor: "hsl(var(--error)/0.3)" }}
      >
         - Kurangi
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
                Kurangi Token dari<br/>
                <span style={{ color: "hsl(var(--error))" }}>{agentName}</span>
             </h3>
             
             {error && (
                <div style={{ padding: "10px", marginBottom: "16px", background: "hsl(var(--error)/0.15)", border: "1px solid hsl(var(--error)/0.3)", borderRadius: "var(--radius-md)", color: "hsl(var(--error))", fontSize: "14px" }}>
                  {error}
                </div>
             )}

             <form onSubmit={handleDeduct}>
               <div style={{ marginBottom: "16px" }}>
                 <label className="input-label" htmlFor="deductAmount">Jumlah Token yang Dikurangi</label>
                 <input 
                   id="deductAmount"
                   type="number"
                   className="input-field"
                   placeholder="1"
                   value={amount}
                   onChange={e => setAmount(e.target.value ? Number(e.target.value) : "")}
                   required
                   min={1}
                 />
                 <p style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "8px" }}>
                   Saldo agen akan langsung berkurang setelah konfirmasi.
                 </p>
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
                   className="btn btn-error"
                   disabled={isSubmitting || !amount}
                   style={{ background: "hsl(var(--error))", color: "white" }}
                 >
                   {isSubmitting ? "Memproses..." : "Konfirmasi Pengurangan"}
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}
    </>
  );
}
