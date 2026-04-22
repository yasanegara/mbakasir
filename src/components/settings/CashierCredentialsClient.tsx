"use client";

import { useState } from "react";
import { useAuth, useToast } from "@/contexts/AppProviders";

type CashierCredentialsClientProps = {
  cashierName: string;
  hasPin: boolean;
};

const EMPTY_FORM = {
  currentPassword: "",
  newPin: "",
  confirmPin: "",
  newPassword: "",
  confirmPassword: "",
};

export default function CashierCredentialsClient({
  cashierName,
  hasPin,
}: CashierCredentialsClientProps) {
  const { toast } = useToast();
  const { refetch } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.currentPassword) {
      toast("Password saat ini wajib diisi", "warning");
      return;
    }

    const wantsPinUpdate = Boolean(form.newPin);
    const wantsPasswordUpdate = Boolean(form.newPassword);

    if (!wantsPinUpdate && !wantsPasswordUpdate) {
      toast("Isi PIN baru atau password baru", "warning");
      return;
    }

    if (wantsPinUpdate) {
      if (!/^\d{6}$/.test(form.newPin)) {
        toast("PIN baru harus 6 digit angka", "warning");
        return;
      }

      if (form.newPin !== form.confirmPin) {
        toast("Konfirmasi PIN tidak cocok", "warning");
        return;
      }
    }

    if (wantsPasswordUpdate) {
      if (form.newPassword.length < 8) {
        toast("Password baru minimal 8 karakter", "warning");
        return;
      }

      if (form.newPassword !== form.confirmPassword) {
        toast("Konfirmasi password tidak cocok", "warning");
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/auth/me/credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPin: wantsPinUpdate ? form.newPin : undefined,
          newPassword: wantsPasswordUpdate ? form.newPassword : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error || "Gagal memperbarui kredensial", "error");
        return;
      }

      await refetch();
      toast("PIN dan password berhasil diperbarui", "success");
      setForm(EMPTY_FORM);
    } catch {
      toast("Terjadi kesalahan jaringan", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <section className="card" style={{ display: "grid", gap: "10px" }}>
        <h2 style={{ fontSize: "20px" }}>Ganti PIN & Password</h2>
        <p style={{ color: "hsl(var(--text-secondary))", fontSize: "14px", lineHeight: 1.7 }}>
          Akun kasir <strong>{cashierName}</strong> bisa mengubah PIN POS dan password login dari sini.
          Isi hanya field yang ingin diganti, lalu konfirmasi dengan password saat ini.
        </p>
        <p style={{ color: "hsl(var(--text-muted))", fontSize: "12px" }}>
          Status PIN saat ini: {hasPin ? "sudah diatur" : "belum diatur"}
        </p>
      </section>

      <section className="card" style={{ display: "grid", gap: "18px" }}>
        <div style={{ display: "grid", gap: "16px" }}>
          <div>
            <label className="input-label" htmlFor="current-password">Password saat ini</label>
            <input
              id="current-password"
              type="password"
              className="input-field"
              placeholder="Masukkan password saat ini"
              value={form.currentPassword}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, currentPassword: e.target.value }))
              }
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <div>
              <label className="input-label" htmlFor="new-pin">PIN baru</label>
              <input
                id="new-pin"
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="input-field"
                placeholder="6 digit angka"
                value={form.newPin}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    newPin: e.target.value.replace(/\D/g, "").slice(0, 6),
                  }))
                }
              />
            </div>

            <div>
              <label className="input-label" htmlFor="confirm-pin">Konfirmasi PIN baru</label>
              <input
                id="confirm-pin"
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="input-field"
                placeholder="Ulangi PIN baru"
                value={form.confirmPin}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    confirmPin: e.target.value.replace(/\D/g, "").slice(0, 6),
                  }))
                }
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <div>
              <label className="input-label" htmlFor="new-password">Password baru</label>
              <input
                id="new-password"
                type="password"
                className="input-field"
                placeholder="Minimal 8 karakter"
                value={form.newPassword}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, newPassword: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="input-label" htmlFor="confirm-password">Konfirmasi password baru</label>
              <input
                id="confirm-password"
                type="password"
                className="input-field"
                placeholder="Ulangi password baru"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setForm(EMPTY_FORM)}
            disabled={isSaving}
          >
            Reset
          </button>
        </div>
      </section>
    </div>
  );
}
