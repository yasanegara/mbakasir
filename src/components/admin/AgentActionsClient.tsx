"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/AppProviders";

export default function AgentActionsClient({
  agentId,
  agentName,
  agentPhone,
  isActive
}: {
  agentId: string;
  agentName: string;
  agentPhone: string | null;
  isActive: boolean;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleToggleStatus = async () => {
    if (!confirm(`Anda yakin ingin ${isActive ? "menangguhkan (suspend)" : "mengaktifkan kembali"} agen ${agentName}?`)) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/agents/${agentId}/action`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TOGGLE_STATUS", isActive: !isActive })
      });
      if (res.ok) {
        toast(`Agen ${agentName} berhasil diubah statusnya`, "success");
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
    if (!confirm(`PERINGATAN: Hapus permanen agen ${agentName}?\n\nPastikan agen tidak memiliki toko yang terikat (pindahkan toko terlebih dahulu).`)) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/agents/${agentId}/action`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok) {
        toast("Agen dihapus!", "success");
        router.refresh();
      } else {
        toast(data.error || "Gagal menghapus agen", "error");
      }
    } catch {
      toast("Kesalahan jaringan", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendWarning = () => {
    if (!agentPhone) {
      toast("Agen belum mencantumkan nomor HP/WA", "error");
      return;
    }
    const message = `Peringatan dari Pusat MbaKasir\n\nHalo Bpk/Ibu ${agentName},\n\nSistem kami mendeteksi anomali pada siklus lisensi atau aktivitas agen Anda... Mohon segera diselesaikan agar akun keagenan Anda tidak disuspen.`;
    const url = `https://wa.me/${agentPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
      <button 
        onClick={sendWarning}
        className="btn btn-ghost btn-sm"
        disabled={isSubmitting}
      >
        Peringatan
      </button>

      <button 
        onClick={handleToggleStatus}
        className="btn btn-ghost btn-sm"
        style={{ color: isActive ? "hsl(var(--warning))" : "hsl(var(--primary))" }}
        disabled={isSubmitting}
      >
        {isActive ? "Suspend" : "Aktifkan"}
      </button>

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
