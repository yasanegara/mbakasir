// ============================================================
// FORMAT UTILITIES — Rupiah, Tanggal, Invoice
// ============================================================

/**
 * Format angka ke format Rupiah dengan titik sebagai separator ribuan
 * Contoh: 150000 → "150.000"
 */
export function formatRupiah(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0";
  return num.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Format ke Rupiah lengkap dengan prefix "Rp"
 * Contoh: 150000 → "Rp 150.000"
 */
export function formatRupiahFull(amount: number | string): string {
  return `Rp ${formatRupiah(amount)}`;
}

/**
 * Parse string Rupiah kembali ke number
 * Contoh: "150.000" → 150000
 */
export function parseRupiah(value: string): number {
  const cleaned = value.replace(/\./g, "").replace(/[^0-9]/g, "");
  return parseInt(cleaned, 10) || 0;
}

/**
 * Real-time thousand separator saat user mengetik
 * Contoh input: "1500000" → output: "1.500.000"
 */
export function formatWhileTyping(raw: string): string {
  const numericOnly = raw.replace(/\D/g, "");
  if (!numericOnly) return "";
  return parseInt(numericOnly, 10).toLocaleString("id-ID");
}

/**
 * Normalisasi nomor WhatsApp ke format internasional angka-only.
 * Contoh: 08123... -> 628123..., +62812... -> 62812...
 */
export function normalizeWhatsappNumber(value: string): string {
  const digitsOnly = value.replace(/\D/g, "");

  if (!digitsOnly) {
    return "";
  }

  if (digitsOnly.startsWith("62")) {
    return digitsOnly;
  }

  if (digitsOnly.startsWith("0")) {
    return `62${digitsOnly.slice(1)}`;
  }

  return digitsOnly;
}

export function buildWhatsappUrl(
  phoneNumber: string,
  message: string
): string | null {
  const normalizedPhone = normalizeWhatsappNumber(phoneNumber);

  if (!normalizedPhone) {
    return null;
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Generate nomor invoice unik
 * Format: INV-YYYYMMDD-XXXXX
 */
export function generateInvoiceNo(prefix = "INV"): string {
  const now = new Date();
  const date = now
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const random = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, "0");
  return `${prefix}-${date}-${random}`;
}

/**
 * Format tanggal ke format Indonesia
 * Contoh: "19 April 2026, 16:09"
 */
export function formatDate(date: Date | number | string): string {
  const d = typeof date === "number" ? new Date(date) : new Date(date);
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format tanggal singkat: "19 Apr 2026"
 */
export function formatDateShort(date: Date | number | string): string {
  const d = typeof date === "number" ? new Date(date) : new Date(date);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Hitung sisa hari masa aktif
 */
export function getDaysRemaining(premiumUntil?: number | null): number {
  if (!premiumUntil) return 0;
  const diff = premiumUntil - Date.now();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Cek apakah toko sudah expired
 */
export function isExpired(premiumUntil?: number | null): boolean {
  if (!premiumUntil) return true;
  return Date.now() > premiumUntil;
}

/**
 * Generate UUID v4 sederhana (untuk localId Dexie)
 */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
