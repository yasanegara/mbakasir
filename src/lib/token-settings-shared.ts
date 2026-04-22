export const DEFAULT_TOKEN_CONFIG_ID = "default";
export const BASE_TOKEN_PRICE = 6250;

export interface TokenConversionSnapshot {
  id?: string;
  targetKey: string;
  targetLabel: string;
  moduleKey?: string | null;
  tokenCost: number;
  rewardQuantity: number;
  rewardUnit: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface TokenConfigSnapshot {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  pricePerToken: number;
  currencyCode: string;
  hppRatio: number; // % biaya operasional (0–100)
  notes?: string | null;
  conversions: TokenConversionSnapshot[];
}

export const DEFAULT_TOKEN_CONFIG: TokenConfigSnapshot = {
  id: DEFAULT_TOKEN_CONFIG_ID,
  tokenName: "SuperToken",
  tokenSymbol: "T.",
  pricePerToken: BASE_TOKEN_PRICE,
  currencyCode: "IDR",
  hppRatio: 40,
  notes: "Token bisa dikonversi ke lisensi dan modul lain sesuai aturan aktif.",
  conversions: [
    {
      targetKey: "LICENSE_MONTH",
      targetLabel: "Bulan Lisensi Toko",
      moduleKey: "CORE_POS",
      tokenCost: 1,
      rewardQuantity: 1,
      rewardUnit: "bulan",
      description: "Aturan default untuk aktivasi/perpanjangan toko.",
      isActive: true,
      sortOrder: 0,
    },
    {
      targetKey: "POS_SLOT",
      targetLabel: "Terminal POS Tambahan",
      moduleKey: "CORE_POS",
      tokenCost: 1,
      rewardQuantity: 1,
      rewardUnit: "terminal POS",
      description: "Tambahan terminal POS di atas POS utama bawaan toko.",
      isActive: true,
      sortOrder: 1,
    },
  ],
};

export function getTokenConversion(
  config: TokenConfigSnapshot,
  targetKey: string
): TokenConversionSnapshot | null {
  return (
    config.conversions.find(
      (conversion) => conversion.targetKey === targetKey && conversion.isActive
    ) ?? null
  );
}

export function calculateTokenCostForQuantity(
  conversion: TokenConversionSnapshot,
  requestedQuantity: number
): number {
  const bundleSize = Math.max(1, conversion.rewardQuantity);
  const bundleCount = Math.ceil(requestedQuantity / bundleSize);
  return bundleCount * Math.max(1, conversion.tokenCost);
}

export function formatTokenConversion(conversion: TokenConversionSnapshot): string {
  return `${conversion.tokenCost} token => ${conversion.rewardQuantity} ${conversion.rewardUnit}`;
}
