"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/AppProviders";

interface StoreLink {
  id: string;
  token: string;
  isActive: boolean;
  useCount: number;
  createdAt: string;
  agent: { id: string; name: string; email: string; isActive: boolean };
}

interface Agent {
  id: string;
  name: string;
  email: string;
}

export default function AdminStoreLinkManager({ agents }: { agents: Agent[] }) {
  const { toast } = useToast();
  const [links, setLinks] = useState<StoreLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState("");
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => { setOrigin(window.location.origin); }, []);

  async function fetchLinks() {
    setIsLoading(true);
    const res = await fetch("/api/admin/store-links");
    const data = await res.json();
    if (res.ok) setLinks(data.links ?? []);
    setIsLoading(false);
  }

  useEffect(() => { fetchLinks(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!agentId) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/store-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() || undefined, agentId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(data.message ?? "Link pendaftaran toko dibuat", "success");
        setToken("");
        fetchLinks();
      } else {
        toast(data.error ?? "Gagal membuat link", "error");
      }
    } catch {
      toast("Kesalahan jaringan", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleActive(link: StoreLink) {
    const action = link.isActive ? "deactivate" : "activate";
    const res = await fetch("/api/admin/store-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: link.token, action }),
    });
    const data = await res.json();
    if (res.ok) {
      toast(action === "activate" ? "Link diaktifkan" : "Link dinonaktifkan", "success");
      fetchLinks();
    } else {
      toast(data.error ?? "Gagal", "error");
    }
  }

  function copyLink(token: string) {
    const url = `${origin}/register/store/${token}`;
    navigator.clipboard.writeText(url);
    toast("Link disalin ke clipboard", "success");
  }

  return (
    <section className="card">
      <h2 style={{ fontSize: "18px", marginBottom: "6px" }}>Link Pendaftaran Toko (Admin)</h2>
      <p style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", marginBottom: "20px" }}>
        Buat link pendaftaran toko baru untuk agen tertentu. Jika token sudah ada namun nonaktif, link akan diaktifkan ulang.
      </p>

      {/* Form buat link */}
      <form onSubmit={handleCreate} style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end", padding: "16px", background: "hsl(var(--bg-elevated))", borderRadius: "12px", marginBottom: "20px" }}>
        <div style={{ flex: 1, minWidth: "180px" }}>
          <label className="input-label">Agen</label>
          <select
            className="input-field"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            required
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: "180px" }}>
          <label className="input-label">Custom Slug (opsional)</label>
          <div style={{ display: "flex", alignItems: "center", background: "hsl(var(--bg-card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", overflow: "hidden" }}>
            <span style={{ padding: "0 10px", fontSize: "12px", color: "hsl(var(--text-muted))", borderRight: "1px solid hsl(var(--border))", whiteSpace: "nowrap" }}>
              /register/store/
            </span>
            <input
              type="text"
              className="input-field"
              style={{ border: "none", boxShadow: "none", borderRadius: 0 }}
              placeholder="mis: yk, nur, acak"
              value={token}
              onChange={(e) => setToken(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={isSaving || !agentId}>
          {isSaving ? "Menyimpan..." : "Buat / Aktifkan"}
        </button>
      </form>

      {/* Daftar link */}
      {isLoading ? (
        <p style={{ color: "hsl(var(--text-muted))", fontSize: "14px" }}>Memuat...</p>
      ) : links.length === 0 ? (
        <p style={{ color: "hsl(var(--text-muted))", fontSize: "14px", padding: "20px", textAlign: "center", border: "1px dashed hsl(var(--border))", borderRadius: "12px" }}>
          Belum ada link pendaftaran toko.
        </p>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {links.map((link) => (
            <div
              key={link.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "10px",
                border: `1px solid ${link.isActive ? "hsl(142 70% 45% / 0.3)" : "hsl(var(--border))"}`,
                background: link.isActive ? "hsl(142 70% 45% / 0.06)" : "hsl(var(--bg-elevated))",
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "13px", fontFamily: "monospace", fontWeight: 700, color: "hsl(var(--primary))" }}>
                    /register/store/{link.token}
                  </span>
                  <span style={{
                    fontSize: "10px", padding: "2px 8px", borderRadius: "999px", fontWeight: 600,
                    background: link.isActive ? "hsl(142 70% 45% / 0.15)" : "hsl(var(--bg-surface))",
                    color: link.isActive ? "hsl(142 70% 45%)" : "hsl(var(--text-muted))",
                  }}>
                    {link.isActive ? "AKTIF" : "NON-AKTIF"}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "4px" }}>
                  Agen: {link.agent.name} · Dipakai: {link.useCount}× · {new Date(link.createdAt).toLocaleDateString("id-ID")}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                {link.isActive && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => copyLink(link.token)}
                  >
                    Salin
                  </button>
                )}
                <button
                  className={`btn btn-sm ${link.isActive ? "btn-ghost" : "btn-primary"}`}
                  style={link.isActive ? { color: "hsl(var(--error))" } : {}}
                  onClick={() => toggleActive(link)}
                >
                  {link.isActive ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
