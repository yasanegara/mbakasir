import { useLiveQuery } from "dexie-react-hooks";
import { getDb, LocalStoreProfile } from "@/lib/db";

// Template default WA Struk
export const DEFAULT_WA_RECEIPT_TEMPLATE = `*🧾 STRUK BELANJA*
*{{storeName}}*
{{#address}}📍 {{address}}
{{/address}}{{#phone}}📞 {{phone}}
{{/phone}}
——————————
{{items}}
——————————
💰 Subtotal : Rp {{subtotal}}
{{#discount}}🏷️ Diskon    : -Rp {{discount}}
{{/discount}}💳 Total     : *Rp {{total}}*
💵 Bayar    : Rp {{paid}}
🔄 Kembali  : Rp {{change}}
——————————
Metode     : {{paymentMethod}}
No. Invoice: {{invoiceNo}}
{{#footerNote}}
{{footerNote}}{{/footerNote}}

_Terima kasih sudah berbelanja! 🙏_`;

// Template default WA Order/Pesanan
export const DEFAULT_WA_ORDER_TEMPLATE = `*📋 KONFIRMASI PESANAN*
*{{storeName}}*

Halo, berikut detail pesanan Anda:

{{items}}

💰 *Total: Rp {{total}}*
Metode bayar: {{paymentMethod}}

_Segera konfirmasi pesanan Anda._
_{{storeName}} — {{phone}}_`;

export const DEFAULT_STORE_PROFILE: Omit<LocalStoreProfile, "tenantId" | "updatedAt"> = {
  id: "default",
  storeName: "",
  address: "",
  phone: "",
  qrisImageUrl: "",
  footerNote: "Terima kasih atas kunjungan Anda!",
  waReceiptTemplate: DEFAULT_WA_RECEIPT_TEMPLATE,
  waOrderTemplate: DEFAULT_WA_ORDER_TEMPLATE,
  isCrmEnabled: false,
};

/**
 * Hook untuk baca/tulis profil toko dari IndexedDB.
 * Mengembalikan profile dan fungsi save.
 */
export function useStoreProfile(tenantId: string | undefined) {
  const profile = useLiveQuery<LocalStoreProfile | undefined>(
    () => {
      if (!tenantId) return Promise.resolve(undefined);
      return getDb().storeProfile.get("default");
    },
    [tenantId]
  );

  const saveProfile = async (data: Partial<Omit<LocalStoreProfile, "id" | "tenantId">>) => {
    if (!tenantId) throw new Error("tenantId wajib ada");
    const db = getDb();
    const now = Date.now();
    const existing = await db.storeProfile.get("default");
    if (existing) {
      await db.storeProfile.update("default", { ...data, updatedAt: now });
    } else {
      await db.storeProfile.put({
        ...DEFAULT_STORE_PROFILE,
        ...data,
        id: "default",
        tenantId,
        updatedAt: now,
      });
    }
  };

  return { profile, saveProfile };
}

/**
 * Render template WA dengan mengisi variabel dari konteks transaksi.
 * Mendukung {{variable}} dan {{#block}}...{{/block}} (opsional).
 */
export function renderWaTemplate(
  template: string,
  vars: Record<string, string | number | undefined | null>
): string {
  let result = template;

  // Render block opsional {{#key}}...{{/key}}
  for (const [key, val] of Object.entries(vars)) {
    const blockRegex = new RegExp(`\\{\\{#${key}\\}\\}([\\s\\S]*?)\\{\\{\\/${key}\\}\\}`, "g");
    if (val !== undefined && val !== null && val !== "" && val !== 0) {
      result = result.replace(blockRegex, "$1");
    } else {
      result = result.replace(blockRegex, "");
    }
  }

  // Render variabel biasa {{key}}
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(val ?? ""));
  }

  return result.trim();
}
