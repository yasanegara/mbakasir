"use client";

import { useState } from "react";
import styles from "../landing.module.css";

const faqs = [
  {
    q: "Apakah MbaKasir harus selalu pakai internet?",
    a: "Tidak! Inilah kelebihan utama MbaKasir. Dengan teknologi Local-First, semua transaksi POS, pencatatan stok, dan operasional tetap berjalan lancar walau WiFi mati atau sinyal putus. Data akan otomatis tersinkronisasi ke cloud saat koneksi kembali.",
  },
  {
    q: "Harga Rp 750.000/tahun itu sudah termasuk apa saja?",
    a: "Sudah semua fitur lengkap: POS (kasir), manajemen stok & pembelian, Bill of Material (resep), laporan laba-rugi, CRM pelanggan dasar, dan struk WhatsApp. Tidak ada biaya tersembunyi. Satu harga, semua fitur.",
  },
  {
    q: "Gimana kalau HP saya ganti atau rusak?",
    a: "Tenang saja! Data Anda aman di cloud. Cukup login dari HP baru, semua data toko langsung muncul kembali. MbaKasir bisa diakses dari browser di HP, tablet, atau laptop mana pun.",
  },
  {
    q: "Apakah bisa dipakai untuk lebih dari satu toko atau kasir?",
    a: "Bisa! MbaKasir mendukung multi-terminal (kasir tambahan) dan arsitekturnya siap untuk multi-cabang. Hubungi Mba untuk info lebih lanjut tentang paket bundle toko.",
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className={styles.faqList}>
      {faqs.map((faq, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} className={`${styles.faqItem} ${isOpen ? styles.faqOpen : ""}`}>
            <button
              className={styles.faqQuestion}
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              id={`faq-btn-${i}`}
              aria-controls={`faq-answer-${i}`}
            >
              <span>{faq.q}</span>
              <span className={styles.faqChevron} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </button>
            <div
              id={`faq-answer-${i}`}
              role="region"
              aria-labelledby={`faq-btn-${i}`}
              className={styles.faqAnswer}
            >
              <p>{faq.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
