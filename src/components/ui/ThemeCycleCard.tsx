"use client";

import { useTheme } from "@/contexts/AppProviders";

const themes = [
  { id: "pro", color: "#1e40af", label: "Pro" },
  { id: "starbucks", color: "#00704A", label: "Green" },
  { id: "landing", color: "#f97316", label: "Landing" },
  { id: "chic", color: "#db2777", label: "Chic" },
];

export default function ThemeCycleCard() {
  const { theme, setTheme } = useTheme();

  const handleCycleTheme = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentIndex = themes.findIndex(t => t.id === theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex].id as any);
  };

  const currentThemeObj = themes.find(t => t.id === theme) || themes[0];

  return (
    <div 
      onClick={handleCycleTheme}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "16px 20px",
        background: "hsl(var(--bg-card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "16px",
        cursor: "pointer",
        userSelect: "none",
        transition: "all 0.2s ease",
        boxShadow: "var(--shadow-sm)"
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.5)"}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = "hsl(var(--border))"}
    >
      <div style={{ 
        width: "20px", 
        height: "20px", 
        borderRadius: "50%", 
        background: currentThemeObj.color,
        boxShadow: `0 0 10px ${currentThemeObj.color}44`,
        flexShrink: 0,
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Glossy effect like a marble */}
        <div style={{ 
          position: "absolute", 
          top: "2px", 
          left: "2px", 
          width: "8px", 
          height: "8px", 
          background: "rgba(255,255,255,0.4)", 
          borderRadius: "50%" 
        }} />
      </div>
      
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: "16px", fontWeight: 700, color: "hsl(var(--text-primary))" }}>
          Aksen: {currentThemeObj.label}
        </span>
      </div>

      <div style={{ fontSize: "12px", color: "hsl(var(--text-muted))", fontWeight: 600 }}>
        Tap untuk Ganti →
      </div>
    </div>
  );
}
