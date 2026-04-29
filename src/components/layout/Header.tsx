"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useTheme } from "@/contexts/AppProviders";
import { formatDate } from "@/lib/utils";
import BarcodeScanner from "@/components/common/BarcodeScanner";

// ============================================================
// HEADER — Info shift, tanggal, status online/offline
// ============================================================

interface HeaderProps {
  title?: string;
  onMenuClick: () => void;
  headerActions?: React.ReactNode;
}

export default function Header({ title, onMenuClick, headerActions }: HeaderProps) {
  const { user } = useAuth();
  const { theme, setTheme, mode, toggleMode } = useTheme();
  const [isOnline, setIsOnline] = useState(true);
  const [now, setNow] = useState(new Date());
  const [syncCount, setSyncCount] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const router = useRouter();

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

      {/* Custom actions from page (e.g. Tutup Shift di POS) */}
        {headerActions && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
            {headerActions}
          </div>
        )}

      <div
        style={{
          marginLeft: headerActions ? "0" : "auto",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        {/* Waktu sekarang — disembunyikan di layar < 480px */}
        <span
          className="header-clock"
          style={{
            fontSize: "13px",
            color: "hsl(var(--text-secondary))",
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
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

        {/* Global Scanner Button */}
        <button
          onClick={() => setShowScanner(true)}
          className="btn btn-ghost btn-icon btn-sm"
          title="Scan Barcode Cepat"
          style={{ padding: "6px", fontSize: "16px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", height: "30px", width: "30px", lineHeight: 1, color: "hsl(var(--primary))" }}
        >
          📷
        </button>

        {/* Sync Button */}
        {syncCount === 0 && isOnline && (
          <button
            onClick={() => {
              window.dispatchEvent(new Event("force-sync"));
              const icon = document.getElementById("manual-sync-icon");
              if (icon) {
                icon.classList.add("animate-spin");
                setTimeout(() => icon.classList.remove("animate-spin"), 1000);
              }
            }}
            className="btn btn-ghost btn-icon btn-sm"
            title="Sinkronisasi Paksa"
            style={{ padding: "6px", display: "flex", alignItems: "center", justifyContent: "center", height: "30px", width: "30px" }}
          >
            <svg
              id="manual-sync-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              width={16}
              height={16}
              style={{ transition: "transform 0.3s ease", color: "hsl(var(--text-secondary))" }}
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
            </svg>
          </button>
        )}

        {/* Pending sync badge */}
        {syncCount > 0 && (
          <button
            onClick={() => {
              window.dispatchEvent(new Event("force-sync"));
              // Optional: Beri efek visual sederhana (optimistic)
              const icon = document.getElementById("sync-icon");
              if (icon) {
                icon.classList.add("animate-spin");
                setTimeout(() => icon.classList.remove("animate-spin"), 1000);
              }
            }}
            title={`${syncCount} transaksi penjualan kasir (POS) tersimpan lokal. Klik untuk sinkronisasi paksa ke server.`}
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
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "hsl(var(--warning) / 0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "hsl(var(--warning) / 0.15)";
            }}
          >
            <svg
              id="sync-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              width={12}
              height={12}
              style={{ transition: "transform 0.3s ease" }}
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span style={{ display: "none" }} className="md:inline">Belum Upload: </span>{syncCount}
          </button>
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
          <span className="online-label">{isOnline ? "Online" : "Offline"}</span>
        </div>

      </div>

      {/* Global Scanner Modal */}
      {showScanner && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", padding: "20px" }}>
          <div style={{ background: "hsl(var(--bg-elevated))", padding: "24px", borderRadius: "16px", width: "100%", maxWidth: "450px", position: "relative" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", textAlign: "center" }}>Scan Barcode Cepat</h3>
            <p style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", textAlign: "center", marginBottom: "16px" }}>
              Scan produk untuk langsung dicarikan di Kasir (POS).
            </p>
            <BarcodeScanner 
              onScan={(code) => {
                setShowScanner(false);
                if (window.location.pathname.includes("/pos")) {
                  window.dispatchEvent(new CustomEvent("global-barcode-scanned", { detail: code }));
                } else {
                  localStorage.setItem("pending_barcode_scan", code);
                  router.push("/pos");
                }
              }} 
              onClose={() => setShowScanner(false)} 
            />
          </div>
        </div>
      )}
    </header>
  );
}
