"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AgentRegisterFormClient({ token }: { token: string }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    nik: "",
    password: "",
    whatsappNumber: "",
    termsAccepted: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/register/agent/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal melakukan pendaftaran agen");
      }

      alert("Pendaftaran Agen Berhasil! Silakan Login.");
      router.push("/login");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "hsl(var(--bg))" }}>
      <div className="card" style={{ maxWidth: "480px", width: "100%", padding: "32px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "hsl(var(--primary))", letterSpacing: "-0.5px" }}>
            MbaKasir Partner
          </h1>
          <p style={{ color: "hsl(var(--text-secondary))", marginTop: "8px" }}>
            Bergabunglah menjadi Agen Utama Pusat (Dengan Undangan).
          </p>
        </div>

        {error && (
          <div style={{ padding: "12px", background: "hsl(var(--danger)/0.1)", color: "hsl(var(--danger))", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", fontWeight: 500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "20px" }}>
          <div>
            <label className="input-label" htmlFor="name">Nama Lengkap / Agensi</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="input-field"
              value={formData.name}
              onChange={handleChange}
              placeholder="Contoh: Budi Santoso / PT Kasir Hebat"
            />
          </div>

          <div>
            <label className="input-label" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="input-field"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@domain.com"
            />
          </div>

          <div>
            <label className="input-label" htmlFor="phone">Nomor Telepon</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              className="input-field"
              value={formData.phone}
              onChange={handleChange}
              placeholder="08123456789"
            />
          </div>

          <div>
            <label className="input-label" htmlFor="nik">NIK KTP (Opsional)</label>
            <input
              id="nik"
              name="nik"
              type="text"
              className="input-field"
              value={formData.nik}
              onChange={handleChange}
              placeholder="16 Digit NIK KTP Anda"
              maxLength={16}
            />
          </div>

          <div>
            <label className="input-label" htmlFor="whatsappNumber">Nomor WhatsApp (Untuk Terima Pesanan Toko)</label>
            <input
              id="whatsappNumber"
              name="whatsappNumber"
              type="tel"
              required
              className="input-field"
              value={formData.whatsappNumber}
              onChange={handleChange}
              placeholder="628123456789"
            />
          </div>

          <div>
            <label className="input-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="input-field"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimal 6 karakter"
              minLength={6}
            />
          </div>

          <label style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginTop: "8px", fontSize: "14px", lineHeight: "1.5", color: "hsl(var(--text-secondary))" }}>
            <input
              type="checkbox"
              name="termsAccepted"
              checked={formData.termsAccepted}
              onChange={handleChange}
              required
              style={{ width: "18px", height: "18px", marginTop: "2px" }}
            />
            <span>
              Saya menyetujui seluruh <a href="#" style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}>Syarat dan Ketentuan</a> serta Kebijakan Privasi yang berlaku sebagai Agen Utama Pusat.
            </span>
          </label>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ padding: "14px", fontSize: "16px", justifyContent: "center", marginTop: "12px", border: "none" }}
          >
            {isSubmitting ? "Memproses..." : "Daftar Sekarang"}
          </button>
        </form>
      </div>
    </div>
  );
}
