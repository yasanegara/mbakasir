"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useToast } from "@/contexts/AppProviders";

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "TENANT" | "CASHIER";
  pin?: string;
  isActive: boolean;
  createdAt: string;
}

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  pin: "",
  password: "",
  confirmPassword: "",
};

export default function EmployeesPage() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [isSaving, setIsSaving] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/tenant/employees");
      const data = await res.json();
      if (res.ok) setEmployees(data.employees);
    } catch {
      toast("Gagal memuat data karyawan", "error");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password || !form.pin) {
      toast("Semua field wajib diisi", "warning");
      return;
    }
    if (form.pin.length !== 6 || !/^\d{6}$/.test(form.pin)) {
      toast("PIN harus 6 digit angka", "warning");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast("Konfirmasi password tidak cocok", "warning");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/tenant/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          pin: form.pin,
          password: form.password,
          role: "CASHIER",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(`Kasir ${data.employee.name} berhasil ditambahkan`, "success");
        setEmployees((prev) => [...prev, data.employee]);
        setForm({ ...EMPTY_FORM });
        setShowForm(false);
      } else {
        toast(data.error || "Gagal menambahkan karyawan", "error");
      }
    } catch {
      toast("Gagal menghubungi server", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (emp: Employee) => {
    try {
      const res = await fetch(`/api/tenant/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !emp.isActive }),
      });
      if (res.ok) {
        setEmployees((prev) => prev.map((e) => e.id === emp.id ? { ...e, isActive: !e.isActive } : e));
        toast(`Karyawan ${emp.isActive ? "dinonaktifkan" : "diaktifkan"}`, "success");
      }
    } catch {
      toast("Gagal mengubah status karyawan", "error");
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Yakin hapus karyawan "${emp.name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      const res = await fetch(`/api/tenant/employees/${emp.id}`, { method: "DELETE" });
      if (res.ok) {
        setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
        toast("Karyawan berhasil dihapus", "success");
      }
    } catch {
      toast("Gagal menghapus karyawan", "error");
    }
  };

  const cashiers = employees.filter((e) => e.role === "CASHIER");

  return (
    <DashboardLayout title="Manajemen Karyawan">
      <div style={{ display: "grid", gap: "24px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <div className="stat-card">
            <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>Total Kasir</span>
            <span className="stat-value">{cashiers.length}</span>
          </div>
          <div className="stat-card">
            <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>Kasir Aktif</span>
            <span className="stat-value" style={{ color: "hsl(var(--success))" }}>{cashiers.filter((e) => e.isActive).length}</span>
          </div>
          <div className="stat-card" style={{ background: "var(--gradient-primary)" }}>
            <span style={{ fontSize: "14px", color: "white", opacity: 0.85, fontWeight: 600 }}>💡 Info POS Slot</span>
            <span style={{ fontSize: "13px", color: "white", opacity: 0.88, marginTop: "6px", lineHeight: 1.5 }}>
              Setiap kasir butuh 1 slot POS. Tambah karyawan = tambah kebutuhan token POS.
            </span>
          </div>
        </div>

        {/* Header + Tombol */}
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{ fontSize: "18px" }}>Daftar Karyawan</h2>
            <p style={{ marginTop: "6px", fontSize: "13px", color: "hsl(var(--text-secondary))" }}>
              Tambah kasir baru, atur PIN login POS, dan kelola akses karyawan.
            </p>
          </div>
          <button
            className={`btn ${showForm ? "btn-ghost" : "btn-primary"}`}
            onClick={() => { setShowForm((v) => !v); setForm({ ...EMPTY_FORM }); }}
          >
            {showForm ? "Batal" : "+ Tambah Kasir"}
          </button>
        </div>

        {/* Form Tambah */}
        {showForm && (
          <div className="card" style={{ display: "grid", gap: "16px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700 }}>Form Kasir Baru</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
              <div>
                <label className="input-label" htmlFor="emp-name">Nama Lengkap</label>
                <input id="emp-name" className="input-field" placeholder="Budi Santoso" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="input-label" htmlFor="emp-email">Email</label>
                <input id="emp-email" type="email" className="input-field" placeholder="budi@warung.id" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="input-label" htmlFor="emp-phone">No. HP (opsional)</label>
                <input id="emp-phone" className="input-field" placeholder="08123456789" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label className="input-label" htmlFor="emp-pin">PIN POS (6 digit)</label>
                <input id="emp-pin" className="input-field" type="text" inputMode="numeric" maxLength={6} placeholder="123456" value={form.pin} onChange={(e) => setForm((p) => ({ ...p, pin: e.target.value.replace(/\D/g, "").slice(0, 6) }))} />
                <p style={{ fontSize: "11px", color: "hsl(var(--text-muted))", marginTop: "4px" }}>Dipakai untuk buka sesi POS</p>
              </div>
              <div>
                <label className="input-label" htmlFor="emp-pass">Password Login</label>
                <input id="emp-pass" type="password" className="input-field" placeholder="Min. 8 karakter" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
              </div>
              <div>
                <label className="input-label" htmlFor="emp-pass2">Konfirmasi Password</label>
                <input id="emp-pass2" type="password" className="input-field" placeholder="Ulangi password" value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
              <button className="btn btn-primary" disabled={isSaving} onClick={handleCreate}>
                {isSaving ? "Menyimpan..." : "Simpan Kasir"}
              </button>
              <button className="btn btn-ghost" onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); }}>Batal</button>
            </div>
          </div>
        )}

        {/* Tabel Karyawan */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {isLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "hsl(var(--text-muted))" }}>Memuat data karyawan...</div>
          ) : employees.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "hsl(var(--text-muted))" }}>Belum ada karyawan terdaftar.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border))" }}>
                <tr>
                  {["Nama", "Email", "Peran", "PIN", "Status", "Aksi"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "hsl(var(--text-secondary))", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 600, fontSize: "14px" }}>
                      {emp.name}
                      <div style={{ fontSize: "11px", color: "hsl(var(--text-muted))", fontWeight: 400 }}>{emp.phone || "—"}</div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "13px" }}>{emp.email}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span className={`badge ${emp.role === "TENANT" ? "badge-info" : "badge-success"}`} style={{ fontSize: "11px" }}>
                        {emp.role === "TENANT" ? "Owner" : "Kasir"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: "15px", letterSpacing: "3px" }}>
                      {emp.pin ? emp.pin : <span style={{ color: "hsl(var(--text-muted))", fontSize: "12px", letterSpacing: 0 }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span className={`badge ${emp.isActive ? "badge-success" : "badge-error"}`} style={{ fontSize: "11px" }}>
                        {emp.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {emp.role !== "TENANT" && (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(emp)} style={{ fontSize: "12px" }}>
                            {emp.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(emp)} style={{ fontSize: "12px", color: "hsl(var(--error))" }}>
                            Hapus
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
