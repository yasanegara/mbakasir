"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/AppProviders";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  targetRole: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const EMPTY = {
  title: "",
  content: "",
  type: "info",
  targetRole: "ALL",
  isActive: true,
  expiresAt: "",
};

const TYPE_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  info:    { label: "Info",     color: "hsl(var(--primary))",  bg: "hsl(var(--primary)/0.08)",  icon: "ℹ️" },
  success: { label: "Sukses",   color: "hsl(var(--success))",  bg: "hsl(var(--success)/0.08)",  icon: "✅" },
  warning: { label: "Peringatan",color: "hsl(var(--warning))", bg: "hsl(var(--warning)/0.08)",  icon: "⚠️" },
  error:   { label: "Penting",  color: "hsl(var(--error))",    bg: "hsl(var(--error)/0.08)",    icon: "🚨" },
};

export default function AnnouncementAdminClient() {
  const { toast } = useToast();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/announcements");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const openNew = () => {
    setEditId(null);
    setForm(EMPTY);
    setShowForm(true);
  };

  const openEdit = (item: Announcement) => {
    setEditId(item.id);
    setForm({
      title: item.title,
      content: item.content,
      type: item.type,
      targetRole: item.targetRole,
      isActive: item.isActive,
      expiresAt: item.expiresAt ? item.expiresAt.slice(0, 16) : "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast("Judul dan konten wajib", "error");
      return;
    }
    setSaving(true);
    try {
      const url = editId ? `/api/admin/announcements/${editId}` : "/api/admin/announcements";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, expiresAt: form.expiresAt || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast(editId ? "Banner diperbarui!" : "Banner dibuat!", "success");
      setShowForm(false);
      fetchItems();
    } catch (e: any) {
      toast(`Gagal: ${e.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus pengumuman ini?")) return;
    await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    toast("Dihapus", "info");
    fetchItems();
  };

  const toggleActive = async (item: Announcement) => {
    await fetch(`/api/admin/announcements/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    fetchItems();
  };

  return (
    <div style={{ display: "grid", gap: "24px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <p style={{ fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
            {items.filter(i => i.isActive).length} aktif · {items.length} total
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          📣 Buat Pengumuman Baru
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card" style={{ border: "1px solid hsl(var(--primary)/0.3)" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "20px" }}>
            {editId ? "✏️ Edit Pengumuman" : "📣 Pengumuman Baru"}
          </h3>

          {/* Preview Banner */}
          {form.title && (
            <div style={{
              padding: "14px 18px",
              borderRadius: "12px",
              marginBottom: "20px",
              background: TYPE_META[form.type]?.bg || TYPE_META.info.bg,
              border: `1px solid ${TYPE_META[form.type]?.color || TYPE_META.info.color}44`,
              borderLeft: `4px solid ${TYPE_META[form.type]?.color || TYPE_META.info.color}`,
            }}>
              <div style={{ fontWeight: 700, color: TYPE_META[form.type]?.color, fontSize: "14px", marginBottom: "4px" }}>
                {TYPE_META[form.type]?.icon} {form.title}
              </div>
              <div style={{ fontSize: "13px", color: "hsl(var(--text-secondary))" }}>{form.content}</div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Judul Banner *</label>
              <input
                className="input-field"
                placeholder="Contoh: Update Sistem 21 April 2026"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Isi Pesan *</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Tulis isi pengumuman..."
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Tipe Banner</label>
              <select className="input-field" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="info">ℹ️ Info</option>
                <option value="success">✅ Sukses</option>
                <option value="warning">⚠️ Peringatan</option>
                <option value="error">🚨 Penting</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Target Penerima</label>
              <select className="input-field" value={form.targetRole} onChange={(e) => setForm((f) => ({ ...f, targetRole: e.target.value }))}>
                <option value="ALL">🌐 Semua Pengguna</option>
                <option value="AGENT">🤝 Agen saja</option>
                <option value="TENANT">🏪 Owner Toko saja</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Kadaluarsa (opsional)</label>
              <input
                className="input-field"
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Aktif (tampil ke pengguna)
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "20px", justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Batal</button>
            <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? "Menyimpan..." : editId ? "💾 Simpan" : "📣 Kirim Pengumuman"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="card">
        <div style={{ paddingBottom: "14px", borderBottom: "1px solid hsl(var(--border))", marginBottom: "18px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700 }}>📋 Riwayat Pengumuman</h3>
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "hsl(var(--text-muted))" }}>Memuat...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", border: "1px dashed hsl(var(--border))", borderRadius: "12px" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📣</div>
            <p style={{ color: "hsl(var(--text-muted))" }}>Belum ada pengumuman.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {items.map((item) => {
              const meta = TYPE_META[item.type] || TYPE_META.info;
              const isExpired = item.expiresAt && new Date(item.expiresAt) < new Date();
              return (
                <div key={item.id} style={{
                  padding: "14px 16px",
                  borderRadius: "10px",
                  border: "1px solid hsl(var(--border))",
                  borderLeft: `4px solid ${meta.color}`,
                  background: item.isActive && !isExpired ? meta.bg : "hsl(var(--bg-elevated))",
                  opacity: !item.isActive || isExpired ? 0.6 : 1,
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}>
                  <span style={{ fontSize: "22px", flexShrink: 0, marginTop: "2px" }}>{meta.icon}</span>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <div style={{ fontWeight: 700, fontSize: "14px" }}>{item.title}</div>
                    <div style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", marginTop: "2px" }}>{item.content}</div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                      <span className="badge" style={{ fontSize: "11px" }}>{item.targetRole}</span>
                      <span className={`badge ${item.isActive && !isExpired ? "badge-success" : ""}`} style={{ fontSize: "11px" }}>
                        {isExpired ? "⏰ Kadaluarsa" : item.isActive ? "✅ Aktif" : "⚫ Nonaktif"}
                      </span>
                      {item.expiresAt && (
                        <span style={{ fontSize: "11px", color: "hsl(var(--text-muted))" }}>
                          Exp: {new Date(item.expiresAt).toLocaleDateString("id-ID")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => toggleActive(item)}>
                      {item.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={() => openEdit(item)}>✏️</button>
                    <button className="btn btn-sm btn-ghost" style={{ color: "hsl(var(--error))" }} onClick={() => handleDelete(item.id)}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
