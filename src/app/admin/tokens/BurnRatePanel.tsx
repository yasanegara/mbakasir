"use client";

import { formatRupiahFull } from "@/lib/utils";

interface Analytics {
  totalMinted: number;
  totalBurned: number;
  totalBalance: number;
  burnRatePerMonth: number;
  runwayMonths: number | null;
  utilizationPct: number;
  totalDepositValue: number;
  totalBurnedValue: number;
  totalIdleValue: number;
  estimatedRevenue: number;
  estimatedCogs: number;
  estimatedGrossProfit: number;
  grossMarginPct: number;
  HPP_RATIO: number;
  monthlyBurn: Record<string, number>;
  tokenSymbol: string;
  tokenPrice: number;
}

// ── Mini Bar Chart ──────────────────────────────────────────────
function SparkBar({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "72px", marginTop: "12px" }}>
      {entries.map(([key, val]) => {
        const pct = (val / max) * 100;
        const monthIdx = parseInt(key.split("-")[1]) - 1;
        const isCurrentMonth = key === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
        return (
          <div
            key={key}
            title={`${months[monthIdx]}: ${val.toLocaleString()} token dibakar`}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}
          >
            <div
              style={{
                width: "100%",
                height: `${Math.max(pct, 4)}%`,
                borderRadius: "4px 4px 0 0",
                background: isCurrentMonth
                  ? "hsl(var(--primary))"
                  : `hsl(var(--primary) / ${0.3 + (pct / 100) * 0.6})`,
                transition: "height 0.4s ease",
                minHeight: "4px",
              }}
            />
            <span style={{ fontSize: "9px", color: "hsl(var(--text-muted))", transform: "rotate(-30deg)", transformOrigin: "center" }}>
              {months[monthIdx]?.slice(0, 3)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Progress Bar ─────────────────────────────────────────────────
function ProgressBar({ value, max, color, label, sublabel }: {
  value: number;
  max: number;
  color: string;
  label: string;
  sublabel?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
        <span style={{ fontSize: "13px", fontWeight: 600 }}>{label}</span>
        {sublabel && <span style={{ fontSize: "12px", color: "hsl(var(--text-muted))" }}>{sublabel}</span>}
      </div>
      <div style={{ height: "10px", borderRadius: "999px", background: "hsl(var(--bg-elevated))", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: "999px",
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

// ── Suggestion Engine ─────────────────────────────────────────────
function getSuggestions(a: Analytics): { icon: string; level: "info" | "warn" | "danger" | "success"; text: string }[] {
  const suggestions = [];

  if (a.utilizationPct < 30) {
    suggestions.push({
      icon: "📉",
      level: "warn" as const,
      text: `Utilisasi token baru ${a.utilizationPct}% — banyak token dibeli tapi belum dipakai. Dorong agen aktifkan toko yang masih LOCKED.`,
    });
  } else if (a.utilizationPct > 85) {
    suggestions.push({
      icon: "🔥",
      level: "success" as const,
      text: `Utilisasi token tinggi (${a.utilizationPct}%) — ekosistem sehat dan aktif. Pertimbangkan menambah kapasitas mint.`,
    });
  }

  if (a.runwayMonths !== null && a.runwayMonths < 3) {
    suggestions.push({
      icon: "⚠️",
      level: "danger" as const,
      text: `Runway saldo hanya ${a.runwayMonths} bulan — agen perlu segera top-up token agar perpanjangan toko tidak terputus.`,
    });
  }

  if (a.grossMarginPct < 40) {
    suggestions.push({
      icon: "🏭",
      level: "warn" as const,
      text: `Gross margin ${a.grossMarginPct}% terlalu tipis. Pertimbangkan menaikkan harga token atau memangkas biaya operasional.`,
    });
  } else if (a.grossMarginPct >= 60) {
    suggestions.push({
      icon: "💹",
      level: "success" as const,
      text: `Gross margin ${a.grossMarginPct}% sangat sehat! Ini ruang untuk investasi ke fitur baru atau diskon loyalitas agen besar.`,
    });
  }

  if (a.burnRatePerMonth === 0) {
    suggestions.push({
      icon: "😴",
      level: "info" as const,
      text: `Belum ada aktivasi toko dalam 3 bulan terakhir. Periksa apakah agen aktif memproses pelanggan baru.`,
    });
  } else if (a.burnRatePerMonth >= 50) {
    suggestions.push({
      icon: "🚀",
      level: "success" as const,
      text: `Burn rate ${a.burnRatePerMonth.toLocaleString()} ${a.tokenSymbol}/bulan — pertumbuhan aktivasi sangat positif!`,
    });
  }

  if (a.totalIdleValue > a.totalBurnedValue) {
    suggestions.push({
      icon: "💤",
      level: "info" as const,
      text: `Nilai saldo tidur (${formatRupiahFull(a.totalIdleValue)}) lebih besar dari nilai token terpakai. Pertimbangkan program promosi "pakai sekarang dapat bonus" untuk agen.`,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      icon: "✅",
      level: "success" as const,
      text: "Semua indikator dalam kondisi normal. Lanjutkan monitoring mingguan.",
    });
  }

  return suggestions;
}

const levelStyles: Record<string, { bg: string; border: string; iconBg: string }> = {
  success: { bg: "hsl(142 70% 45% / 0.08)", border: "hsl(142 70% 45% / 0.3)", iconBg: "hsl(142 70% 45% / 0.15)" },
  warn:    { bg: "hsl(38 92% 50% / 0.08)",  border: "hsl(38 92% 50% / 0.35)",  iconBg: "hsl(38 92% 50% / 0.15)"  },
  danger:  { bg: "hsl(0 72% 51% / 0.08)",   border: "hsl(0 72% 51% / 0.35)",   iconBg: "hsl(0 72% 51% / 0.15)"   },
  info:    { bg: "hsl(var(--primary) / 0.07)", border: "hsl(var(--primary) / 0.25)", iconBg: "hsl(var(--primary) / 0.12)" },
};

// ── Main Panel ────────────────────────────────────────────────────
export default function BurnRatePanel({ analytics: a }: { analytics: Analytics }) {
  const suggestions = getSuggestions(a);
  const ops = a.HPP_RATIO * 100;
  const profit = 100 - ops;

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {/* ── Row 1: Token Flow + Chart ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
        {/* Token Flow */}
        <section className="card">
          <h2 style={{ fontSize: "17px", marginBottom: "18px" }}>Aliran Token</h2>
          <div style={{ display: "grid", gap: "12px" }}>
            <ProgressBar
              value={a.totalBurned}
              max={a.totalMinted}
              color="hsl(var(--primary))"
              label={`Token Terpakai (Burn)`}
              sublabel={`${a.totalBurned.toLocaleString()} / ${a.totalMinted.toLocaleString()} ${a.tokenSymbol}`}
            />
            <ProgressBar
              value={a.totalBalance}
              max={a.totalMinted}
              color="hsl(38 92% 50%)"
              label={`Saldo Tidur (Idle)`}
              sublabel={`${a.totalBalance.toLocaleString()} ${a.tokenSymbol}`}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginTop: "20px" }}>
            {[
              { label: "Total Mint", val: a.totalMinted, color: "hsl(var(--text-secondary))" },
              { label: "Terpakai",   val: a.totalBurned,  color: "hsl(var(--primary))" },
              { label: "Sisa Idle",  val: a.totalBalance, color: "hsl(38 92% 50%)" },
            ].map((item) => (
              <div key={item.label} style={{ textAlign: "center", padding: "10px", borderRadius: "10px", background: "hsl(var(--bg-elevated))" }}>
                <div style={{ fontSize: "11px", color: "hsl(var(--text-muted))", marginBottom: "4px" }}>{item.label}</div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: item.color }}>{item.val.toLocaleString()}</div>
                <div style={{ fontSize: "10px", color: "hsl(var(--text-muted))" }}>{a.tokenSymbol}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Burn Rate Chart */}
        <section className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontSize: "17px" }}>Burn Rate Bulanan</h2>
              <p style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginTop: "2px" }}>12 bulan terakhir</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "hsl(var(--primary))" }}>
                {a.burnRatePerMonth.toLocaleString()}
              </div>
              <div style={{ fontSize: "11px", color: "hsl(var(--text-muted))" }}>{a.tokenSymbol}/bulan (rata-rata)</div>
              {a.runwayMonths !== null && (
                <div style={{
                  marginTop: "4px",
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: a.runwayMonths < 3 ? "hsl(0 72% 51% / 0.15)" : "hsl(142 70% 45% / 0.12)",
                  color: a.runwayMonths < 3 ? "hsl(0 72% 51%)" : "hsl(142 70% 45%)",
                  fontWeight: 600,
                }}>
                  Runway: ~{a.runwayMonths} bulan
                </div>
              )}
            </div>
          </div>
          <SparkBar data={a.monthlyBurn} />
        </section>
      </div>

      {/* ── Row 2: Nilai Rupiah + P&L ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
        {/* Nilai Deposit */}
        <section className="card">
          <h2 style={{ fontSize: "17px", marginBottom: "18px" }}>Nilai Deposit (Rupiah)</h2>
          <div style={{ display: "grid", gap: "12px" }}>
            {[
              { label: "Total Deposit Masuk", val: a.totalDepositValue, hint: "Nilai nyata dari harga yang dibayar agen (eceran + bundling)", bold: true },
              { label: "Nilai Token Terpakai", val: a.totalBurnedValue,  hint: "Revenue recognised (burn)" },
              { label: "Nilai Saldo Idle",     val: a.totalIdleValue,   hint: "Belum dikonsumsi / belum revenue" },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "hsl(var(--bg-elevated))",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: row.bold ? 700 : 500 }}>{row.label}</div>
                  <div style={{ fontSize: "11px", color: "hsl(var(--text-muted))", marginTop: "2px" }}>{row.hint}</div>
                </div>
                <div style={{ fontSize: "15px", fontWeight: 800, color: row.bold ? "hsl(var(--primary))" : undefined }}>
                  {formatRupiahFull(row.val)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* P&L Breakdown */}
        <section className="card">
          <h2 style={{ fontSize: "17px", marginBottom: "4px" }}>Estimasi P&amp;L</h2>
          <p style={{ fontSize: "12px", color: "hsl(var(--text-muted))", marginBottom: "18px" }}>
            Berdasarkan asumsi HPP {ops.toFixed(0)}% operasional. Hanya dari token TERPAKAI.
          </p>
          <div style={{ display: "grid", gap: "12px" }}>
            {[
              { label: "Revenue Recognised",   val: a.estimatedRevenue,      color: "hsl(var(--primary))" },
              { label: `Estimasi COGS (${ops.toFixed(0)}%)`, val: a.estimatedCogs, color: "hsl(0 72% 51%)" },
              { label: "Estimasi Gross Profit", val: a.estimatedGrossProfit,   color: "hsl(142 70% 45%)" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: "10px", background: "hsl(var(--bg-elevated))" }}>
                <span style={{ fontSize: "13px", fontWeight: 500 }}>{row.label}</span>
                <span style={{ fontSize: "15px", fontWeight: 800, color: row.color }}>{formatRupiahFull(row.val)}</span>
              </div>
            ))}
          </div>

          {/* Donut-style breakdown bar */}
          <div style={{ marginTop: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
              <span style={{ color: "hsl(0 72% 51%)", fontWeight: 600 }}>🔴 Operasional {ops.toFixed(0)}%</span>
              <span style={{ color: "hsl(142 70% 45%)", fontWeight: 600 }}>🟢 Profit {profit.toFixed(0)}%</span>
            </div>
            <div style={{ display: "flex", height: "16px", borderRadius: "999px", overflow: "hidden", gap: "2px" }}>
              <div style={{ flex: ops, background: "hsl(0 72% 51% / 0.8)", borderRadius: "999px 0 0 999px" }} />
              <div style={{ flex: profit, background: "hsl(142 70% 45% / 0.85)", borderRadius: "0 999px 999px 0" }} />
            </div>
            <div style={{ textAlign: "center", marginTop: "8px", fontSize: "13px", color: "hsl(var(--text-muted))" }}>
              Gross Margin: <strong style={{ color: a.grossMarginPct >= 50 ? "hsl(142 70% 45%)" : "hsl(38 92% 50%)" }}>{a.grossMarginPct}%</strong>
            </div>
          </div>
        </section>
      </div>

      {/* ── Row 3: Suggestions ── */}
      <section className="card">
        <h2 style={{ fontSize: "17px", marginBottom: "14px" }}>💡 Rekomendasi Sistem</h2>
        <div style={{ display: "grid", gap: "10px" }}>
          {suggestions.map((s, i) => {
            const st = levelStyles[s.level];
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "14px",
                  alignItems: "flex-start",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: st.bg,
                  border: `1px solid ${st.border}`,
                }}
              >
                <div style={{
                  width: "32px", height: "32px", borderRadius: "8px", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: "16px",
                  background: st.iconBg, flexShrink: 0,
                }}>
                  {s.icon}
                </div>
                <p style={{ fontSize: "13px", lineHeight: "1.6", margin: 0 }}>{s.text}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
