"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BrandBadge from "@/components/brand/BrandBadge";
import { useAuth, useToast } from "@/contexts/AppProviders";
import { useBrand } from "@/contexts/BrandContext";
import styles from "./agent-landing.module.css";

export default function AgentRegisterFormClient({ token }: { token: string }) {
  const router = useRouter();
  const { refetch } = useAuth();
  const { toast } = useToast();
  const brand = useBrand();

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
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      toast("Pendaftaran Agen Berhasil! Silakan Login.", "success");
      router.push("/login");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal melakukan pendaftaran agen";
      toast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "agen.demo@mbakasir.id", password: "Agent@Demo2026!" }),
      });

      const data = await res.json();

      if (res.ok) {
        toast("Masuk ke akun Demo Mitra berhasil", "success");
        await refetch();
        router.push("/dashboard");
      } else {
        toast(data.error || "Gagal login demo", "error");
      }
    } catch {
      toast("Terjadi kesalahan jaringan", "error");
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className={styles.pageWrap}>
      <div className={styles.container}>
        
        {/* KOLOM KIRI: MARKETING & DEMO */}
        <div className={styles.leftColumn}>
          <div className={styles.heroContent}>
            <div className={styles.badge}>🤝 Peluang Kemitraan Terbatas</div>
            <h1 className={styles.title}>Beri Dampak Nyata!</h1>
            <p className={styles.subtitle}>
              Bantu angkat derajat UMKM lokal di daerah Anda agar terlepas dari masalah selisih kasir dan pusingnya stok manual. Jadilah pahlawan digital bagi bisnis lokal, sambil membangun keuntungan yang stabil untuk Anda!
            </p>

            <div className={styles.features}>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>🌟</div>
                <div>
                  <h3 className={styles.featureTitle}>Jadi Pendamping Bisnis UMKM</h3>
                  <p className={styles.featureDesc}>Peran Anda lebih dari sekadar berjualan; Anda membimbing langsung pemilik warung dan toko beralih ke pembukuan digital yang rapi.</p>
                </div>
              </div>

              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>💸</div>
                <div>
                  <h3 className={styles.featureTitle}>Margin Tinggi Hingga 80%</h3>
                  <p className={styles.featureDesc}>Harga dasar token (lisensi) sangat rendah dari Pusat. Anda bebas menentukan harga layanan dampingan yang pantas ke toko.</p>
                </div>
              </div>
              
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>🔄</div>
                <div>
                  <h3 className={styles.featureTitle}>Penghasilan Pasif Berulang</h3>
                  <p className={styles.featureDesc}>Tiap tahun toko tentu akan tumbuh bersama sistem Anda. Saat mereka berterima kasih dan memperpanjang layanannya, Anda terus menerima pendapatan.</p>
                </div>
              </div>
              
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>🚀</div>
                <div>
                  <h3 className={styles.featureTitle}>Fokus Bantu Toko, Kami Urus Teknisnya</h3>
                  <p className={styles.featureDesc}>Biarkan kami dari Pusat yang memegang tanggung jawab server dan coding. Anda cukup fokus menebar manfaat di daerah Anda.</p>
                </div>
              </div>
            </div>

            <div className={styles.demoSection}>
              <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>Penasaran dengan Fiturnya?</h3>
              <p style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", marginBottom: "16px" }}>
                Gunakan aplikasi MbaKasir layaknya Agen profesional. Kelola toko dan cairkan token sekarang (mode demo).
              </p>
              <button 
                onClick={handleDemoLogin} 
                className="btn btn-block" 
                style={{ background: "hsl(var(--bg-card))", border: "1px solid hsl(var(--primary))", color: "hsl(var(--primary))", justifyContent: "center", fontSize: "15px", fontWeight: 600, padding: "12px" }}
                disabled={isDemoLoading}
              >
                {isDemoLoading ? "Memuat Demo..." : "💼 Masuk sebagai Demo Agen"}
              </button>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: FORM REGISTRASI */}
        <div className={styles.rightColumn}>
          <div className={`card ${styles.formCard}`}>
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div style={{ marginBottom: "16px", display: "flex", justifyContent: "center" }}>
                <BrandBadge logoUrl={brand.logoUrl} alt={brand.appName} size={60} />
              </div>
              <h1 style={{ fontSize: "28px", fontWeight: 800, color: "hsl(var(--primary))", letterSpacing: "-0.5px" }}>
                {brand.appName} Partner
              </h1>
            </div>
            <p style={{ color: "hsl(var(--text-secondary))", fontSize: "14px", marginBottom: "24px" }}>
              Silakan lengkapi data diri Anda untuk membuat akun Agen Resmi.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
              <div>
                <label className="input-label" htmlFor="name">Nama Lengkap / Nama Agensi</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className={`input-field ${styles.inputBg}`}
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Contoh: Budi Santoso / PT Kasir Nusantara"
                />
              </div>

              <div>
                <label className="input-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className={`input-field ${styles.inputBg}`}
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@domain.com"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label className="input-label" htmlFor="phone">No Telepon</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    className={`input-field ${styles.inputBg}`}
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="081234..."
                  />
                </div>
                <div>
                  <label className="input-label" htmlFor="whatsappNumber">No WhatsApp</label>
                  <input
                    id="whatsappNumber"
                    name="whatsappNumber"
                    type="tel"
                    required
                    className={`input-field ${styles.inputBg}`}
                    value={formData.whatsappNumber}
                    onChange={handleChange}
                    placeholder="081234..."
                  />
                </div>
              </div>

              <div>
                <label className="input-label" htmlFor="nik">NIK KTP (Opsional)</label>
                <input
                  id="nik"
                  name="nik"
                  type="text"
                  className={`input-field ${styles.inputBg}`}
                  value={formData.nik}
                  onChange={handleChange}
                  placeholder="16 Digit NIK KTP Anda"
                  maxLength={16}
                />
              </div>

              <div>
                <label className="input-label" htmlFor="password">Password Akses</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className={`input-field ${styles.inputBg}`}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Buat password (min. 6 karakter)"
                  minLength={6}
                />
              </div>

              <label style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginTop: "12px", fontSize: "14px", lineHeight: "1.5", color: "hsl(var(--text-secondary))" }}>
                <input
                  type="checkbox"
                  name="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={handleChange}
                  required
                  style={{ width: "18px", height: "18px", marginTop: "2px", accentColor: "hsl(var(--primary))" }}
                />
                <span>
                  Saya menyatakan data di atas benar dan menyetujui seluruh <a href="#" style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}>Syarat dan Ketentuan Kemitraan</a>.
                </span>
              </label>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={isSubmitting}
                style={{ padding: "14px", fontSize: "16px", justifyContent: "center", marginTop: "8px", border: "none" }}
              >
                {isSubmitting ? "Memproses Data..." : "Selesaikan Registrasi"}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
