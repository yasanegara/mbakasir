"use client";

import { useState } from "react";
import { useToast } from "@/contexts/AppProviders";
import { formatDateShort } from "@/lib/utils";

interface PosTerminalSummary {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
  isActive: boolean;
  tokenCost: number;
  createdAt: string;
}

export default function PosTerminalManager({
  tenantName,
  agentName,
  tokenSymbol,
  posRuleLabel,
  posTokenCost,
  initialAgentBalance,
  initialTokenUsed,
  initialTerminals,
}: {
  tenantName: string;
  agentName: string;
  tokenSymbol: string;
  posRuleLabel: string | null;
  posTokenCost: number | null;
  initialAgentBalance: number;
  initialTokenUsed: number;
  initialTerminals: PosTerminalSummary[];
}) {
  const { toast } = useToast();
  const [terminals, setTerminals] = useState(initialTerminals);
  const [agentBalance, setAgentBalance] = useState(initialAgentBalance);
  const [tokenUsed, setTokenUsed] = useState(initialTokenUsed);
  const [newTerminalName, setNewTerminalName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const additionalTerminals = Math.max(0, terminals.length - 1);

  async function handleCreateTerminal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!posRuleLabel) {
      toast("Rule POS tambahan belum diaktifkan oleh Super Admin", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/tenant/pos-terminals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newTerminalName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast(data.error || "Gagal menambahkan terminal POS", "error");
        return;
      }

      setTerminals((current) => [...current, data.terminal]);
      setAgentBalance(data.balanceAfter);
      setTokenUsed((current) => current + data.tokenCost);
      setNewTerminalName("");
      toast(
        `POS ${data.terminal.name} berhasil dibuat. Saldo ${tokenSymbol} agen diperbarui.`,
        "success"
      );
    } catch {
      toast("Terjadi kesalahan jaringan saat menambah POS", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
        }}
      >
        <div className="stat-card">
          <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
            Total Terminal POS
          </span>
          <span className="stat-value">{terminals.length}</span>
          <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
            1 POS utama + {additionalTerminals} tambahan
          </span>
        </div>

        <div className="stat-card">
          <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
            Biaya Tambah POS
          </span>
          <span className="stat-value" style={{ fontSize: "28px" }}>
            {posTokenCost ? `${posTokenCost} ${tokenSymbol}` : "-"}
          </span>
          <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
            {posRuleLabel || "Rule POS tambahan belum aktif"}
          </span>
        </div>

        <div className="stat-card">
          <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
            Saldo Agen
          </span>
          <span className="stat-value">{agentBalance.toLocaleString("id-ID")}</span>
          <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
            cadangan {tokenSymbol} yang masih dipegang agen {agentName}
          </span>
        </div>

        <div className="stat-card" style={{ background: "var(--gradient-primary)" }}>
          <span style={{ fontSize: "14px", color: "white", opacity: 0.8, fontWeight: 600 }}>
            Total Lisensi Terpakai
          </span>
          <span className="stat-value" style={{ color: "white", WebkitTextFillColor: "white" }}>
            {tokenUsed.toLocaleString("id-ID")}
          </span>
          <span style={{ fontSize: "12px", color: "white", opacity: 0.82 }}>
            Akumulasi token yang telah Anda gunakan
          </span>
        </div>
      </section>

      <section className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h2 style={{ fontSize: "20px" }}>Manajemen POS Toko</h2>
            <p style={{ marginTop: "6px", fontSize: "14px", color: "hsl(var(--text-secondary))" }}>
              {tenantName} sudah memiliki 1 POS utama gratis. Terminal POS tambahan
              berbayar hanya dapat diciptakan oleh Agen.
            </p>
          </div>

          <span className="badge badge-primary">{terminals.length} terminal</span>
        </div>

        {!posRuleLabel ? (
          <div
            style={{
              marginTop: "18px",
              padding: "16px 18px",
              borderRadius: "16px",
              border: "1px solid hsl(var(--warning) / 0.35)",
              background: "hsl(var(--warning) / 0.1)",
              color: "hsl(var(--text-secondary))",
              fontSize: "14px",
            }}
          >
            Super Admin belum mengaktifkan rule token `POS_SLOT`, jadi toko
            belum bisa menambah POS tambahan.
          </div>
        ) : null}

        {posRuleLabel && posTokenCost && posTokenCost > 0 ? (
          <div
            style={{
              marginTop: "20px",
              padding: "16px",
              background: "hsl(var(--primary) / 0.05)",
              border: "1px dashed hsl(var(--primary) / 0.5)",
              borderRadius: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              alignItems: "center",
              textAlign: "center"
            }}
          >
            <div style={{ color: "hsl(var(--text-secondary))", fontSize: "14px" }}>
              Terminal POS {terminals.length + 1} membutuhkan biaya <strong>{posTokenCost} {tokenSymbol}</strong>. Toko tidak dapat menambah POS sendiri.
            </div>
            <a href="/buy" className="btn btn-primary" style={{ marginTop: "8px" }}>
              Silakan Bayar / Konfirmasi ke Agen Anda
            </a>
          </div>
        ) : posRuleLabel ? (
          <form
            onSubmit={handleCreateTerminal}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(220px, 1fr) auto",
              gap: "12px",
              marginTop: "20px",
            }}
          >
            <div>
              <label className="input-label" htmlFor="new-pos-name">
                Nama POS Baru
              </label>
              <input
                id="new-pos-name"
                className="input-field"
                value={newTerminalName}
                onChange={(event) => setNewTerminalName(event.target.value)}
                placeholder={`Contoh: POS ${terminals.length + 1}`}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ alignSelf: "end" }}
            >
              {isSubmitting ? "Menambahkan..." : "Tambah POS Gratis"}
            </button>
          </form>
        ) : null}
      </section>

      <section className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid hsl(var(--border))",
          }}
        >
          <h2 style={{ fontSize: "18px" }}>Daftar Terminal</h2>
          <p style={{ marginTop: "6px", fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
            POS utama menjadi terminal default. Terminal tambahan dicatat agar
            kapasitas toko bisa diaudit dengan jelas.
          </p>
        </div>

        <div style={{ display: "grid", gap: "1px", background: "hsl(var(--border))" }}>
          {terminals.map((terminal) => (
            <article
              key={terminal.id}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "14px",
                padding: "18px 20px",
                background: "hsl(var(--bg-card))",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 700 }}>{terminal.name}</div>
                  {terminal.isDefault ? (
                    <span className="badge badge-success">POS Utama</span>
                  ) : (
                    <span className="badge badge-primary">Tambahan</span>
                  )}
                </div>
                <div style={{ marginTop: "6px", fontSize: "12px", color: "hsl(var(--text-secondary))" }}>
                  Dibuat {formatDateShort(terminal.createdAt)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>Kode</div>
                <div style={{ marginTop: "6px", fontWeight: 700 }}>{terminal.code}</div>
              </div>

              <div>
                <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>Token</div>
                <div style={{ marginTop: "6px", fontWeight: 700 }}>
                  {terminal.tokenCost.toLocaleString("id-ID")} {tokenSymbol}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>Status</div>
                <div style={{ marginTop: "6px" }}>
                  <span className={`badge ${terminal.isActive ? "badge-success" : "badge-warning"}`}>
                    {terminal.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
