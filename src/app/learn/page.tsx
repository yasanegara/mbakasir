"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { renderMarkdown } from "@/lib/markdown";

interface Doc {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  emoji: string | null;
  targetRole: string;
  createdAt: string;
}

export default function LearnPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Doc | null>(null);

  useEffect(() => {
    fetch("/api/learn")
      .then((r) => r.json())
      .then((data) => {
        setDocs(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  return (
    <DashboardLayout title={selected ? selected.title : "Pusat Belajar"}>
      {selected ? (
        /* ── ARTICLE VIEW ── */
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginBottom: "20px" }}
            onClick={() => setSelected(null)}
          >
            ← Kembali ke Daftar
          </button>
          <div className="card">
            <div style={{
              paddingBottom: "20px",
              borderBottom: "1px solid hsl(var(--border))",
              marginBottom: "24px",
            }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>{selected.emoji || "📄"}</div>
              <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 800, lineHeight: 1.3 }}>
                {selected.title}
              </h1>
              {selected.excerpt && (
                <p style={{ fontSize: "15px", color: "hsl(var(--text-secondary))", marginTop: "8px", lineHeight: 1.6 }}>
                  {selected.excerpt}
                </p>
              )}
              <p style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "10px" }}>
                Diperbarui: {new Date(selected.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric", month: "long", year: "numeric"
                })}
              </p>
            </div>
            <div
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(selected.content) }}
            />
          </div>
        </div>
      ) : (
        /* ── DOC LIST ── */
        <div style={{ display: "grid", gap: "24px" }}>
          <div className="card" style={{
            background: "var(--gradient-primary)",
            color: "white",
            border: "none",
          }}>
            <h1 style={{ fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 800, marginBottom: "8px" }}>
              📚 Pusat Belajar MbaKasir
            </h1>
            <p style={{ fontSize: "14px", opacity: 0.9, maxWidth: "500px" }}>
              Kumpulan panduan, tutorial, dan tips untuk memaksimalkan penggunaan MbaKasir.
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px", color: "hsl(var(--text-muted))" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>📖</div>
              Memuat artikel...
            </div>
          ) : docs.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "60px",
              border: "1px dashed hsl(var(--border))", borderRadius: "16px",
            }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
              <p style={{ color: "hsl(var(--text-secondary))", fontSize: "15px" }}>
                Belum ada artikel yang tersedia. Cek lagi nanti! 😊
              </p>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "16px",
            }}>
              {docs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelected(doc)}
                  style={{
                    textAlign: "left",
                    padding: "24px",
                    background: "hsl(var(--bg-card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "16px",
                    cursor: "pointer",
                    transition: "border-color 0.2s, transform 0.15s, box-shadow 0.2s",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--primary)/0.5)";
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 24px hsl(var(--primary)/0.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--border))";
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                  }}
                >
                  <span style={{ fontSize: "36px" }}>{doc.emoji || "📄"}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "16px", lineHeight: 1.3, marginBottom: "6px" }}>
                      {doc.title}
                    </div>
                    {doc.excerpt && (
                      <div style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", lineHeight: 1.5 }}>
                        {doc.excerpt}
                      </div>
                    )}
                  </div>
                  <div style={{
                    marginTop: "auto",
                    fontSize: "12px",
                    color: "hsl(var(--primary))",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}>
                    Baca selengkapnya →
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
