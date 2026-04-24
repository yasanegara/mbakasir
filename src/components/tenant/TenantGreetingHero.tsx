"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TenantGreetingHeroProps {
  userName: string;
  tenantName: string;
  agentName: string;
  greeting: string;
  premiumUntilIso: string | null;
  initialRemainingMs: number;
  sisaToken: number;
  tokenTerpakai: number;
}

interface PrayerTimes {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

function getRemainingMs(premiumUntilIso: string | null) {
  if (!premiumUntilIso) return 0;
  return Math.max(0, new Date(premiumUntilIso).getTime() - Date.now());
}

function formatClock(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}

export default function TenantGreetingHero({
  userName,
  tenantName,
  agentName,
  greeting,
  premiumUntilIso,
  initialRemainingMs,
  sisaToken,
  tokenTerpakai,
}: TenantGreetingHeroProps) {
  const [remainingMs, setRemainingMs] = useState(initialRemainingMs);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);

  useEffect(() => {
    setRemainingMs(getRemainingMs(premiumUntilIso));
    if (!premiumUntilIso) return;
    const timer = setInterval(() => {
      setRemainingMs(getRemainingMs(premiumUntilIso));
    }, 1000);
    return () => clearInterval(timer);
  }, [premiumUntilIso]);

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&method=2`);
          const data = await res.json();
          if (data.code === 200) setPrayerTimes(data.data.timings);
        } catch (e) {}
      });
    }
  }, []);

  const isActive = premiumUntilIso ? remainingMs > 0 : false;
  const days = Math.floor(remainingMs / 86400000);
  const statusLabel = isActive ? `${days} Hari · ${formatClock(remainingMs)}` : "Kadaluarsa";

  return (
    <div className="hero-root">
      {/* ── ADZAN BAR ── */}
      {prayerTimes && (
        <div className="adzan-bar">
          <div className="adzan-label">🕋 JADWAL SHALAT</div>
          <div className="adzan-scroll">
            <div className="adzan-track">
              <span>Subuh: {prayerTimes.Fajr}</span>
              <span>Dzuhur: {prayerTimes.Dhuhr}</span>
              <span>Ashar: {prayerTimes.Asr}</span>
              <span>Maghrib: {prayerTimes.Maghrib}</span>
              <span>Isya: {prayerTimes.Isha}</span>
              <span className="sep">|</span>
              <span>Subuh: {prayerTimes.Fajr}</span>
              <span>Dzuhur: {prayerTimes.Dhuhr}</span>
              <span>Ashar: {prayerTimes.Asr}</span>
              <span>Maghrib: {prayerTimes.Maghrib}</span>
              <span>Isya: {prayerTimes.Isha}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── ACCENT-COLORED BANNER ── */}
      <div className="banner">
        <div className="accent-bg" />
        <div className="noise-overlay" />
        
        <div className="layout">
          {/* Brand */}
          <div className="brand">
            <div className="welcome">
              <span className="wave">👋</span>
              <span className="hi">Hai {userName}, {greeting.toLowerCase()}!</span>
            </div>
            <h1 className="name">{tenantName}</h1>
            <div className="agent-tag">
              <span className="dot" />
              Agen: {agentName}
            </div>
          </div>

          {/* Stats & License */}
          <div className="stats-container">
            <div className="stat-pill">
              <div className="stat-item">
                <span className="label">SISA</span>
                <span className="value">{sisaToken.toLocaleString("id-ID")}<small>T</small></span>
              </div>
              <div className="divider" />
              <div className="stat-item">
                <span className="label">PAKAI</span>
                <span className="value">{tokenTerpakai.toLocaleString("id-ID")}<small>T</small></span>
              </div>
            </div>

            <div className={`license-pill ${isActive ? 'active' : 'expired'}`}>
              <div className="license-info">
                <div className="meta">
                  <div className="status-dot" />
                  <span>LISENSI</span>
                </div>
                <div className="time">{statusLabel}</div>
              </div>
              <Link href="/buy" className="action-btn">Beli</Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .hero-root { display: flex; flex-direction: column; gap: 8px; width: 100%; }

        .adzan-bar {
          background: rgba(var(--bg-card-rgb), 0.4);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(var(--border-rgb), 0.2);
          border-radius: 8px; padding: 4px 12px;
          display: flex; align-items: center; gap: 12px;
        }
        .adzan-label { font-size: 8px; font-weight: 800; color: hsl(var(--primary)); letter-spacing: 0.1em; }
        .adzan-scroll { flex: 1; overflow: hidden; height: 14px; }
        .adzan-track {
          display: flex; gap: 20px; white-space: nowrap; font-size: 9px; font-weight: 700;
          color: var(--text-secondary); animation: marquee 40s linear infinite;
        }
        .sep { opacity: 0.2; }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

        /* Banner Background with Accent */
        .banner {
          position: relative;
          background: hsl(var(--primary));
          background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%);
          border-radius: 16px;
          overflow: hidden;
          padding: 16px 20px;
          box-shadow: 0 10px 30px -10px hsl(var(--primary) / 0.4);
        }
        .accent-bg {
          position: absolute; inset: 0;
          background: radial-gradient(at 0% 0%, rgba(255,255,255,0.2) 0%, transparent 60%),
                      radial-gradient(at 100% 100%, rgba(0,0,0,0.2) 0%, transparent 60%);
          z-index: 0;
        }
        .noise-overlay {
          position: absolute; inset: 0; opacity: 0.05; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }

        .layout {
          position: relative; z-index: 2;
          display: flex; justify-content: space-between; align-items: center; gap: 24px;
        }

        /* Brand White Text */
        .welcome { display: flex; align-items: center; gap: 6px; }
        .wave { font-size: 16px; animation: wave 2.5s infinite; transform-origin: 70% 70%; }
        @keyframes wave {
          0% { transform: rotate(0deg) } 10% { transform: rotate(14deg) } 20% { transform: rotate(-8deg) }
          30% { transform: rotate(14deg) } 40% { transform: rotate(-4deg) } 50% { transform: rotate(10deg) }
          60% { transform: rotate(0deg) } 100% { transform: rotate(0deg) }
        }
        .hi { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.7); }
        .name {
          font-size: clamp(18px, 3vw, 26px); font-weight: 900; color: white;
          margin: 1px 0 3px 0; letter-spacing: -0.02em; line-height: 1.1;
        }
        .agent-tag {
          display: inline-flex; align-items: center; gap: 4px;
          background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2);
          padding: 1px 8px; border-radius: 99px; font-size: 9px; font-weight: 700; color: white;
        }
        .dot { width: 3px; height: 3px; background: white; border-radius: 50%; }

        /* Stats & License Container */
        .stats-container { display: flex; align-items: center; gap: 10px; }
        
        .stat-pill {
          display: flex; align-items: center; gap: 12px;
          background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.1);
          padding: 8px 14px; border-radius: 12px; backdrop-filter: blur(10px);
        }
        .stat-item { display: flex; flex-direction: column; }
        .label { font-size: 7px; font-weight: 800; color: rgba(255,255,255,0.5); letter-spacing: 0.1em; }
        .value { font-size: 14px; font-weight: 900; color: white; }
        .value small { font-size: 8px; margin-left: 1px; color: rgba(255,255,255,0.4); }
        .divider { width: 1px; height: 16px; background: rgba(255,255,255,0.15); }

        .license-pill {
          display: flex; align-items: center; gap: 12px; min-width: 160px;
          background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2);
          padding: 8px 14px; border-radius: 12px;
          justify-content: space-between;
        }
        .meta { display: flex; align-items: center; gap: 4px; font-size: 7px; font-weight: 800; color: rgba(255,255,255,0.7); }
        .status-dot { width: 4px; height: 4px; background: #fff; border-radius: 50%; }
        .active .status-dot { box-shadow: 0 0 6px white; }
        .time { 
          font-size: 11px; 
          font-weight: 900; 
          color: white; 
          margin-top: 1px; 
          font-variant-numeric: tabular-nums;
          min-width: 90px;
          text-align: right;
        }
        
        .action-btn {
          background: white; color: hsl(var(--primary)); border: none; padding: 4px 10px;
          border-radius: 6px; font-size: 9px; font-weight: 900; text-decoration: none;
          transition: transform 0.2s;
        }
        .action-btn:hover { transform: scale(1.05); filter: brightness(0.95); }

        @media (max-width: 780px) {
          .layout { flex-direction: column; text-align: center; gap: 16px; }
          .stats-container { width: 100%; justify-content: center; flex-wrap: wrap; }
          .stat-pill, .license-pill { flex: 1; min-width: 130px; }
        }
        @media (max-width: 400px) {
          .stats-container { flex-direction: column; }
          .stat-pill, .license-pill { width: 100%; }
        }
      `}</style>
    </div>
  );
}
