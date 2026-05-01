"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/contexts/AppProviders";

interface RegistrationSuccessPayload {
  tenantName: string;
  ownerEmail: string;
  agentName: string;
}

export default function StoreRegistrationForm({
  token,
  agentName,
}: {
  token: string;
  agentName: string;
}) {
  const { toast } = useToast();
  const [storeName, setStoreName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [nik, setNik] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<RegistrationSuccessPayload | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/register/store", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          storeName,
          businessType,
          address,
          phone,
          ownerName,
          ownerEmail,
          ownerPhone,
          nik,
          ownerPassword,
          termsAccepted,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast(data.error || "Pendaftaran toko gagal", "error");
        return;
      }

      setSuccess(data);
      toast("Toko berhasil didaftarkan", "success");
    } catch {
      toast("Terjadi kesalahan jaringan saat mendaftarkan toko", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <section className="card" style={{ width: "100%", maxWidth: "720px" }}>
        <h2 style={{ fontSize: "24px" }}>Pendaftaran Berhasil</h2>
        <p
          style={{
            marginTop: "10px",
            fontSize: "15px",
            color: "hsl(var(--text-secondary))",
          }}
        >
          <strong>{success.tenantName}</strong> sudah terhubung ke jaringan agen{" "}
          <strong>{success.agentName}</strong>. Owner dapat login memakai email{" "}
          <strong>{success.ownerEmail}</strong>.
        </p>

        <div
          style={{
            marginTop: "18px",
            padding: "16px 18px",
            borderRadius: "16px",
            background: token === "edu" ? "hsl(var(--success) / 0.08)" : "hsl(var(--primary) / 0.08)",
            border: token === "edu" ? "1px solid hsl(var(--success) / 0.18)" : "1px solid hsl(var(--primary) / 0.18)",
            color: "hsl(var(--text-secondary))",
            fontSize: "14px",
          }}
        >
          {token === "edu" ? (
            <>
              <b>🚀 Toko Langsung AKTIF & BERMODAL!</b> Akun Anda sudah dipasangkan lisensi Premium (30 Hari) dan modal 4 Token untuk keperluan simulasi pelatihan.
            </>
          ) : (
            <>
              Toko baru dibuat dalam status belum aktif, tetapi POS utama bawaan
              sudah disiapkan. Aktivasi lisensi tetap dilanjutkan lewat agen.
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "22px" }}>
          <Link href="/login" className="btn btn-primary">
            Masuk ke Dashboard
          </Link>
          <Link href="/" className="btn btn-ghost">
            Kembali ke Beranda
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="card" style={{ width: "100%", maxWidth: "720px" }}>
      <div>
        <h2 style={{ fontSize: "24px" }}>Form Pendaftaran Toko</h2>
        <p
          style={{
            marginTop: "10px",
            fontSize: "15px",
            color: "hsl(var(--text-secondary))",
          }}
        >
          Toko Anda akan terhubung ke agen <strong>{agentName}</strong>. Satu
          POS utama akan dibuat otomatis saat pendaftaran selesai.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginTop: "22px",
        }}
      >
        <div>
          <label className="input-label" htmlFor="store-name">
            Nama Toko
          </label>
          <input
            id="store-name"
            className="input-field"
            value={storeName}
            onChange={(event) => setStoreName(event.target.value)}
            placeholder="Contoh: Kopi Pagi Senin"
            required
          />
        </div>

        <div>
          <label className="input-label" htmlFor="business-type">
            Jenis Usaha
          </label>
          <input
            id="business-type"
            className="input-field"
            value={businessType}
            onChange={(event) => setBusinessType(event.target.value)}
            placeholder="Kuliner, Retail, Jasa"
          />
        </div>

        <div>
          <label className="input-label" htmlFor="store-phone">
            Telepon Toko
          </label>
          <input
            id="store-phone"
            className="input-field"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="08xxxxxxxxxx"
          />
        </div>

        <div>
          <label className="input-label" htmlFor="nik">
            NIK KTP (Opsional)
          </label>
          <input
            id="nik"
            className="input-field"
            value={nik}
            onChange={(event) => setNik(event.target.value)}
            placeholder="16 Digit NIK"
            maxLength={16}
          />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label className="input-label" htmlFor="store-address">
            Alamat Toko
          </label>
          <textarea
            id="store-address"
            className="input-field"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            rows={3}
            placeholder="Alamat lengkap toko"
            style={{ resize: "vertical", minHeight: "96px" }}
          />
        </div>

        <div>
          <label className="input-label" htmlFor="owner-name">
            Nama Owner
          </label>
          <input
            id="owner-name"
            className="input-field"
            value={ownerName}
            onChange={(event) => setOwnerName(event.target.value)}
            placeholder="Nama penanggung jawab"
            required
          />
        </div>

        <div>
          <label className="input-label" htmlFor="owner-email">
            Email Owner
          </label>
          <input
            id="owner-email"
            type="email"
            className="input-field"
            value={ownerEmail}
            onChange={(event) => setOwnerEmail(event.target.value)}
            placeholder="owner@tokosaya.id"
            required
          />
        </div>

        <div>
          <label className="input-label" htmlFor="owner-phone">
            Nomor Owner
          </label>
          <input
            id="owner-phone"
            className="input-field"
            value={ownerPhone}
            onChange={(event) => setOwnerPhone(event.target.value)}
            placeholder="08xxxxxxxxxx"
          />
        </div>

        <div>
          <label className="input-label" htmlFor="owner-password">
            Password Owner
          </label>
          <input
            id="owner-password"
            type="password"
            className="input-field"
            value={ownerPassword}
            onChange={(event) => setOwnerPassword(event.target.value)}
            placeholder="Minimal 8 karakter"
            minLength={8}
            required
          />
        </div>

        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
            <p style={{ fontSize: "13px", color: "hsl(var(--text-muted))", flex: "1 1 100%" }}>
              Pastikan email owner belum pernah dipakai akun lain agar login tidak bentrok.
            </p>

            <label style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginTop: "8px", fontSize: "14px", lineHeight: "1.5", color: "hsl(var(--text-secondary))", flex: "1 1 100%" }}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                required
                style={{ width: "18px", height: "18px", marginTop: "2px" }}
              />
              <span>
                Saya menyetujui seluruh <Link href="/terms" target="_blank" style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}>Syarat dan Ketentuan</Link> serta Kebijakan Privasi platform MbaKasir Intelligence Pro.
              </span>
            </label>

            <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Mendaftarkan..." : "Daftarkan Toko"}
          </button>
        </div>
      </form>
    </section>
  );
}
