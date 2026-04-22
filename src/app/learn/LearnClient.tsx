"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { renderMarkdown } from "@/lib/markdown";
import {
  buildStoreRegistrationPath,
  isStoreRegistrationToken,
  normalizeStoreRegistrationToken,
} from "@/lib/store-registration-shared";

interface Doc {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  emoji: string | null;
  targetRole: string;
  isPublic: boolean;
  version: number;
  createdAt: string;
}

function LearnArticleView({
  selected,
  onBack,
  backLabel = "← Kembali ke Daftar",
  registrationToken,
}: {
  selected: Doc;
  onBack: () => void;
  backLabel?: string;
  registrationToken?: string | null;
}) {
  const ctaHref = registrationToken
    ? buildStoreRegistrationPath(registrationToken)
    : "/";

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <button
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: "20px" }}
        onClick={onBack}
      >
        {backLabel}
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
            Versi {selected.version || 1} &nbsp;·&nbsp; Diperbarui: {new Date(selected.createdAt).toLocaleDateString("id-ID", {
              day: "numeric", month: "long", year: "numeric"
            })}
          </p>
        </div>
        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(selected.content) }}
        />

        {selected.isPublic && (
          <div style={{
            marginTop: "48px",
            padding: "32px",
            background: "hsl(var(--primary) / 0.05)",
            border: "1px dashed hsl(var(--primary) / 0.3)",
            borderRadius: "24px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🚀</div>
            <h3 style={{ fontWeight: 800, fontSize: "20px", marginBottom: "8px", color: "hsl(var(--text-primary))" }}>
              Mau Kelola Toko Secerdas Ini?
            </h3>
            <p style={{ fontSize: "15px", color: "hsl(var(--text-secondary))", marginBottom: "20px", lineHeight: 1.6 }}>
              Gunakan **MbaKasir** untuk automasi stok, laporan untung, dan kasir yang anti-ribet. 
              Mari majukan UMKM bareng-bareng!
            </p>
            <Link 
              href={ctaHref}
              className="btn btn-primary"
              style={{ textDecoration: "none", display: "inline-block", padding: "12px 24px" }}
            >
              {registrationToken ? "Daftar Toko via Agen Ini" : "Coba MbaKasir Gratis Sekarang!"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function LearnListView({
  docs,
  loading,
  onSelect,
}: {
  docs: Doc[];
  loading: boolean;
  onSelect: (doc: Doc) => void;
}) {
  return (
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
              onClick={() => onSelect(doc)}
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
  );
}

function LearnContent() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Doc | null>(null);

  const searchParams = useSearchParams();
  const requestedSlug = searchParams.get("s");
  const sharedTokenRaw = searchParams.get("agent") ?? searchParams.get("store");
  const registrationToken = sharedTokenRaw && isStoreRegistrationToken(sharedTokenRaw)
    ? normalizeStoreRegistrationToken(sharedTokenRaw)
    : null;

  useEffect(() => {
    fetch("/api/learn")
      .then((r) => r.json())
      .then((data) => {
        const docsArray = Array.isArray(data) ? data : [];
        setDocs(docsArray);
        setLoading(false);

        // Auto-select if slug matches
        if (requestedSlug) {
          const doc = docsArray.find((d: Doc) => d.slug === requestedSlug);
          if (doc) setSelected(doc);
        }
      });
  }, [requestedSlug]);

  if (requestedSlug && (loading || selected?.isPublic)) {
    return (
      <main
        className="page-body animate-fade-in"
        style={{
          minHeight: "100vh",
          padding: "24px",
          background: "hsl(var(--bg-base))",
        }}
      >
        <div style={{ maxWidth: "1040px", margin: "0 auto", display: "grid", gap: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <Link
              href="/"
              style={{
                textDecoration: "none",
                fontWeight: 800,
                color: "hsl(var(--text-primary))",
                fontSize: "18px",
              }}
            >
              MbaKasir
            </Link>
            <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>
              Artikel Eksternal
            </div>
          </div>

          {selected ? (
            <LearnArticleView
              selected={selected}
              onBack={() => {
                if (window.history.length > 1) {
                  window.history.back();
                  return;
                }
                window.location.href = "/";
              }}
              backLabel="← Kembali"
              registrationToken={registrationToken}
            />
          ) : (
            <div className="card" style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center", padding: "56px 24px" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>📖</div>
              <div style={{ fontSize: "15px", color: "hsl(var(--text-secondary))" }}>
                {loading ? "Memuat artikel..." : "Artikel tidak ditemukan atau tidak bisa dibuka."}
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <DashboardLayout title={selected ? selected.title : "Pusat Belajar"}>
      {selected ? (
        <LearnArticleView selected={selected} onBack={() => setSelected(null)} registrationToken={registrationToken} />
      ) : (
        <LearnListView docs={docs} loading={loading} onSelect={setSelected} />
      )}
    </DashboardLayout>
  );
}

export default function LearnClient() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner" />
      </div>
    }>
      <LearnContent />
    </Suspense>
  );
}
