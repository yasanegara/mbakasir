"use client";

import { useState } from "react";
import styles from "./agent.module.css";

export default function AgentCalculator() {
  const [stores, setStores] = useState<number>(10);
  const [months, setMonths] = useState<number>(12); // Default 1 tahun

  // Harga Dasar
  const costPerMonth = 6250; // Modal Agen (1 token = 1 bulan)
  const retailPerMonth = 62500; // Harga Jual ke UMKM (1 bulan = Rp 62.500) -> 750.000 / tahun

  // Kalkulasi
  const totalCost = costPerMonth * stores * months;
  const totalRevenue = retailPerMonth * stores * months;
  const netProfit = totalRevenue - totalCost;

  return (
    <div className={styles.calcWrapper}>
      <div className={styles.calcControls}>
        <div className={styles.calcGroup}>
          <label className={styles.calcLabel}>
            Jumlah Toko Kelolaan: <strong>{stores} Toko</strong>
          </label>
          <input
            type="range"
            min="1"
            max="100"
            value={stores}
            onChange={(e) => setStores(Number(e.target.value))}
            className={styles.calcSlider}
          />
        </div>

        <div className={styles.calcGroup}>
          <label className={styles.calcLabel}>
            Durasi Langganan (Bulan): <strong>{months} Bulan</strong>
          </label>
          <input
            type="range"
            min="1"
            max="36"
            step="1"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className={styles.calcSlider}
          />
          <div className={styles.calcPresets}>
            <button onClick={() => setMonths(1)} className={months === 1 ? styles.activePreset : ""}>1 Bln</button>
            <button onClick={() => setMonths(12)} className={months === 12 ? styles.activePreset : ""}>1 Tahun</button>
            <button onClick={() => setMonths(24)} className={months === 24 ? styles.activePreset : ""}>2 Tahun</button>
          </div>
        </div>
      </div>

      <div className={styles.calcResults}>
        <div className={styles.resultRows}>
          <div className={styles.resultRow}>
            <span>Omzet Kotor ({retailPerMonth.toLocaleString("id-ID")} × {stores} × {months})</span>
            <strong>Rp {totalRevenue.toLocaleString("id-ID")}</strong>
          </div>
          <div className={styles.resultRow}>
            <span>Modal Token ({costPerMonth.toLocaleString("id-ID")} × {stores} × {months})</span>
            <strong className={styles.cost}>- Rp {totalCost.toLocaleString("id-ID")}</strong>
          </div>
          <div className={styles.resultDivider} />
          <div className={styles.resultRowFinal}>
            <span>Keuntungan Bersih Anda</span>
            <strong className={styles.profit}>Rp {netProfit.toLocaleString("id-ID")}</strong>
          </div>
        </div>
        <p className={styles.calcNote}>
          *Margin keuntungan luar biasa mencapai <strong>90%</strong>. Recurring income yang terjamin selama toko terus beroperasi.
        </p>
      </div>
    </div>
  );
}
