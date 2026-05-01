"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BrandBadge from "@/components/brand/BrandBadge";
import { useAuth, useToast } from "@/contexts/AppProviders";
import { useBrand } from "@/contexts/BrandContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { refetch } = useAuth();
  const { toast } = useToast();
  const brand = useBrand();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        toast("Login berhasil", "success");
        await refetch();
        if (data.role === "CASHIER") {
          router.push("/pos");
        } else {
          router.push("/dashboard");
        }
      } else {
        toast(data.error || "Gagal login", "error");
      }
    } catch {
      toast("Terjadi kesalahan jaringan", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (role: "owner" | "kasir" | "agent") => {
    if (role === "owner") {
      setEmail("owner@demo.id");
      setPassword("Owner@Demo2026!");
    } else if (role === "agent") {
      setEmail("agen.demo@mbakasir.id");
      setPassword("Agent@Demo2026!");
    } else {
      setEmail("kasir@demo.id");
      setPassword("Kasir@1234!");
    }
    // Set a slight timeout to allow state to update before submitting
    // UNLESS it's a cashier demo, we want them to feel the login button then the PIN
    if (role !== "kasir") {
      setTimeout(() => {
        const form = document.getElementById("login-form") as HTMLFormElement;
        if (form) form.requestSubmit();
      }, 100);
    } else {
      toast("Data demo terisi. Silakan klik Masuk untuk lanjut ke PIN Kasir.", "info");
    }
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100dvh",
      padding: "20px"
    }}>
      <div className="card" style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            <BrandBadge logoUrl={brand.logoUrl} alt={brand.appName} size={56} />
          </div>
          <h1 style={{ fontSize: "24px" }}>{brand.appName}</h1>
          <p style={{ color: "hsl(var(--text-secondary))", marginTop: "4px" }}>
            {brand.tagline ?? "Teman UMKM Indonesia"} — Login
          </p>
        </div>

        <form id="login-form" onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label className="input-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input-field"
              placeholder="nama@usahaanda.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="input-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={isLoading}
            style={{ marginTop: "10px" }}
          >
            {isLoading ? "Authenticating..." : "Masuk"}
          </button>

          <div style={{ textAlign: "center", marginTop: "8px", fontSize: "14px" }}>
            <span style={{ color: "hsl(var(--text-secondary))" }}>Belum punya akun? </span>
            <button 
              type="button"
              onClick={() => router.push("/register/store")}
              style={{ 
                background: "none", 
                border: "none", 
                color: "hsl(var(--primary))", 
                fontWeight: 800, 
                cursor: "pointer",
                padding: "4px"
              }}
            >
              Daftar Sekarang
            </button>
          </div>
        </form>

        {brand.appName === "Edu Intelligence" && (
          <div style={{ marginTop: "24px" }}>
            <div style={{ position: "relative", textAlign: "center", marginBottom: "16px" }}>
              <hr style={{ border: "none", borderTop: "1px solid hsl(var(--border))" }} />
              <span style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", background: "hsl(var(--bg-card))", padding: "0 10px", fontSize: "12px", color: "hsl(var(--text-muted))" }}>
                Atau coba demo
              </span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button 
                type="button" 
                className="btn btn-ghost btn-block" 
                onClick={() => handleDemoLogin("owner")}
                disabled={isLoading}
                style={{ justifyContent: "center", borderStyle: "dashed" }}
              >
                🔑 Gunakan Demo Owner
              </button>
              <button 
                type="button" 
                className="btn btn-ghost btn-block" 
                onClick={() => handleDemoLogin("kasir")}
                disabled={isLoading}
                style={{ justifyContent: "center", borderStyle: "dashed" }}
              >
                🛒 Gunakan Demo Kasir
              </button>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
