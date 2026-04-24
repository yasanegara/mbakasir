"use client";

import { useEffect, useState } from "react";
import { formatRupiahFull } from "@/lib/utils";

interface TenantLicenseCountdownCardProps {
  premiumUntilIso: string | null;
  initialRemainingMs: number;
  renewalTokenCostPerMonth: number;
  tokenSymbol: string;
  renewalPriceEstimate: number | null;
  renewalBreakdown: string | null;
}

function getRemainingMs(premiumUntilIso: string | null) {
  if (!premiumUntilIso) {
    return 0;
  }

  return Math.max(0, new Date(premiumUntilIso).getTime() - Date.now());
}

function formatClock(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export default function TenantLicenseCountdownCard({
  premiumUntilIso,
  initialRemainingMs,
  renewalTokenCostPerMonth,
  tokenSymbol,
  renewalPriceEstimate,
  renewalBreakdown,
}: TenantLicenseCountdownCardProps) {
  const [remainingMs, setRemainingMs] = useState(initialRemainingMs);

  useEffect(() => {
    setRemainingMs(getRemainingMs(premiumUntilIso));

    if (!premiumUntilIso) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingMs(getRemainingMs(premiumUntilIso));
    }, 1000);

    return () => clearInterval(timer);
  }, [premiumUntilIso]);

  const premiumUntil = premiumUntilIso ? new Date(premiumUntilIso) : null;
  const isActive = premiumUntil ? remainingMs > 0 : false;
  const isUrgent = isActive && remainingMs <= 7 * 86400000;
  const days = Math.floor(remainingMs / 86400000);

  const accentColor = !premiumUntil
    ? "hsl(var(--error))"
    : isActive
      ? isUrgent
        ? "hsl(var(--warning))"
        : "hsl(var(--success))"
      : "hsl(var(--error))";

  const borderColor = !premiumUntil
    ? "hsl(var(--error)/0.4)"
    : isActive
      ? isUrgent
        ? "hsl(var(--warning)/0.5)"
        : "hsl(var(--success)/0.4)"
      : "hsl(var(--error)/0.4)";

  const countdownLabel = isActive
    ? `${days.toLocaleString("id-ID")} hari`
    : premiumUntil
      ? "Kadaluarsa"
      : "Belum aktif";

  const expiryLabel = premiumUntil
    ? premiumUntil.toLocaleString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Belum ada masa aktif yang berjalan";

  return (
    <div className="stat-card" style={{ borderColor }}>
      <span
        style={{
          fontSize: "13px",
          color: "hsl(var(--text-secondary))",
          fontWeight: 600,
        }}
      >
        {isActive ? "⏳ Countdown Lisensi" : "⛔ Status Lisensi"}
      </span>

      <div style={{ display: "grid", gap: "4px", marginTop: "6px" }}>
        <span
          className="stat-value"
          style={{
            fontSize: "clamp(20px, 3.8vw, 28px)",
            color: accentColor,
            lineHeight: 1.05,
          }}
        >
          {countdownLabel}
        </span>
        <span
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: accentColor,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: 0,
          }}
        >
          {isActive ? formatClock(remainingMs) : "00:00:00"}
        </span>
      </div>

      <span
        style={{
          fontSize: "12px",
          color: "hsl(var(--text-muted))",
          marginTop: "6px",
        }}
      >
        {premiumUntil ? `Berakhir ${expiryLabel}` : expiryLabel}
      </span>

      {renewalTokenCostPerMonth > 0 && (
        <div
          style={{
            marginTop: "12px",
            paddingTop: "12px",
            borderTop: "1px solid hsl(var(--border))",
            display: "grid",
            gap: "4px",
          }}
        >
          <span style={{ fontSize: "11px", color: "hsl(var(--text-muted))" }}>
            Estimasi perpanjangan 1 bulan
          </span>
          <span style={{ fontSize: "13px", fontWeight: 700 }}>
            {renewalTokenCostPerMonth.toLocaleString("id-ID")} {tokenSymbol}
            {renewalPriceEstimate && renewalPriceEstimate > 0
              ? ` • ${formatRupiahFull(renewalPriceEstimate)}`
              : ""}
          </span>
          {renewalBreakdown && (
            <span
              style={{ fontSize: "11px", color: "hsl(var(--text-secondary))" }}
            >
              {renewalBreakdown}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
