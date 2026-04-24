"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import { formatRupiahFull } from "@/lib/utils";
import Link from "next/link";

export default function TopProductsCarousel() {
  const topProducts = useLiveQuery(async () => {
    const db = getDb();
    const sales = await db.sales.where("status").equals("COMPLETED").toArray();
    const saleIds = sales.map(s => s.localId);
    const items = await db.saleItems.where("saleLocalId").anyOf(saleIds).toArray();
    
    const counts: Record<string, { name: string, qty: number, price: number }> = {};
    items.forEach(item => {
      if (!counts[item.productId]) {
        counts[item.productId] = { name: item.productName, qty: 0, price: item.price };
      }
      counts[item.productId].qty += item.quantity;
    });

    const result = Object.entries(counts)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 7);

    return result.length > 0 ? result : null;
  }, []);

  const displayProducts = topProducts || [
    { id: "d1", name: "Contoh Produk 1", qty: 25, price: 15000 },
    { id: "d2", name: "Contoh Produk 2", qty: 18, price: 20000 },
    { id: "d3", name: "Contoh Produk 3", qty: 12, price: 12500 },
  ];

  return (
    <div className="top-products-outer-wrapper">
      <div className="section-header">
        <h3 className="section-title">🔥 Produk Terlaris</h3>
        <span className="section-subtitle">
          {topProducts ? "7 produk paling banyak dipesan" : "Contoh data (Belum ada transaksi)"}
        </span>
      </div>

      <div className="carousel-scroll-area">
        <div className="carousel-track">
          {displayProducts.map((product, index) => (
            <div key={product.id} className="product-card">
              <div className="rank-badge">#{index + 1}</div>
              <div className="product-info">
                <div className="product-name">{product.name}</div>
                <div className="product-stats">
                  <span className="qty-label">{product.qty} Terjual</span>
                  <span className="price-label">{formatRupiahFull(product.price)}</span>
                </div>
              </div>
            </div>
          ))}
          
          <Link href="/products" className="view-all-card">
            <div className="view-all-icon">📦</div>
            <span>Semua Produk</span>
          </Link>
        </div>
      </div>

      <style jsx>{`
        .top-products-outer-wrapper {
          margin-top: 8px;
          margin-bottom: 8px;
          width: 100%;
          overflow: hidden; /* Mencegah seluruh dashboard ikut geser */
        }
        .section-header {
          display: flex;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 12px;
        }
        .section-title {
          font-size: 16px;
          font-weight: 800;
          margin: 0;
          color: hsl(var(--text-primary));
        }
        .section-subtitle {
          font-size: 11px;
          color: hsl(var(--text-muted));
        }

        .carousel-scroll-area {
          overflow-x: auto;
          display: flex;
          padding: 4px 4px 16px 4px;
          scrollbar-width: none; 
          -ms-overflow-style: none;
          cursor: grab;
          -webkit-overflow-scrolling: touch; /* Smooth scroll on iOS */
        }
        .carousel-scroll-area::-webkit-scrollbar {
          display: none;
        }

        .carousel-track {
          display: flex;
          gap: 12px;
          /* Penting: jangan pakai margin negatif yang merusak layout luar */
        }

        .product-card {
          width: 150px;
          flex-shrink: 0;
          background: hsl(var(--bg-card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          padding: 14px;
          position: relative;
          box-shadow: 0 4px 10px rgba(0,0,0,0.04);
        }

        .rank-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background: hsl(var(--primary) / 0.1);
          color: hsl(var(--primary));
          font-size: 9px;
          font-weight: 800;
          padding: 3px 6px;
          border-radius: 6px;
        }

        .product-name {
          font-size: 13px;
          font-weight: 700;
          color: hsl(var(--text-primary));
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 34px;
          line-height: 1.3;
          margin-bottom: 8px;
        }

        .product-stats {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .qty-label {
          font-size: 11px;
          font-weight: 700;
          color: #10b981;
        }
        .price-label {
          font-size: 10px;
          color: hsl(var(--text-muted));
        }

        .view-all-card {
          width: 120px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: hsl(var(--bg-elevated));
          border: 1px dashed hsl(var(--border));
          border-radius: 16px;
          text-decoration: none;
          color: hsl(var(--text-secondary));
          font-size: 11px;
          font-weight: 700;
          padding: 14px;
        }
        .view-all-icon {
          font-size: 20px;
        }

        @media (max-width: 640px) {
          .section-header { flex-direction: column; gap: 2px; }
        }
      `}</style>
    </div>
  );
}
