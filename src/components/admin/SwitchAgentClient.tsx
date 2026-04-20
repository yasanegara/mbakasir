"use client";

import { useState } from "react";
import { useToast } from "@/contexts/AppProviders";
import { useRouter } from "next/navigation";

export default function SwitchAgentClient({
  tenantId,
  currentAgentId,
  agents
}: {
  tenantId: string;
  currentAgentId: string;
  agents: { id: string; name: string; email: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || selectedAgent === currentAgentId) return;

    if (!confirm("Peringatan: Pemindahan Toko ke Agen lain dapat mengubah struktur pendapatan mereka. Anda yakin?")) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/switch-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newAgentId: selectedAgent })
      });

      const data = await res.json();
      if (res.ok) {
        toast("Toko berhasil dipindahkan ke agen baru", "success");
        setIsOpen(false);
        router.refresh();
      } else {
        toast(data.error || "Gagal memindah agen", "error");
      }
    } catch {
      toast("Kesalahan jaringan", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-ghost btn-sm" style={{ color: "hsl(var(--warning))" }}>
        Pindah Agen
      </button>

      {isOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ maxWidth: "400px", width: "100%", padding: "24px" }}>
            <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>Ambil Alih / Pindah Agen</h3>
            <p style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", marginBottom: "16px" }}>
              Toko ini akan dipindahkan penanggung jawabnya ke Agen lain.
            </p>

            <form onSubmit={handleSwitch}>
              <div style={{ marginBottom: "20px" }}>
                <label className="input-label">Pilih Agen Tujuan Baru:</label>
                <select 
                  className="input-field" 
                  value={selectedAgent} 
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  required
                >
                  <option value="">-- Pilih Agen --</option>
                  <option value="PUSAT" style={{ fontWeight: "bold", color: "hsl(var(--primary))" }}>🏢 Ambil Alih ke Pusat (Internal)</option>
                  <optgroup label="Daftar Agen Mitra">
                    {agents.filter(a => a.id !== currentAgentId).map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={() => setIsOpen(false)} className="btn btn-ghost">Batal</button>
                <button type="submit" disabled={isSubmitting || !selectedAgent} className="btn btn-primary" style={{ background: "hsl(var(--warning))", borderColor: "hsl(var(--warning))" }}>
                  {isSubmitting ? "Memproses..." : "Konfirmasi Tukar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
