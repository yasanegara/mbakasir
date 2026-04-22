"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/AppProviders";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function AgentRegistrationLinkManager() {
  const [links, setLinks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [label, setLabel] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const res = await fetch("/api/admin/agent-links");
      const data = await res.json();
      if (res.ok) {
        setLinks(data.links);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await fetch("/api/admin/agent-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, customSlug }),
      });
      const data = await res.json();

      if (res.ok) {
        toast("Tautan pendaftaran agen berhasil dibuat", "success");
        setLabel("");
        setCustomSlug("");
        fetchLinks();
      } else {
        toast(data.error || "Gagal membuat tautan", "error");
      }
    } catch {
      toast("Kesalahan jaringan", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/agent/${token}`;
    navigator.clipboard.writeText(url);
    toast("Tautan disalin ke clipboard", "success");
  };

  const handleEdit = (link: any) => {
    setEditingId(link.id);
    setEditLabel(link.label || "");
  };

  const handleSaveEdit = async (id: string, currentIsActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/agent-links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: editLabel, isActive: currentIsActive }),
      });
      if (res.ok) {
        toast("Tautan berhasil diperbarui", "success");
        setEditingId(null);
        fetchLinks();
      } else {
        const data = await res.json();
        toast(data.error || "Gagal memperbarui", "error");
      }
    } catch {
      toast("Kesalahan jaringan", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus tautan ini?")) return;
    try {
      const res = await fetch(`/api/admin/agent-links/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast(data.message || "Tautan berhasil dihapus", "success");
        fetchLinks();
      } else {
        toast(data.error || "Gagal menghapus tautan", "error");
      }
    } catch {
      toast("Kesalahan jaringan", "error");
    }
  };

  return (
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "18px" }}>Tautan Pendaftaran Agen Baru</h2>
          <p style={{ marginTop: "6px", fontSize: "14px", color: "hsl(var(--text-secondary))", maxWidth: "600px" }}>
            Buat tautan undangan khusus untuk merekrut agen baru ke dalam jaringan Anda. Setiap tautan dapat dilacak.
          </p>
        </div>
      </div>

      <form onSubmit={generateLink} style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "24px", background: "hsl(var(--bg-elevated))", padding: "16px", borderRadius: "12px", border: "1px solid hsl(var(--border))" }}>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <label className="input-label">Label Rujukan (Misal: Iklan IG, Event A)</label>
          <input
            type="text"
            className="input-field"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Keterangan kampanye atau agen"
          />
        </div>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <label className="input-label">Custom Link / Slug (Opsional)</label>
          <div style={{ display: "flex", alignItems: "center", background: "hsl(var(--bg-card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", overflow: "hidden" }}>
            <span style={{ padding: "0 12px", color: "hsl(var(--text-muted))", fontSize: "14px", borderRight: "1px solid hsl(var(--border))" }}>mbakasir.id/agent/</span>
            <input
              type="text"
              style={{ border: "none", flex: 1, boxShadow: "none", borderRadius: 0 }}
              className="input-field"
              value={customSlug}
              onChange={(e) => setCustomSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase())}
              placeholder="acak"
            />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={isGenerating}>
          {isGenerating ? "Membangkitkan..." : "Buat Tautan"}
        </button>
      </form>

      <div style={{ display: "grid", gap: "12px" }}>
        {isLoading ? (
          <div style={{ color: "hsl(var(--text-muted))", fontSize: "14px" }}>Memuat tautan aktif...</div>
        ) : links.length === 0 ? (
          <div style={{ padding: "24px", background: "hsl(var(--bg-elevated))", borderRadius: "12px", textAlign: "center", color: "hsl(var(--text-muted))", border: "1px dashed hsl(var(--border))" }}>
            Belum ada tautan undangan agen yang dibuat.
          </div>
        ) : (
          links.map(link => (
            <div key={link.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "16px", background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border))", borderRadius: "12px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "250px" }}>
                <div style={{ fontWeight: 600, fontSize: "15px", color: "hsl(var(--primary))", marginBottom: "8px" }}>
                  {editingId === link.id ? (
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        autoFocus
                        className="input-field"
                        style={{ padding: "6px 10px", fontSize: "14px", minHeight: "32px", width: "220px", margin: 0 }}
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        placeholder="Label tautan..."
                      />
                      <button onClick={() => handleSaveEdit(link.id, link.isActive)} className="btn btn-primary" style={{ padding: "4px 12px", minHeight: "32px", fontSize: "13px" }}>Simpan</button>
                      <button onClick={() => setEditingId(null)} className="btn btn-ghost" style={{ padding: "4px 12px", minHeight: "32px", fontSize: "13px" }}>Batal</button>
                    </div>
                  ) : (
                    <span>
                      {link.label || "Tautan Rujukan Umum"} 
                      {!link.isActive && <span className="badge" style={{ marginLeft: "8px", fontSize: "11px", background: "hsl(var(--danger)/0.1)", color: "hsl(var(--danger))" }}>Dihapus (Soft)</span>}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", fontFamily: "monospace", padding: "6px 10px", background: "hsl(var(--bg-card))", borderRadius: "6px", border: "1px solid hsl(var(--border))", wordBreak: "break-all" }}>
                  /agent/{link.token}
                </div>
                <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "8px" }}>
                  Dibuat {formatDistanceToNow(new Date(link.createdAt), { addSuffix: true, locale: idLocale })} • Digunakan: {link.useCount} kali
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  onClick={() => copyToClipboard(link.token)}
                  className="btn"
                  style={{ background: "hsl(var(--primary)/0.1)", color: "hsl(var(--primary))", fontWeight: 600, border: "none", fontSize: "13px" }}
                >
                  Salin URL
                </button>
                <button
                  onClick={() => handleEdit(link)}
                  className="btn btn-ghost"
                  style={{ border: "1px solid hsl(var(--border))", fontSize: "13px" }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(link.id)}
                  className="btn"
                  style={{ background: "hsl(var(--danger)/0.1)", color: "hsl(var(--danger))", border: "1px solid hsl(var(--danger)/0.2)", fontSize: "13px" }}
                >
                  Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
