"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import DashboardLayout from "@/components/layout/DashboardLayout";
import BarcodeScanner from "@/components/common/BarcodeScanner";
import { useAuth, useToast } from "@/contexts/AppProviders";
import { getDb, enqueueSyncOp, type LocalProduct } from "@/lib/db";
import { formatRupiahFull } from "@/lib/utils";

interface OpnameItem {
  productId: string;
  sku?: string;
  name: string;
  systemStock: number;
  physicalStock: number;
}

export default function StockOpnamePage() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const { toast } = useToast();

  const products = useLiveQuery<LocalProduct[]>(
    () => (tenantId ? getDb().products.where("tenantId").equals(tenantId).toArray() : []),
    [tenantId]
  ) ?? [];

  const [opnameItems, setOpnameItems] = useState<OpnameItem[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [isOpnameActive, setIsOpnameActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F9") {
        e.preventDefault();
        if (isOpnameActive) setShowScanner((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpnameActive]);

  // Initialize opname items from products
  useEffect(() => {
    if (products.length > 0 && opnameItems.length === 0 && !isOpnameActive) {
      setOpnameItems(
        products.map((p) => ({
          productId: p.localId,
          sku: p.sku,
          name: p.name,
          systemStock: p.stock,
          physicalStock: p.stock, // Default to system stock
        }))
      );
    }
  }, [products, isOpnameActive, opnameItems.length]);

  const handleStartOpname = () => {
    setIsOpnameActive(true);
    toast("Stock Opname dimulai. Silakan sesuaikan jumlah stok fisik.", "info");
  };

  const handleCancelOpname = () => {
    if (confirm("Batalkan sesi Stock Opname? Perubahan belum disimpan.")) {
      setIsOpnameActive(false);
      setOpnameItems([]); // Will be re-initialized from system stock
    }
  };

  const handleUpdatePhysical = (productId: string, value: number) => {
    setOpnameItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, physicalStock: value } : item
      )
    );
  };

  const handleScan = (code: string) => {
    const item = opnameItems.find((i) => i.sku === code.toUpperCase());
    if (item) {
      handleUpdatePhysical(item.productId, item.physicalStock + 1);
      toast(`+1 ${item.name}`, "success");
      // Don't close scanner - continuous mode
    } else {
      toast(`Produk dengan SKU ${code} tidak ditemukan.`, "warning");
    }
  };

  const handleFinalize = async () => {
    if (!confirm("Apakah Anda yakin ingin memperbarui stok sistem sesuai data fisik?")) return;

    try {
      const db = getDb();
      await db.transaction("rw", [db.products, db.syncQueue], async () => {
        for (const item of opnameItems) {
          if (item.physicalStock !== item.systemStock) {
            const product = products.find((p) => p.localId === item.productId);
            if (product) {
              const updated = {
                ...product,
                stock: item.physicalStock,
                updatedAt: Date.now(),
                syncStatus: "PENDING" as const,
              };
              await db.products.put(updated);
              await enqueueSyncOp("products", product.localId, "UPDATE", updated);
            }
          }
        }
      });
      setIsOpnameActive(false);
      toast("Stock Opname berhasil difinalisasi!", "success");
    } catch (err) {
      toast("Gagal memfinalisasi stock opname.", "error");
    }
  };

  const filteredItems = opnameItems.filter(
    (i) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.sku && i.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <DashboardLayout title="Stock Opname">
      <div style={{ display: "grid", gap: "24px" }}>
        {/* Header Section */}
        <section className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: "18px" }}>Audit Stok Fisik</h2>
            <p style={{ marginTop: "4px", fontSize: "14px", color: "hsl(var(--text-secondary))" }}>
              Bandingkan stok di sistem dengan stok fisik di gudang/toko.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {!isOpnameActive ? (
              <button className="btn btn-primary" onClick={handleStartOpname}>
                ▶️ Mulai Opname
              </button>
            ) : (
              <>
                <button className="btn btn-ghost" onClick={handleCancelOpname}>
                  Batal
                </button>
                <button className="btn btn-primary" onClick={handleFinalize}>
                  💾 Finalisasi & Update Stok
                </button>
              </>
            )}
          </div>
        </section>

        {isOpnameActive && (
          <section className="card" style={{ background: "hsl(var(--primary) / 0.05)", border: "1px solid hsl(var(--primary) / 0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "hsl(var(--primary))" }}>Mode Opname Aktif</h3>
                <p style={{ fontSize: "13px", color: "hsl(var(--text-secondary))" }}>Scan produk untuk menambah jumlah fisik secara otomatis.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowScanner(true)} style={{ height: "48px", padding: "0 24px", fontSize: "16px", fontWeight: 800 }}>
                📷 Buka Scanner (F9)
              </button>
            </div>
          </section>
        )}

        <section className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px", borderBottom: "1px solid hsl(var(--border))" }}>
            <input 
              className="input-field" 
              placeholder="🔍 Cari produk untuk disesuaikan..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead style={{ background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border))" }}>
                <tr>
                  <th style={cellStyle}>Produk</th>
                  <th style={cellStyle}>SKU</th>
                  <th style={cellStyle}>Stok Sistem</th>
                  <th style={cellStyle}>Stok Fisik</th>
                  <th style={cellStyle}>Selisih</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "hsl(var(--text-muted))" }}>
                      Tidak ada produk ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const diff = item.physicalStock - item.systemStock;
                    return (
                      <tr key={item.productId} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                        <td style={{ ...cellStyle, fontWeight: 600 }}>{item.name}</td>
                        <td style={cellStyle}>{item.sku || "-"}</td>
                        <td style={cellStyle}>{item.systemStock}</td>
                        <td style={cellStyle}>
                          <input 
                            type="number" 
                            className="input-field" 
                            style={{ width: "80px", textAlign: "center", padding: "4px" }}
                            value={item.physicalStock}
                            onChange={(e) => handleUpdatePhysical(item.productId, Number(e.target.value) || 0)}
                            disabled={!isOpnameActive}
                          />
                        </td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: diff === 0 ? "inherit" : diff > 0 ? "hsl(var(--success))" : "hsl(var(--error))" }}>
                          {diff > 0 ? `+${diff}` : diff}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showScanner && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)", padding: "20px" }}>
          <div style={{ background: "hsl(var(--bg-elevated))", padding: "24px", borderRadius: "24px", width: "100%", maxWidth: "500px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "20px", fontWeight: 800 }}>Continuous Scanner</h3>
                <p style={{ fontSize: "13px", color: "hsl(var(--text-secondary))" }}>Scan barcode berkali-kali untuk menambah jumlah.</p>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowScanner(false)}>✕</button>
            </div>
            <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <button className="btn btn-primary btn-block" onClick={() => setShowScanner(false)}>Selesai Scanning</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

const cellStyle: React.CSSProperties = {
  padding: "16px",
  fontSize: "14px",
};
