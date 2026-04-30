"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import BarcodeScanner from "@/components/common/BarcodeScanner";
import { useAuth, useToast } from "@/contexts/AppProviders";
import { getDb, enqueueSyncOp, type LocalProduct } from "@/lib/db";

interface OpnameItem {
  productId: string;
  sku?: string;
  name: string;
  systemStock: number;
  physicalStock: number;
}

export default function StockOpnameTab() {
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
    if (products.length > 0 && opnameItems.length === 0 && !isOpnameActive) {
      setOpnameItems(
        products.map((p) => ({
          productId: p.localId,
          sku: p.sku,
          name: p.name,
          systemStock: p.stock,
          physicalStock: p.stock,
        }))
      );
    }
  }, [products, isOpnameActive, opnameItems.length]);

  const handleStartOpname = () => {
    setIsOpnameActive(true);
    toast("Stock Opname dimulai.", "info");
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
    } else {
      toast(`SKU ${code} tidak ditemukan.`, "warning");
    }
  };

  const handleFinalize = async () => {
    if (!confirm("Update stok sistem sesuai data fisik?")) return;

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
      toast("Stock Opname selesai!", "success");
    } catch {
      toast("Gagal finalisasi.", "error");
    }
  };

  const filteredItems = opnameItems.filter(
    (i) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.sku && i.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <section className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: "18px" }}>Audit Stok Fisik</h2>
          <p style={{ fontSize: "14px", color: "hsl(var(--text-secondary))" }}>Bandingkan stok sistem dengan stok fisik.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {!isOpnameActive ? (
            <button className="btn btn-primary" onClick={handleStartOpname}>▶️ Mulai Opname</button>
          ) : (
            <button className="btn btn-primary" onClick={handleFinalize}>💾 Simpan Perubahan</button>
          )}
        </div>
      </section>

      {isOpnameActive && (
        <section className="card" style={{ background: "hsl(var(--primary) / 0.05)", border: "1px solid hsl(var(--primary) / 0.2)", textAlign: "center" }}>
          <button className="btn btn-primary" onClick={() => setShowScanner(true)}>📷 Scan Barcode Produk</button>
        </section>
      )}

      <section className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid hsl(var(--border))" }}>
          <input className="input-field" placeholder="🔍 Cari produk..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border))" }}>
              <tr>
                <th style={cellStyle}>Produk</th>
                <th style={cellStyle}>Stok Sistem</th>
                <th style={cellStyle}>Stok Fisik</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.productId} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                  <td style={cellStyle}>{item.name}</td>
                  <td style={cellStyle}>{item.systemStock}</td>
                  <td style={cellStyle}>
                    <input 
                      type="number" 
                      className="input-field" 
                      style={{ width: "80px" }}
                      value={item.physicalStock}
                      onChange={(e) => handleUpdatePhysical(item.productId, Number(e.target.value) || 0)}
                      disabled={!isOpnameActive}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showScanner && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)", padding: "20px" }}>
          <div style={{ background: "hsl(var(--bg-elevated))", padding: "24px", borderRadius: "24px", width: "100%", maxWidth: "500px" }}>
            <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
            <button className="btn btn-primary btn-block" style={{ marginTop: "20px" }} onClick={() => setShowScanner(false)}>Selesai</button>
          </div>
        </div>
      )}
    </div>
  );
}

const cellStyle: React.CSSProperties = { padding: "16px", fontSize: "14px" };
