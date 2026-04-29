"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose?: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Create instance
    const scanner = new Html5QrcodeScanner(
      "barcode-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 150 },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        rememberLastUsedCamera: true
      },
      /* verbose= */ false
    );
    
    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        // Debounce or directly call
        onScan(decodedText);
      },
      (err) => {
        // Ignored, happens continuously when no barcode is found
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error("Failed to clear scanner", e));
      }
    };
  }, [onScan]);

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "400px", margin: "0 auto", background: "var(--bg-elevated)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border)" }}>
      <h3 style={{ textAlign: "center", marginBottom: "12px", fontSize: "16px", fontWeight: 600 }}>Scan Barcode / QR</h3>
      <div id="barcode-reader" style={{ width: "100%", borderRadius: "8px", overflow: "hidden" }}></div>
      {error && <p style={{ color: "var(--error)", fontSize: "12px", textAlign: "center", marginTop: "8px" }}>{error}</p>}
      
      {onClose && (
        <button 
          onClick={onClose} 
          className="btn btn-ghost" 
          style={{ width: "100%", marginTop: "16px" }}
        >
          Tutup Kamera
        </button>
      )}
    </div>
  );
}
