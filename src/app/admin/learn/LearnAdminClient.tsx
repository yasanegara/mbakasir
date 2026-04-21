"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/contexts/AppProviders";
import { renderMarkdown } from "@/lib/markdown";

interface Doc {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  emoji: string | null;
  targetRole: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
}

const EMPTY_FORM = {
  title: "",
  content: "",
  excerpt: "",
  emoji: "📄",
  targetRole: "AGENT",
  isPublished: false,
  sortOrder: 0,
};

const TEMPLATE_MARKDOWN = `# Judul Artikel

## Pendahuluan

Tulis penjelasan singkat di sini. Gunakan **cetak tebal** atau *miring* untuk penekanan.

## Cara Penggunaan

1. Langkah pertama
2. Langkah kedua
3. Langkah ketiga

## Tips Penting

> Ini adalah catatan penting yang perlu diperhatikan.

- Item list satu
- Item list dua
- Item list tiga

## Contoh Kode

\`\`\`
contoh kode di sini
\`\`\`

---

Terima kasih sudah membaca! 🙏
`;

export default function LearnAdminClient() {
  const { toast } = useToast();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [tab, setTab] = useState<"list" | "editor">("list");
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/learn");
    const data = await res.json();
    setDocs(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, []);

  const openNew = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, content: TEMPLATE_MARKDOWN });
    setTab("editor");
    setPreviewMode(false);
  };

  const openEdit = (doc: Doc) => {
    setEditId(doc.id);
    setForm({
      title: doc.title,
      content: doc.content,
      excerpt: doc.excerpt || "",
      emoji: doc.emoji || "📄",
      targetRole: doc.targetRole,
      isPublished: doc.isPublished,
      sortOrder: doc.sortOrder,
    });
    setTab("editor");
    setPreviewMode(false);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast("Judul dan konten wajib diisi", "error");
      return;
    }
    setSaving(true);
    try {
      const url = editId ? `/api/admin/learn/${editId}` : "/api/admin/learn";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast(editId ? "Dokumen diperbarui!" : "Dokumen dibuat!", "success");
      await fetchDocs();
      setTab("list");
    } catch (e: any) {
      toast(`Gagal: ${e.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Hapus dokumen "${title}"?`)) return;
    const res = await fetch(`/api/admin/learn/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Dokumen dihapus", "info");
      fetchDocs();
    }
  };

  const togglePublish = async (doc: Doc) => {
    try {
      const res = await fetch(`/api/admin/learn/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !doc.isPublished }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      toast(doc.isPublished ? "Dokumen disembunyikan" : "Dokumen dipublikasikan!", "success");
      fetchDocs();
    } catch (e: any) {
      toast(e.message, "error");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check size limit (e.g., max 2MB for base64 to avoid huge DB limits)
    if (file.size > 2 * 1024 * 1024) {
      toast("Ukuran gambar maksimal 2MB", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result;
      if (typeof base64 === "string") {
        insertSnippet(`\n![Gambar](${base64})\n`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // Reset let file be re-selectable
  };

  const insertSnippet = (snippet: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newContent = form.content.slice(0, start) + snippet + form.content.slice(end);
    setForm((f) => ({ ...f, content: newContent }));
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + snippet.length;
      el.focus();
    }, 10);
  };

  const roleColor: Record<string, string> = {
    AGENT: "hsl(var(--primary))",
    TENANT: "hsl(var(--success))",
    ALL: "hsl(var(--warning))",
  };

  return (
    <div style={{ display: "grid", gap: "24px" }}>

      {/* ── TABS ── */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button
          className={`btn btn-sm ${tab === "list" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setTab("list")}
        >
          📚 Daftar Dokumen
        </button>
        <button
          className={`btn btn-sm ${tab === "editor" ? "btn-primary" : "btn-ghost"}`}
          onClick={openNew}
        >
          ✏️ Buat Dokumen Baru
        </button>
      </div>

      {/* ── DOCUMENT LIST ── */}
      {tab === "list" && (
        <div className="card">
          <div style={{ paddingBottom: "16px", borderBottom: "1px solid hsl(var(--border))", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 700 }}>📚 Semua Dokumen Learn</h3>
              <p style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", marginTop: "4px" }}>
                {docs.length} dokumen tersedia · {docs.filter(d => d.isPublished).length} dipublikasikan
              </p>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "48px", color: "hsl(var(--text-muted))" }}>Memuat...</div>
          ) : docs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px", border: "1px dashed hsl(var(--border))", borderRadius: "12px" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📄</div>
              <p style={{ color: "hsl(var(--text-muted))" }}>Belum ada dokumen. Klik "Buat Dokumen Baru" untuk mulai.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {docs.map((doc) => (
                <div key={doc.id} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "16px",
                  background: "hsl(var(--bg-elevated))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  flexWrap: "wrap",
                }}>
                  <span style={{ fontSize: "28px", flexShrink: 0 }}>{doc.emoji}</span>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <div style={{ fontWeight: 700, fontSize: "15px" }}>{doc.title}</div>
                    <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "2px" }}>
                      /{doc.slug}
                    </div>
                    {doc.excerpt && (
                      <div style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", marginTop: "4px", lineHeight: 1.4 }}>
                        {doc.excerpt}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "100px",
                        background: `${roleColor[doc.targetRole]}22`, color: roleColor[doc.targetRole], border: `1px solid ${roleColor[doc.targetRole]}44`
                      }}>
                        {doc.targetRole}
                      </span>
                      <span className={doc.isPublished ? "badge badge-success" : "badge"} style={{ fontSize: "11px" }}>
                        {doc.isPublished ? "✅ Publik" : "⚫ Draft"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button 
                      className={`btn btn-sm ${doc.isPublished ? "btn-ghost" : "btn-primary"}`} 
                      onClick={() => togglePublish(doc)}
                    >
                      {doc.isPublished ? "Sembunyikan" : "Publikasikan"}
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={() => openEdit(doc)}>✏️ Edit</button>
                    <button className="btn btn-sm btn-ghost" style={{ color: "hsl(var(--error))" }} onClick={() => handleDelete(doc.id, doc.title)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── EDITOR ── */}
      {tab === "editor" && (
        <div style={{ display: "grid", gap: "20px" }}>
          {/* Meta fields */}
          <div className="card">
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>
              {editId ? "✏️ Edit Dokumen" : "📝 Dokumen Baru"}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Judul *</label>
                <input
                  className="input-field"
                  placeholder="Judul dokumen..."
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Emoji</label>
                <input
                  className="input-field"
                  placeholder="📄"
                  value={form.emoji}
                  onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                  style={{ width: "80px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Target Pembaca</label>
                <select
                  className="input-field"
                  value={form.targetRole}
                  onChange={(e) => setForm((f) => ({ ...f, targetRole: e.target.value }))}
                >
                  <option value="AGENT">Agen saja</option>
                  <option value="TENANT">Owner Toko saja</option>
                  <option value="ALL">Semua pengguna</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Urutan (sort)</label>
                <input
                  className="input-field"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div style={{ marginTop: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Excerpt / Ringkasan</label>
              <input
                className="input-field"
                placeholder="Ringkasan singkat (tampil di list)..."
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              />
            </div>
            <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
                />
                Langsung Publikasikan
              </label>
            </div>
          </div>

          {/* Toolbar + Editor */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {/* Toolbar */}
            <div style={{
              padding: "12px 16px",
              borderBottom: "1px solid hsl(var(--border))",
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
              alignItems: "center",
              background: "hsl(var(--bg-elevated))",
            }}>
              {[
                { label: "B", insert: "**teks tebal**" },
                { label: "I", insert: "*teks miring*" },
                { label: "H1", insert: "# Heading 1\n" },
                { label: "H2", insert: "## Heading 2\n" },
                { label: "H3", insert: "### Heading 3\n" },
                { label: "```", insert: "```\nkode di sini\n```" },
                { label: "`kode`", insert: "`inline code`" },
                { label: "> kutip", insert: "> blockquote\n" },
                { label: "- list", insert: "- item\n" },
                { label: "1. list", insert: "1. item\n" },
                { label: "---", insert: "\n---\n" },
              ].map((t) => (
                <button
                  key={t.label}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: "12px", padding: "4px 8px", fontFamily: "monospace" }}
                  onClick={() => insertSnippet(t.insert)}
                >
                  {t.label}
                </button>
              ))}
              <div style={{ width: "1px", height: "20px", background: "hsl(var(--border))", margin: "0 4px" }} />
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: "12px", padding: "4px 8px", color: "hsl(var(--primary))" }}
                onClick={() => fileInputRef.current?.click()}
              >
                🖼️ Upload Gambar
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                style={{ display: "none" }} 
                onChange={handleImageUpload} 
              />
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: "12px", padding: "4px 8px" }}
                onClick={() => {
                  const icon = prompt("Masukkan emoji/icon (misal: 💡, ⚠️, 📌):", "📌");
                  if (icon) insertSnippet(icon + " ");
                }}
              >
                😀 Icon
              </button>
              <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                <button
                  className={`btn btn-sm ${!previewMode ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setPreviewMode(false)}
                >
                  ✏️ Edit
                </button>
                <button
                  className={`btn btn-sm ${previewMode ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setPreviewMode(true)}
                >
                  👁️ Preview
                </button>
              </div>
            </div>

            {/* Editor / Preview split */}
            {!previewMode ? (
              <textarea
                ref={textareaRef}
                className="input-field"
                style={{
                  minHeight: "480px",
                  fontFamily: "monospace",
                  fontSize: "14px",
                  borderRadius: 0,
                  border: "none",
                  resize: "vertical",
                  padding: "20px",
                  lineHeight: 1.7,
                }}
                placeholder="Tulis konten Markdown di sini..."
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            ) : (
              <div
                className="markdown-body"
                style={{ padding: "24px", minHeight: "480px" }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(form.content) }}
              />
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" onClick={() => setTab("list")}>Batal</button>
            <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? "Menyimpan..." : editId ? "💾 Simpan Perubahan" : "✅ Simpan Dokumen"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
