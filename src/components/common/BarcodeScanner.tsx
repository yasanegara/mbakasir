"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { playBeep } from "@/lib/sounds";

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose?: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const qrRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);
  const hasScannedRef = useRef(false);
  const idRef = useRef(`bcs-${Math.random().toString(36).substr(2, 8)}`);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState("");



  const stopScanner = async () => {
    if (qrRef.current && isRunningRef.current) {
      try {
        await qrRef.current.stop();
      } catch {
        // abaikan jika sudah berhenti
      } finally {
        isRunningRef.current = false;
      }
    }
  };

  const startScanner = (facing: "environment" | "user") => {
    const id = idRef.current;
    // Hapus isi div dulu agar tidak bentrok
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
    setCameraError("");
    hasScannedRef.current = false;

    const qr = new Html5Qrcode(id, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.ITF,
      ],
      verbose: false,
    });
    qrRef.current = qr;

    qr.start(
      { facingMode: facing },
      {
        fps: 15,
        qrbox: { width: 280, height: 100 },
        aspectRatio: 1.5,
      },
      async (decodedText) => {
        if (hasScannedRef.current) return;
        hasScannedRef.current = true;
        playBeep();
        await stopScanner();
        onScan(decodedText);
      },
      () => { /* error diabaikan */ }
    )
    .then(() => {
      isRunningRef.current = true;
    })
    .catch(() => {
      setCameraError("Kamera tidak bisa dibuka. Pastikan izin kamera sudah diberikan.");
    });
  };

  useEffect(() => {
    startScanner(facingMode);
    return () => {
      stopScanner();
    };
  }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFlipCamera = async () => {
    await stopScanner();
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
  };

  return (
    <div>
      {/* Info hint */}
      <div style={{
        textAlign: "center",
        fontSize: "12px",
        color: "hsl(var(--text-secondary))",
        marginBottom: "10px",
        padding: "6px 12px",
        background: "hsl(var(--bg-card))",
        borderRadius: "8px",
        border: "1px solid hsl(var(--border))",
      }}>
        {facingMode === "environment" 
          ? "📷 Kamera Belakang · Arahkan barcode ke kotak · Jarak 10–20 cm"
          : "🤳 Kamera Depan · Arahkan barcode ke kotak · Jarak 10–20 cm"
        }
      </div>

      {/* Area kamera */}
      <div
        id={idRef.current}
        style={{ width: "100%", borderRadius: "12px", overflow: "hidden" }}
      />

      {cameraError && (
        <div style={{ color: "hsl(var(--error))", fontSize: "13px", textAlign: "center", marginTop: "10px", padding: "10px", background: "hsl(var(--error) / 0.08)", borderRadius: "8px" }}>
          {cameraError}
        </div>
      )}

      {/* Tombol aksi */}
      <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
        <button
          onClick={handleFlipCamera}
          className="btn btn-outline"
          style={{ flex: 1, fontSize: "13px" }}
        >
          🔄 {facingMode === "environment" ? "Ganti ke Kamera Depan" : "Ganti ke Kamera Belakang"}
        </button>
        {onClose && (
          <button
            onClick={async () => {
              await stopScanner();
              onClose();
            }}
            className="btn btn-ghost"
            style={{ flex: 1, fontSize: "13px" }}
          >
            ✕ Tutup
          </button>
        )}
      </div>
    </div>
  );
}
