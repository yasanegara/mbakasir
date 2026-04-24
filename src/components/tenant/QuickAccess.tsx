"use client";

import Link from "next/link";

const items = [
  { href: "/pos", icon: "🖥️", label: "Kasir (POS)", color: "#0ea5e9" },
  { href: "/products", icon: "📦", label: "Produk", color: "#f59e0b" },
  { href: "/sales", icon: "📈", label: "Laporan", color: "#10b981" },
  { href: "/shopping-list", icon: "🛒", label: "Belanja", color: "#6366f1" },
  { href: "/inventory", icon: "🧪", label: "Bahan Baku", color: "#ec4899" },
  { href: "/settings", icon: "⚙️", label: "Pengaturan", color: "#94a3b8" },
];

export default function QuickAccess() {
  return (
    <div className="card" style={{ padding: "24px", borderRadius: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>⚡ Akses Cepat</h3>
        <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>Pintasan navigasi utama</span>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
        gap: "14px",
      }}>
        {items.map(({ href, icon, label, color }) => (
          <div key={href} className="quick-access-wrapper">
            <Link
              href={href}
              className="quick-access-item"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
                padding: "20px 10px",
                background: "hsl(var(--bg-elevated))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "20px",
                textDecoration: "none",
                color: "hsl(var(--text-primary))",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                overflow: "hidden"
              }}
            >
              <div style={{ 
                fontSize: "28px", 
                marginBottom: "4px",
                filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))"
              }}>{icon}</div>
              <span style={{ fontSize: "12px", fontWeight: 700, textAlign: "center" }}>{label}</span>
              
              <style jsx>{`
                .quick-access-item:hover {
                  transform: translateY(-5px);
                  border-color: ${color};
                  background: ${color}05;
                  box-shadow: 0 10px 20px -10px ${color}44;
                }
              `}</style>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
