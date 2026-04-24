"use client";

import { useTheme } from "@/contexts/AppProviders";

const themes = [
  {
    id: "pro",
    name: "Pro (Default)",
    desc: "Nuansa Biru & Oranye yang tajam dan profesional.",
    colors: ["#1e40af", "#f97316"],
  },
  {
    id: "starbucks",
    name: "Green",
    desc: "Hijau dalam dan elegan, terinspirasi dari brand kopi dunia.",
    colors: ["#00704A", "#004225"],
  },
  {
    id: "landing",
    name: "Vibrant Landing",
    desc: "Kombinasi Oranye & Indigo persis seperti landing page.",
    colors: ["#f97316", "#4338ca"],
  },
  {
    id: "chic",
    name: "Chic Rose",
    desc: "Nuansa Rose & Gold yang mewah dan feminin.",
    colors: ["#db2777", "#fbbf24"],
  },
];

export default function ThemeSwitcherClient() {
  const { theme, setTheme, mode, toggleMode } = useTheme();

  return (
    <section className="card animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "20px" }}>Personalisasi Tampilan</h2>
          <p style={{ marginTop: "4px", fontSize: "14px", color: "hsl(var(--text-secondary))" }}>
            Pilih tema dan mode warna yang paling nyaman bagi Anda.
          </p>
        </div>
        <button 
          onClick={toggleMode}
          className="btn btn-ghost"
          style={{ padding: "8px 16px" }}
        >
          {mode === "dark" ? "☀️ Mode Terang" : "🌙 Mode Gelap"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        {themes.map((t) => (
          <div 
            key={t.id}
            onClick={() => setTheme(t.id as any)}
            style={{
              padding: "16px",
              borderRadius: "16px",
              background: theme === t.id ? "hsl(var(--primary) / 0.1)" : "hsl(var(--bg-elevated))",
              border: `2px solid ${theme === t.id ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
              cursor: "pointer",
              transition: "all 0.2s ease",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {theme === t.id && (
              <div style={{ 
                position: "absolute", top: "12px", right: "12px", 
                background: "hsl(var(--primary))", color: "white", 
                width: "20px", height: "20px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", fontWeight: "bold"
              }}>
                ✓
              </div>
            )}
            
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              {t.colors.map((c, idx) => (
                <div key={idx} style={{ width: "24px", height: "24px", borderRadius: "6px", background: c, border: "1px solid rgba(255,255,255,0.1)" }} />
              ))}
            </div>

            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px", color: theme === t.id ? "hsl(var(--primary))" : "inherit" }}>
              {t.name}
            </h3>
            <p style={{ fontSize: "12px", color: "hsl(var(--text-secondary))", lineHeight: "1.4" }}>
              {t.desc}
            </p>
          </div>
        ))}
      </div>

      <style jsx>{`
        .card:hover { border-color: hsl(var(--primary) / 0.3); }
      `}</style>
    </section>
  );
}
