"use client";

import { useState, useEffect } from "react";
import { useAuth, useToast } from "@/contexts/AppProviders";
import { getDb, enqueueSyncOp } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useBrand } from "@/contexts/BrandContext";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { formatRupiahFull } from "@/lib/utils";

export default function SetupWizardModal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const brand = useBrand();
  const isEdu = brand.appName === "Edu Intelligence";

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Welcome, 2: New Store, 3: Migrating
  const [modalType, setModalType] = useState<"NEW" | "MIGRATE" | null>(null);
  const [capital, setCapital] = useState(0);
  const [currentCash, setCurrentCash] = useState(0);
  const [isSeeding, setIsSeeding] = useState(false);
  
  const tenantId = user?.tenantId;
  const storeProfile = useLiveQuery(() => 
    tenantId ? getDb().storeProfile.get(tenantId).then(p => p || getDb().storeProfile.get("default")) : getDb().storeProfile.get("default")
  , [tenantId]);
  const products = useLiveQuery(() => getDb().products.toArray()) || [];
  const materials = useLiveQuery(() => getDb().rawMaterials.toArray()) || [];
  const assets = useLiveQuery(() => getDb().assets.toArray()) || [];

  const inventoryValue = products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0) + 
                         materials.reduce((sum, m) => sum + (m.stock * m.costPerUnit), 0);
  
  const assetsValue = assets.reduce((sum, a) => sum + a.purchasePrice, 0);

  // Jika profile belum ada sama sekali, buatkan record default
  useEffect(() => {
    if (storeProfile === undefined && tenantId) {
       const initProfile = async () => {
         const db = getDb();
         const exists = (await db.storeProfile.get("default")) || (await db.storeProfile.get(tenantId));
         if (!exists) {
           await db.storeProfile.put({
             id: tenantId,
             tenantId: tenantId,
             storeName: user?.name || "Toko Saya",
             isCrmEnabled: false,
             updatedAt: Date.now(),
             initialSetupCompleted: false
           });
         }
       };
       initProfile();
    }
  }, [storeProfile, tenantId, user?.name]);

  if (!storeProfile || storeProfile.initialSetupCompleted) return null;

  const handleFinish = async (finalCapital: number) => {
    try {
      if (!tenantId) return;
      const db = getDb();
      const updated = {
        ...storeProfile,
        id: tenantId,
        initialCapital: finalCapital,
        initialSetupCompleted: true,
        updatedAt: Date.now(),
      };
      await db.storeProfile.put(updated);
      await enqueueSyncOp("storeProfile", tenantId, "UPDATE", updated);
      toast("Pengaturan awal berhasil disimpan! Selamat berbisnis.", "success");
    } catch {
      toast("Gagal menyimpan pengaturan.", "error");
    }
  };

  const handleEduSeed = async () => {
    if (!tenantId) return;
    setIsSeeding(true);
    try {
      const db = getDb();
      
      // 1. Buat Kategori & Produk
      const categoryId = "cat-edu-coffee";
      await db.categories.put({
        id: categoryId,
        tenantId,
        name: "Minuman Kopi",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const products = [
        { id: "p1", name: "Americano Ice", costPrice: 8000, sellingPrice: 18000, stock: 20 },
        { id: "p2", name: "Caffe Latte", costPrice: 12000, sellingPrice: 25000, stock: 15 },
        { id: "p3", name: "Caramel Macchiato", costPrice: 15000, sellingPrice: 32000, stock: 10 },
      ];

      let totalStockCost = 0;
      for (const p of products) {
        const prod = {
          id: p.id,
          tenantId,
          categoryId,
          name: p.name,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
          stock: p.stock,
          unit: "Cup",
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await db.products.put(prod);
        totalStockCost += (p.costPrice * p.stock);
      }

      // 2. Catat Biaya Stok Awal agar memotong Kas
      const expenseId = "exp-edu-init";
      const expense = {
        id: expenseId,
        tenantId,
        category: "Stok Barang",
        amount: totalStockCost,
        note: "Pembelian Stok Awal (Simulasi Pelatihan)",
        date: Date.now(),
        paymentMethod: "CASH",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.expenses.put(expense);
      await enqueueSyncOp("expenses", expenseId, "CREATE", expense);

      // 3. Selesaikan Wizard dengan Modal 10 Juta
      const initialCapital = 10000000;
      await handleFinish(initialCapital);
      
      toast("Data pelatihan berhasil disiapkan!", "success");
    } catch (err) {
      console.error(err);
      toast("Gagal menyiapkan data pelatihan.", "error");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="modal-overlay active" style={{ zIndex: 10000 }}>
      <div className="card animate-slide-up" style={{ width: "100%", maxWidth: "500px", padding: "32px", textAlign: "center" }}>
        
        {step === 1 && (
          <div className="animate-fade-in">
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚀</div>
            <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "12px" }}>Selamat Datang di MbaKasir!</h2>
            <p style={{ color: "hsl(var(--text-secondary))", marginBottom: "24px", fontSize: "14px", lineHeight: 1.6 }}>
              Agar laporan keuangan (Neraca & Laba Rugi) Anda akurat, kami perlu mengetahui posisi awal modal Anda.
            </p>
            <div style={{ display: "grid", gap: "12px" }}>
              {isEdu && (
                <button 
                  className="btn btn-success btn-block" 
                  style={{ height: "56px", border: "2px solid hsl(var(--success))" }} 
                  onClick={handleEduSeed}
                  disabled={isSeeding}
                >
                  {isSeeding ? "⏳ Menyiapkan Data..." : "✨ Mulai dengan Data Pelatihan (Dummy)"}
                </button>
              )}
              <button className="btn btn-primary btn-block" style={{ height: "56px" }} onClick={() => setStep(2)}>
                ✨ Toko Baru (Mulai Hari Ini)
              </button>
              <button className="btn btn-outline btn-block" style={{ height: "56px" }} onClick={() => setStep(3)}>
                🔄 Toko Sudah Berjalan (Migrasi)
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "12px" }}>Modal Awal Toko Baru</h2>
            <p style={{ color: "hsl(var(--text-secondary))", marginBottom: "20px", fontSize: "13px" }}>
              Masukkan jumlah uang tunai yang Anda siapkan sebagai modal kerja hari ini.
            </p>
            <CurrencyInput 
              label="Modal Tunai (Cash)" 
              value={capital} 
              onChange={setCapital} 
              placeholder="Contoh: 5000000"
            />
            <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>Kembali</button>
              <button className="btn btn-primary" onClick={() => handleFinish(capital + inventoryValue + assetsValue)}>Selesai</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in" style={{ textAlign: "left" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "12px", textAlign: "center" }}>Migrasi Toko Berjalan</h2>
            <p style={{ color: "hsl(var(--text-secondary))", marginBottom: "20px", fontSize: "13px", textAlign: "center" }}>
              Jika Anda lupa modal awal tahun lalu, jangan khawatir. Kami akan menghitung modal berdasarkan nilai aset Anda saat ini.
            </p>
            
            <div className="card" style={{ background: "hsl(var(--bg-elevated))", padding: "16px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                <span>Nilai Stok Barang:</span>
                <span style={{ fontWeight: 700 }}>{formatRupiahFull(inventoryValue)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                <span>Nilai Aset Tetap:</span>
                <span style={{ fontWeight: 700 }}>{formatRupiahFull(assetsValue)}</span>
              </div>
              <div style={{ fontSize: "11px", color: "hsl(var(--text-muted))" }}>
                *Diambil otomatis dari modul Produk, Bahan Baku, dan Aset.
              </div>
            </div>

            <CurrencyInput 
              label="Uang Tunai di Laci/Kas Saat Ini" 
              value={currentCash} 
              onChange={setCurrentCash} 
              placeholder="0"
            />

            <div style={{ marginTop: "20px", padding: "16px", background: "hsl(var(--primary) / 0.05)", borderRadius: "12px", border: "1px solid hsl(var(--primary) / 0.2)" }}>
              <div style={{ fontSize: "12px", color: "hsl(var(--text-secondary))" }}>Total Modal Awal Terhitung (Tunai + Stok + Aset):</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "hsl(var(--primary))" }}>{formatRupiahFull(inventoryValue + assetsValue + currentCash)}</div>
            </div>

            <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>Kembali</button>
              <button className="btn btn-primary" onClick={() => handleFinish(currentCash + inventoryValue + assetsValue)}>Konfirmasi Modal</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
