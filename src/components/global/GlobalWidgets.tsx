"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useBrand } from "@/contexts/BrandContext";

export default function GlobalWidgets() {
  const brand = useBrand();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(true); // Default to true, hide until client mounts
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // Hide until mounted

  useEffect(() => {
    // Check if user previously dismissed
    const dismissed = localStorage.getItem("mbakasir_pwa_dismissed") === "true";
    setIsDismissed(dismissed);

    // Cek apakah PWA sudah di-install (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(standalone);

    if (standalone) return;

    // Deteksi iOS gawai
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Registrasi Service Worker diam-diam untuk memancing Chrome PWA banner
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      // Show iOS instruction since they can't prompt directly
      alert("Untuk menginstall di iOS:\n1. Tap tombol Share (bagian bawah layar)\n2. Pilih 'Add to Home Screen'");
    } else {
      // Fallback jika browser telat menembakkan event (meski banner ditampilkan karena "true")
      alert("Pemasangan otomatis belum siap atau tidak didukung oleh browser Anda saat ini.\n\nSilakan gunakan menu opsi browser (titik tiga) lalu pilih 'Instal Aplikasi' / 'Tambahkan ke Layar Utama'.");
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("mbakasir_pwa_dismissed", "true");
  };

  // Hanya tampilkan jika belum dismiss, belum standalone, DAN (ada prompt install dari browser ATAU device-nya iOS)
  // Untuk sementara, kita selalu pastikan user melihat ini jika belum install, asalkan di HP. 
  // Kita deteksi ukuran layar di CSS bawah.
  const showInstallBanner = (!isStandalone && !isDismissed) && (deferredPrompt || isIOS || true); // (Tampilkan sementara di Android walau manifest belum lengkap untuk testing, atau hapus `true`)

  const waNumber = brand.supportPhone || process.env.NEXT_PUBLIC_WA_NUMBER || "6281234567890";
  const waText = encodeURIComponent(brand.supportMessage || process.env.NEXT_PUBLIC_WA_TEXT || "Halo MbaKasir, saya butuh bantuan");
  const waLink = `https://wa.me/${waNumber}?text=${waText}`;

  const pathname = usePathname() || "";
  const showWaButton = pathname === "/" || pathname === "/buy" || pathname.startsWith("/agent");

  return (
    <>
      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:bottom-24 z-50 animate-slide-up max-w-sm">
          <div className="card shadow-2xl p-5 flex flex-col gap-4 overflow-hidden relative">
             <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-orange-500 opacity-80" />
             <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-[14px] font-bold flex items-center gap-2" style={{ color: "hsl(var(--text-primary))" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "hsl(var(--primary))" }}><path d="M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                    <span>Install {brand.appName}</span>
                  </h4>
                  <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: "hsl(var(--text-secondary))" }}>
                    Pasang MbaKasir ke gawai Anda. Jualan lebih cepat, hemat kuota, dan fitur offline aktif penuh!
                  </p>
                </div>
                <button 
                  onClick={handleDismiss}
                  className="btn btn-ghost btn-icon"
                  style={{ width: "28px", height: "28px", padding: 0, borderRadius: "50%", flexShrink: 0, marginLeft: "12px" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
             </div>
             <button 
               onClick={handleInstallClick}
               className="btn btn-primary btn-block text-[13px] py-2.5 rounded-[10px] flex items-center justify-center gap-2"
             >
               <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
               Mulai Proses Instalasi
             </button>
          </div>
        </div>
      )}

      {/* Support Floating Button (Hubungi MbaKasir via WhatsApp) */}
      {showWaButton && (
      <a 
        href={waLink} 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center p-3.5 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-xl shadow-green-500/30 transition-all hover:-translate-y-1 active:scale-95 group"
        title="Bantuan MbaKasir"
      >
        <span className="absolute right-full mr-4 bg-gray-900/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden sm:block">
          Bantuan
        </span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.653-2.059-.173-.298-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
      </a>
      )}
    </>
  );
}
