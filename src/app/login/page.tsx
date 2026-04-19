"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useToast } from "@/contexts/AppProviders";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { refetch } = useAuth();
  const { toast } = useToast();

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
        router.push("/dashboard");
      } else {
        toast(data.error || "Gagal login", "error");
      }
    } catch (error) {
      toast("Terjadi kesalahan jaringan", "error");
    } finally {
      setIsLoading(false);
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
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "var(--gradient-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            margin: "0 auto 16px"
          }}>
            💳
          </div>
          <h1 style={{ fontSize: "24px" }}>Mbakasir</h1>
          <p style={{ color: "hsl(var(--text-secondary))", marginTop: "4px" }}>
            Intelligence Pro — Login
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label className="input-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input-field"
              placeholder="admin@mbakasir.id"
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
        </form>

        <div style={{
          marginTop: "24px",
          padding: "16px",
          background: "hsl(var(--primary) / 0.1)",
          borderRadius: "var(--radius-md)",
          fontSize: "12px",
          color: "hsl(var(--text-secondary))"
        }}>
          <strong>Demo Accounts:</strong><br/>
          Admin: admin@mbakasir.id / SuperAdmin@2026!<br/>
          Agent: agen.demo@mbakasir.id / Agent@Demo2026!<br/>
          Kasir: kasir@demo.id / Kasir@1234!
        </div>
      </div>
    </div>
  );
}
