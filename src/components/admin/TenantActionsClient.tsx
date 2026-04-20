"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/AppProviders";
import { buildWhatsappUrl } from "@/lib/utils";

export default function TenantActionsClient({
  tenantId,
  tenantName,
  tenantPhone,
  status
}: {
  tenantId: string;
  tenantName: string;
  tenantPhone: string | null;
  status: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleChangeStatus = async (newStatus: string) => {
    if (!confirm(`Anda yakin ingin mengubah status toko ${tenantName} menjadi ${newStatus}?`)) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/action`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CHANGE_STATUS", status: newStatus })
      });
      if (res.ok) {
        toast(`Status ${tenantName} berhasil diubah`, "success");
        router.refresh();
      } else {
        toast("Gagal mengubah status", "error");
      }
    } catch {
      toast("Kesalahan jaringan", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`TINDAKAN DESTRUKTIF: Hapus permanen toko ${tenantName} beserta semua stok, laporan penjualan, dan user di dalamnya?`)) return;
    if (!confirm("Apakah Anda benar-benar yakin? Ini tidak dapat diurai (undo)!")) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/action`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok) {
        toast("Toko dihapus permanent!", "success");
        router.refresh();
      } else {
        toast(data.error || "Gagal menghapus", "error");
      }
    } catch {
      toast("Kesalahan jaringan", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendWarning = () => {
    if (!tenantPhone) {
      toast("Toko belum mencantumkan nomor HP/WA", "error");
      return;
    }
    const message = `Peringatan dari Pusat MbaKasir\n\nHalo pemilik toko ${tenantName},\n\nSistem kami mendeteksi anomali pada siklus lisensi atau aktivitas kasir Anda...`;
    const url = buildWhatsappUrl(tenantPhone, message);
    if (!url) {
      toast("Nomor WhatsApp toko tidak valid", "error");
      return;
    }
    window.open(url, "_blank");
  };

  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap", alignItems: "center", marginTop: "8px" }}>
      <button 
        onClick={sendWarning}
        className="btn btn-ghost btn-sm"
        disabled={isSubmitting}
      >
        Peringatan
      </button>

      {status !== "DORMANT" && (
        <button 
          onClick={() => handleChangeStatus("DORMANT")}
          className="btn btn-ghost btn-sm"
          style={{ color: "hsl(var(--warning))" }}
          disabled={isSubmitting}
        >
          Dorman
        </button>
      )}

      {status !== "SUSPENDED" && (
        <button 
          onClick={() => handleChangeStatus("SUSPENDED")}
          className="btn btn-ghost btn-sm"
          style={{ color: "hsl(var(--danger))" }}
          disabled={isSubmitting}
        >
          Suspend
        </button>
      )}

      {status !== "ACTIVE" && (
        <button 
          onClick={() => handleChangeStatus("ACTIVE")}
          className="btn btn-ghost btn-sm"
          style={{ color: "hsl(var(--primary))" }}
          disabled={isSubmitting}
        >
          Aktifkan
        </button>
      )}

      <button 
        onClick={handleDelete}
        className="btn btn-ghost btn-sm"
        style={{ color: "hsl(var(--danger))" }}
        disabled={isSubmitting}
      >
        Hapus
      </button>
    </div>
  );
}
