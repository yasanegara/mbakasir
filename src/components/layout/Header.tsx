"use client";

import { useEffect, useState } from "react";
import { useAuth, useTheme } from "@/contexts/AppProviders";
import { formatDate } from "@/lib/utils";

// ============================================================
// HEADER — Info shift, tanggal, status online/offline
// ============================================================

interface HeaderProps {
  title?: string;
  onMenuClick: () => void;
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const { mode, toggleMode } = useTheme();
  const [isOnline, setIsOnline] = useState(true);
  const [now, setNow] = useState(new Date());
  const [syncCount, setSyncCount] = useState(0);

  // Update jam setiap 30 detik
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Monitor status online
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Cek jumlah item pending sync dari IndexedDB
  useEffect(() => {
    if (typeof window === "undefined") return;
    async function checkSync() {
      try {
        const { getDb } = await import("@/lib/db");
        const db = getDb();
        const count = await db.syncQueue.count();
        setSyncCount(count);
      } catch {
        // Ignore
      }
    }
    checkSync();
    const timer = setInterval(checkSync, 15_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="main-header">
      {/* Hamburger — Mobile */}
      <button
        id="menu-toggle"
        className="btn btn-ghost btn-icon btn-sm"
        onClick={onMenuClick}
        aria-label="Buka menu"
        style={{ display: "flex" }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          width={20}
          height={20}
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Judul halaman */}
      {title && (
        <h1
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "hsl(var(--text-primary))",
            flex: 1,
          }}
        >
          {title}
        </h1>
      )}

      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        {/* Waktu sekarang */}
        <span
          style={{
            fontSize: "13px",
            color: "hsl(var(--text-secondary))",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {now.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {" · "}
          {now.toLocaleDateString("id-ID", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </span>

        {/* Toggle Mode */}
        <button
          onClick={toggleMode}
          className="btn btn-ghost btn-icon btn-sm"
          title={`Ganti ke mode ${mode === "dark" ? "Terang" : "Gelap"}`}
          style={{ padding: "6px", fontSize: "16px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", height: "30px", width: "30px", lineHeight: 1 }}
        >
          {mode === "dark" ? "🌙" : "☀️"}
        </button>

        {/* Pending sync badge */}
        {syncCount > 0 && (
          <div
            title={`${syncCount} transaksi menunggu sync`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              background: "hsl(var(--warning) / 0.15)",
              border: "1px solid hsl(var(--warning) / 0.4)",
              color: "hsl(var(--warning))",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "default",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              width={12}
              height={12}
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {syncCount} pending
          </div>
        )}

        {/* Online / Offline indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: 600,
            color: isOnline
              ? "hsl(var(--success))"
              : "hsl(var(--error))",
          }}
          title={isOnline ? "Terhubung ke internet" : "Offline — data tersimpan lokal"}
        >
          <span className={`status-dot ${isOnline ? "online" : "offline"}`} />
          <span>{isOnline ? "Online" : "Offline"}</span>
        </div>

        {/* Avatar user */}
        {user && (
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "var(--gradient-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 700,
              color: "white",
              flexShrink: 0,
              cursor: "default",
            }}
            title={user.name}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
}
