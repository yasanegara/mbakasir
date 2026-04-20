"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/AppProviders";
import { formatRupiahFull } from "@/lib/utils";

interface AgentPackage {
  id: string;
  name: string;
  tokenAmount: number;
  price: number;
  isActive: boolean;
  description: string | null;
}

export default function AgentPackageManager({ tokenSymbol }: { tokenSymbol: string }) {
  const [packages, setPackages] = useState<AgentPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<AgentPackage>>({});
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    tokenAmount: 1,
    price: 0,
    description: "",
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await fetch("/api/admin/agent-packages");
      const data = await res.json();
      if (res.ok) {
        setPackages(data.packages);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/agent-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: Number(formData.price),
          tokenAmount: Number(formData.tokenAmount)
        }),
      });

      if (res.ok) {
        toast("Paket berhasil ditambahkan", "success");
        setFormData({ name: "", tokenAmount: 1, price: 0, description: "" });
        fetchPackages();
      } else {
        const err = await res.json();
        toast(err.error || "Gagal menambah paket", "error");
      }
    } catch {
      toast("Kesalahan jaringan", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus paket ini?")) return;
    try {
      const res = await fetch(`/api/admin/agent-packages/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPackages(packages.filter(p => p.id !== id));
        toast("Paket dihapus", "success");
      } else {
        toast("Gagal menghapus paket", "error");
      }
    } catch {
      toast("Kesalahan sistem", "error");
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/agent-packages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        const data = await res.json();
        setPackages(packages.map(p => p.id === id ? data.package : p));
      }
    } catch {
      toast("Gagal mengubah status", "error");
    }
  };

  const startEdit = (pkg: AgentPackage) => {
    setEditingId(pkg.id);
    setEditFormData(pkg);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleUpdate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/agent-packages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editFormData.name,
          tokenAmount: Number(editFormData.tokenAmount),
          price: Number(editFormData.price),
          description: editFormData.description,
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPackages(packages.map(p => p.id === id ? data.package : p));
        toast("Paket berhasil diupdate", "success");
        setEditingId(null);
      } else {
        toast("Gagal mengupdate paket", "error");
      }
    } catch {
      toast("Kesalahan sistem", "error");
    }
  };

  return (
    <section className="card">
      <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>Paket Bundling Pembelian Agen</h2>
      <p style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", marginBottom: "24px" }}>
        Konfigurasi paket pembelian token standar agar agen dapat dengan mudah melihat harga paket yang tersedia.
      </p>

      <form onSubmit={handleCreate} style={{ display: "grid", gap: "16px", background: "hsl(var(--bg-elevated))", padding: "20px", borderRadius: "12px", border: "1px solid hsl(var(--border))", marginBottom: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <div>
            <label className="input-label">Nama Paket</label>
            <input type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Misal: Paket Gold (Bonus 10)" required />
          </div>
          <div>
            <label className="input-label">Jumlah Token Didapat</label>
            <input type="number" min={1} className="input-field" value={formData.tokenAmount} onChange={e => setFormData({...formData, tokenAmount: Number(e.target.value)})} required />
          </div>
          <div>
            <label className="input-label">Harga Jual (Rp)</label>
            <input type="number" min={0} className="input-field" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} required />
          </div>
        </div>
        <div>
          <label className="input-label">Deskripsi Tambahan (Opsional)</label>
          <input type="text" className="input-field" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Sangat cocok untuk agen besar." />
        </div>
        
        <button type="submit" className="btn btn-primary" disabled={isSubmitting || !formData.name}>
          {isSubmitting ? "Menyimpan..." : "Tambah Paket Baru"}
        </button>
      </form>

      <div style={{ display: "grid", gap: "16px" }}>
        {isLoading ? (
          <p>Memuat paket...</p>
        ) : packages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px", border: "1px dashed hsl(var(--border))", borderRadius: "12px" }}>
            Belum ada paket yang dikonfigurasi.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "hsl(var(--bg-elevated))", textAlign: "left" }}>
                <tr>
                  <th style={{ padding: "12px", fontSize: "14px" }}>Nama Paket & Deskripsi</th>
                  <th style={{ padding: "12px", fontSize: "14px" }}>Token</th>
                  <th style={{ padding: "12px", fontSize: "14px" }}>Harga (Rp)</th>
                  <th style={{ padding: "12px", fontSize: "14px" }}>Tampil</th>
                  <th style={{ padding: "12px", fontSize: "14px", textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {packages.map(p => {
                  if (editingId === p.id) {
                    return (
                      <tr key={p.id} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                        <td style={{ padding: "12px" }}>
                          <input type="text" className="input-field" value={editFormData.name || ""} onChange={e => setEditFormData({...editFormData, name: e.target.value})} style={{ marginBottom: "4px" }} />
                          <input type="text" className="input-field" value={editFormData.description || ""} onChange={e => setEditFormData({...editFormData, description: e.target.value})} placeholder="Deskripsi" />
                        </td>
                        <td style={{ padding: "12px" }}>
                          <input type="number" min={1} className="input-field" value={editFormData.tokenAmount || 0} onChange={e => setEditFormData({...editFormData, tokenAmount: Number(e.target.value)})} style={{ width: "80px" }} />
                        </td>
                        <td style={{ padding: "12px" }}>
                          <input type="number" min={0} className="input-field" value={editFormData.price || 0} onChange={e => setEditFormData({...editFormData, price: Number(e.target.value)})} style={{ width: "120px" }} />
                        </td>
                        <td style={{ padding: "12px" }}>
                          <input type="checkbox" checked={p.isActive} disabled />
                        </td>
                        <td style={{ padding: "12px", textAlign: "right" }}>
                          <button onClick={() => handleUpdate(p.id)} className="btn btn-ghost" style={{ color: "hsl(var(--primary))", padding: "4px 8px" }}>Simpan</button>
                          <button onClick={cancelEdit} className="btn btn-ghost" style={{ padding: "4px 8px" }}>Batal</button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontWeight: "bold" }}>{p.name}</div>
                        <div style={{ fontSize: "12px", color: "hsl(var(--text-secondary))" }}>{p.description}</div>
                      </td>
                      <td style={{ padding: "12px", fontWeight: "bold", color: "hsl(var(--primary))" }}>{p.tokenAmount} {tokenSymbol}</td>
                      <td style={{ padding: "12px", fontWeight: "bold" }}>{formatRupiahFull(p.price)}</td>
                      <td style={{ padding: "12px" }}>
                        <input type="checkbox" checked={p.isActive} onChange={() => toggleActive(p.id, p.isActive)} />
                      </td>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        <button onClick={() => startEdit(p)} className="btn btn-ghost" style={{ padding: "4px 8px" }}>Edit</button>
                        <button onClick={() => handleDelete(p.id)} className="btn btn-ghost" style={{ color: "hsl(var(--danger))", padding: "4px 8px" }}>Hapus</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
