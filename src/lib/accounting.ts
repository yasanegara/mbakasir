import type {
  LocalExpense,
  LocalFixedAsset,
  LocalProduct,
  LocalProductAssignment,
  LocalRawMaterial,
  LocalSale,
  LocalSaleItem,
  LocalSalesReturn,
  LocalSalesReturnItem,
  LocalShoppingItem,
  LocalStoreProfile,
} from "@/lib/db";

type StoreProfileAccountingSeed =
  | Pick<
      LocalStoreProfile,
      "initialCapital" | "setupType" | "initialInventoryValue" | "initialAssetsValue"
    >
  | null
  | undefined;

type SalesSeed = Pick<
  LocalSale,
  "localId" | "status" | "paymentMethod" | "totalAmount"
>;
type SaleItemSeed = Pick<
  LocalSaleItem,
  "saleLocalId" | "productId" | "costPrice" | "quantity" | "subtotal"
>;
type ExpenseSeed = Pick<LocalExpense, "amount">;
type ReturnSeed = Pick<
  LocalSalesReturn,
  "localId" | "saleLocalId" | "totalAmount"
>;
type ReturnItemSeed = Pick<
  LocalSalesReturnItem,
  "returnLocalId" | "productId" | "quantity" | "condition"
>;
type AssetSeed = Pick<LocalFixedAsset, "purchasePrice" | "archivedAt">;
type ProductSeed = Pick<
  LocalProduct,
  "id" | "localId" | "stock" | "costPrice" | "hasBoM"
>;
type ProductAssignmentSeed = Pick<LocalProductAssignment, "productId" | "stock">;
type RawMaterialSeed = Pick<LocalRawMaterial, "stock" | "costPerUnit">;
type ShoppingPurchaseSeed = Pick<
  LocalShoppingItem,
  "status" | "qtyToBuy" | "costPrice" | "costPerUnit"
>;

export interface AccountingDiagnostic {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
}

export interface OpeningCapitalBreakdown {
  setupType: "NEW" | "MIGRATE";
  openingEquity: number;
  openingCash: number;
  openingInventory: number;
  openingAssets: number;
  openingNonCashCapital: number;
}

export interface ProfitLossSnapshot {
  revenue: number;
  cogs: number;
  grossProfit: number;
  netProfit: number;
  expenseTotal: number;
  bottomLine: number;
  grossSales: number;
  salesReturns: number;
  returnedCogs: number;
  supplementalOnlineRevenue: number;
  supplementalOnlineOrderCount: number;
  diagnostics: AccountingDiagnostic[];
}

export interface CashFlowSnapshot extends OpeningCapitalBreakdown {
  salesInflow: number;
  cashSalesInflow: number;
  digitalSalesInflow: number;
  creditSalesInflow: number;
  stockPurchases: number;
  operatingExpenses: number;
  salesReturns: number;
  assetPurchases: number;
  operating: number;
  investing: number;
  financing: number;
  endingCash: number;
  endingDigitalCash: number;
  endingReceivables: number;
  endingLiquidity: number;
  supplementalOnlineRevenue: number;
  supplementalOnlineOrderCount: number;
  diagnostics: AccountingDiagnostic[];
}

export interface BalanceSheetSnapshot extends CashFlowSnapshot {
  warehouseProductInventory: number;
  terminalProductInventory: number;
  productInventory: number;
  materialInventory: number;
  totalInventory: number;
  totalCurrentAssets: number;
  totalFixedAssets: number;
  totalAssets: number;
  recordedLiabilities: number;
  profitBottomLine: number;
  referenceEquity: number;
  equityGap: number;
  totalEquity: number;
  expectedInventory: number;
  inventoryGap: number;
  diagnostics: AccountingDiagnostic[];
}

function sumBy<T>(items: T[] | undefined, getValue: (item: T) => number): number {
  return (items ?? []).reduce((sum, item) => sum + getValue(item), 0);
}

function appendDiagnostic(
  diagnostics: AccountingDiagnostic[],
  diagnostic: AccountingDiagnostic
) {
  if (
    diagnostics.some(
      (entry) =>
        entry.code === diagnostic.code && entry.message === diagnostic.message
    )
  ) {
    return;
  }

  diagnostics.push(diagnostic);
}

function mergeDiagnostics(
  ...groups: Array<AccountingDiagnostic[] | undefined>
): AccountingDiagnostic[] {
  const merged: AccountingDiagnostic[] = [];

  for (const group of groups) {
    for (const diagnostic of group ?? []) {
      appendDiagnostic(merged, diagnostic);
    }
  }

  return merged;
}

function getCompletedSales(sales: SalesSeed[] | undefined): SalesSeed[] {
  return (sales ?? []).filter((sale) => sale.status === "COMPLETED");
}

function splitSalesByPaymentMethod(sales: SalesSeed[] | undefined) {
  const completedSales = getCompletedSales(sales);

  return completedSales.reduce(
    (summary, sale) => {
      const amount = sale.totalAmount || 0;

      if (sale.paymentMethod === "CASH") {
        summary.cash += amount;
      } else if (sale.paymentMethod === "CREDIT") {
        summary.credit += amount;
      } else {
        summary.digital += amount;
      }

      summary.total += amount;
      return summary;
    },
    { cash: 0, digital: 0, credit: 0, total: 0 }
  );
}

function buildSaleItemCostIndex(
  saleItems: SaleItemSeed[] | undefined,
  completedSales: SalesSeed[]
) {
  const completedSaleIds = new Set(completedSales.map((sale) => sale.localId));
  const saleItemCostIndex = new Map<string, Map<string, { qty: number; unitCost: number }>>();

  for (const item of saleItems ?? []) {
    if (!completedSaleIds.has(item.saleLocalId)) continue;

    const saleMap =
      saleItemCostIndex.get(item.saleLocalId) ??
      new Map<string, { qty: number; unitCost: number }>();
    const existing = saleMap.get(item.productId);
    const nextQty = (existing?.qty ?? 0) + item.quantity;
    const nextValue =
      (existing?.qty ?? 0) * (existing?.unitCost ?? 0) +
      item.quantity * (item.costPrice || 0);

    saleMap.set(item.productId, {
      qty: nextQty,
      unitCost: nextQty > 0 ? nextValue / nextQty : 0,
    });
    saleItemCostIndex.set(item.saleLocalId, saleMap);
  }

  return saleItemCostIndex;
}

function calculateReturnedCogs(
  returns: ReturnSeed[] | undefined,
  returnItems: ReturnItemSeed[] | undefined,
  saleItems: SaleItemSeed[] | undefined,
  completedSales: SalesSeed[]
) {
  const diagnostics: AccountingDiagnostic[] = [];
  const returnById = new Map((returns ?? []).map((entry) => [entry.localId, entry]));
  const saleItemCostIndex = buildSaleItemCostIndex(saleItems, completedSales);

  let returnedCogs = 0;
  let unmatchedCount = 0;

  for (const returnItem of returnItems ?? []) {
    if (returnItem.condition !== "GOOD") continue;

    const returnRecord = returnById.get(returnItem.returnLocalId);
    if (!returnRecord) {
      unmatchedCount += 1;
      continue;
    }

    const saleCosts = saleItemCostIndex.get(returnRecord.saleLocalId);
    const matchedLine = saleCosts?.get(returnItem.productId);

    if (!matchedLine) {
      unmatchedCount += 1;
      continue;
    }

    returnedCogs += matchedLine.unitCost * returnItem.quantity;
  }

  if (unmatchedCount > 0) {
    appendDiagnostic(diagnostics, {
      code: "RETURN_COST_UNMATCHED",
      severity: "warning",
      message: `${unmatchedCount} item retur belum bisa dipulihkan HPP-nya karena tidak menemukan snapshot transaksi asal.`,
    });
  }

  return { returnedCogs, diagnostics };
}

function countProductsWithHybridBoM(
  products: ProductSeed[] | undefined,
  productAssignments: ProductAssignmentSeed[] | undefined
) {
  const assignedStockByProduct = new Map<string, number>();

  for (const assignment of productAssignments ?? []) {
    assignedStockByProduct.set(
      assignment.productId,
      (assignedStockByProduct.get(assignment.productId) ?? 0) + assignment.stock
    );
  }

  return (products ?? []).filter((product) => {
    if (!product.hasBoM) return false;

    const totalStock =
      (product.stock || 0) +
      (assignedStockByProduct.get(product.localId) ?? 0) +
      (assignedStockByProduct.get(product.id) ?? 0);

    return totalStock > 0;
  }).length;
}

export function summarizeOpeningCapital(
  storeProfile: StoreProfileAccountingSeed
): OpeningCapitalBreakdown {
  const initialCapital = storeProfile?.initialCapital ?? 0;
  const inferredMigration =
    (storeProfile?.initialInventoryValue ?? 0) > 0 ||
    (storeProfile?.initialAssetsValue ?? 0) > 0;
  const setupType =
    storeProfile?.setupType === "MIGRATE" || (!storeProfile?.setupType && inferredMigration)
      ? "MIGRATE"
      : "NEW";

  const openingInventory =
    setupType === "MIGRATE" ? storeProfile?.initialInventoryValue ?? 0 : 0;
  const openingAssets =
    setupType === "MIGRATE" ? storeProfile?.initialAssetsValue ?? 0 : 0;
  const openingNonCashCapital = openingInventory + openingAssets;
  const openingCash = initialCapital - openingNonCashCapital;

  return {
    setupType,
    openingEquity: initialCapital,
    openingCash,
    openingInventory,
    openingAssets,
    openingNonCashCapital,
  };
}

export function getProductInventoryValue(products: ProductSeed[] | undefined): number {
  return sumBy(products, (product) => (product.stock || 0) * (product.costPrice || 0));
}

export function getAssignedProductInventoryValue(
  products: ProductSeed[] | undefined,
  productAssignments: ProductAssignmentSeed[] | undefined
): number {
  if (!products?.length || !productAssignments?.length) return 0;

  const costByProductId = new Map<string, number>();
  for (const product of products) {
    const unitCost = product.costPrice || 0;
    costByProductId.set(product.localId, unitCost);
    costByProductId.set(product.id, unitCost);
  }

  return sumBy(
    productAssignments,
    (assignment) => (assignment.stock || 0) * (costByProductId.get(assignment.productId) || 0)
  );
}

export function getRawMaterialInventoryValue(
  rawMaterials: RawMaterialSeed[] | undefined
): number {
  return sumBy(
    rawMaterials,
    (material) => (material.stock || 0) * (material.costPerUnit || 0)
  );
}

export function getTotalInventoryValue(
  products: ProductSeed[] | undefined,
  rawMaterials: RawMaterialSeed[] | undefined,
  productAssignments?: ProductAssignmentSeed[] | undefined
): number {
  return (
    getProductInventoryValue(products) +
    getAssignedProductInventoryValue(products, productAssignments) +
    getRawMaterialInventoryValue(rawMaterials)
  );
}

export function getTotalFixedAssetValue(assets: AssetSeed[] | undefined): number {
  return sumBy(assets, (asset) => asset.purchasePrice || 0);
}

export function getTotalShoppingPurchases(
  stockPurchases: ShoppingPurchaseSeed[] | undefined
): number {
  return sumBy(
    (stockPurchases ?? []).filter((item) => item.status === "done"),
    (item) => item.qtyToBuy * ((item.costPrice || item.costPerUnit || 0) as number)
  );
}

interface ProfitLossParams {
  sales?: SalesSeed[];
  saleItems?: SaleItemSeed[];
  expenses?: ExpenseSeed[];
  returns?: ReturnSeed[];
  returnItems?: ReturnItemSeed[];
  onlineRevenue?: number;
  onlineOrderCount?: number;
}

export function calculateProfitLossSnapshot({
  sales,
  saleItems,
  expenses,
  returns,
  returnItems,
  onlineRevenue = 0,
  onlineOrderCount = 0,
}: ProfitLossParams): ProfitLossSnapshot {
  const completedSales = getCompletedSales(sales);
  const completedSaleIds = new Set(completedSales.map((sale) => sale.localId));
  const diagnostics: AccountingDiagnostic[] = [];

  const grossSales = sumBy(completedSales, (sale) => sale.totalAmount || 0);
  const grossCogs = sumBy(
    (saleItems ?? []).filter((item) => completedSaleIds.has(item.saleLocalId)),
    (item) => (item.costPrice || 0) * item.quantity
  );
  const salesReturns = sumBy(returns, (entry) => entry.totalAmount || 0);
  const returned = calculateReturnedCogs(returns, returnItems, saleItems, completedSales);
  const revenue = grossSales - salesReturns;
  const cogs = grossCogs - returned.returnedCogs;
  const grossProfit = revenue - cogs;
  const expenseTotal = sumBy(expenses, (expense) => expense.amount || 0);
  const bottomLine = grossProfit - expenseTotal;

  if (onlineRevenue > 0) {
    appendDiagnostic(diagnostics, {
      code: "ONLINE_REVENUE_EXCLUDED",
      severity: "warning",
      message: `Pesanan online ${onlineOrderCount} transaksi senilai Rp ${Math.round(
        onlineRevenue
      ).toLocaleString(
        "id-ID"
      )} belum dimasukkan ke laba rugi inti karena belum punya snapshot HPP, stok, dan kas yang setara POS.`,
    });
  }

  return {
    revenue,
    cogs,
    grossProfit,
    netProfit: grossProfit,
    expenseTotal,
    bottomLine,
    grossSales,
    salesReturns,
    returnedCogs: returned.returnedCogs,
    supplementalOnlineRevenue: onlineRevenue,
    supplementalOnlineOrderCount: onlineOrderCount,
    diagnostics: mergeDiagnostics(diagnostics, returned.diagnostics),
  };
}

interface CashFlowParams {
  storeProfile: StoreProfileAccountingSeed;
  sales?: SalesSeed[];
  expenses?: ExpenseSeed[];
  returns?: ReturnSeed[];
  assets?: AssetSeed[];
  stockPurchases?: ShoppingPurchaseSeed[];
  onlineRevenue?: number;
  onlineOrderCount?: number;
}

export function calculateCashFlowSnapshot({
  storeProfile,
  sales,
  expenses,
  returns,
  assets,
  stockPurchases,
  onlineRevenue = 0,
  onlineOrderCount = 0,
}: CashFlowParams): CashFlowSnapshot {
  const opening = summarizeOpeningCapital(storeProfile);
  const diagnostics: AccountingDiagnostic[] = [];
  const salesSplit = splitSalesByPaymentMethod(sales);
  const stockPurchaseOutflow = getTotalShoppingPurchases(stockPurchases);
  const operatingExpenses = sumBy(expenses, (expense) => expense.amount || 0);
  const salesReturns = sumBy(returns, (entry) => entry.totalAmount || 0);
  const recordedAssetPurchases = getTotalFixedAssetValue(assets);
  const assetPurchases = Math.max(0, recordedAssetPurchases - opening.openingAssets);

  const operating =
    salesSplit.cash - stockPurchaseOutflow - operatingExpenses - salesReturns;
  const investing = -assetPurchases;
  const financing = opening.openingCash;
  const endingCash = financing + operating + investing;
  const endingDigitalCash = salesSplit.digital;
  const endingReceivables = salesSplit.credit;
  const endingLiquidity = endingCash + endingDigitalCash;

  if (opening.openingCash < 0) {
    appendDiagnostic(diagnostics, {
      code: "OPENING_CASH_NEGATIVE",
      severity: "error",
      message:
        "Modal awal tunai bernilai negatif. Cek lagi setup modal migrasi karena stok + aset melebihi total modal awal yang dicatat.",
    });
  }

  if (salesSplit.digital > 0) {
    appendDiagnostic(diagnostics, {
      code: "DIGITAL_BALANCE_TRACKED_SEPARATELY",
      severity: "info",
      message:
        "Penerimaan QRIS/transfer dipisahkan dari kas laci dan dibaca sebagai saldo digital/bank tercatat.",
    });
  }

  if (salesSplit.credit > 0) {
    appendDiagnostic(diagnostics, {
      code: "CREDIT_SALES_OUTSTANDING",
      severity: "warning",
      message:
        "Ada penjualan kredit yang diakui sebagai piutang usaha, bukan kas masuk.",
    });
  }

  if (recordedAssetPurchases < opening.openingAssets) {
    appendDiagnostic(diagnostics, {
      code: "OPENING_ASSET_MASTER_INCOMPLETE",
      severity: "info",
      message:
        "Nilai aset awal lebih besar dari master aset yang sekarang tersimpan. Arus kas investasi hanya memakai penambahan aset yang benar-benar tercatat setelah setup awal.",
    });
  }

  if (onlineRevenue > 0) {
    appendDiagnostic(diagnostics, {
      code: "ONLINE_CASH_EXCLUDED",
      severity: "warning",
      message: `Pesanan online ${onlineOrderCount} transaksi belum dimasukkan ke arus kas inti karena aliran pembayarannya belum dijurnal setara POS.`,
    });
  }

  if (endingCash < 0) {
    appendDiagnostic(diagnostics, {
      code: "NEGATIVE_DRAWER_CASH",
      severity: "warning",
      message:
        "Kas laci hasil pembukuan menjadi negatif. Biasanya ini berarti ada pengeluaran, refund, atau modal kas yang belum dicatat lengkap.",
    });
  }

  return {
    ...opening,
    salesInflow: salesSplit.total,
    cashSalesInflow: salesSplit.cash,
    digitalSalesInflow: salesSplit.digital,
    creditSalesInflow: salesSplit.credit,
    stockPurchases: stockPurchaseOutflow,
    operatingExpenses,
    salesReturns,
    assetPurchases,
    operating,
    investing,
    financing,
    endingCash,
    endingDigitalCash,
    endingReceivables,
    endingLiquidity,
    supplementalOnlineRevenue: onlineRevenue,
    supplementalOnlineOrderCount: onlineOrderCount,
    diagnostics,
  };
}

interface BalanceSheetParams extends CashFlowParams, ProfitLossParams {
  products?: ProductSeed[];
  productAssignments?: ProductAssignmentSeed[];
  rawMaterials?: RawMaterialSeed[];
  currentAssets?: AssetSeed[];
}

export function calculateBalanceSheetSnapshot({
  products,
  productAssignments,
  rawMaterials,
  currentAssets,
  sales,
  saleItems,
  expenses,
  returns,
  returnItems,
  onlineRevenue = 0,
  onlineOrderCount = 0,
  ...cashFlowParams
}: BalanceSheetParams): BalanceSheetSnapshot {
  const cashFlow = calculateCashFlowSnapshot({
    ...cashFlowParams,
    sales,
    expenses,
    returns,
    onlineRevenue,
    onlineOrderCount,
  });
  const profitLoss = calculateProfitLossSnapshot({
    sales,
    saleItems,
    expenses,
    returns,
    returnItems,
    onlineRevenue,
    onlineOrderCount,
  });
  const diagnostics = mergeDiagnostics(cashFlow.diagnostics, profitLoss.diagnostics);

  const warehouseProductInventory = getProductInventoryValue(products);
  const terminalProductInventory = getAssignedProductInventoryValue(
    products,
    productAssignments
  );
  const productInventory = warehouseProductInventory + terminalProductInventory;
  const materialInventory = getRawMaterialInventoryValue(rawMaterials);
  const totalInventory = productInventory + materialInventory;
  const totalFixedAssets = getTotalFixedAssetValue(currentAssets ?? cashFlowParams.assets);
  const totalCurrentAssets =
    cashFlow.endingCash +
    cashFlow.endingDigitalCash +
    cashFlow.endingReceivables +
    totalInventory;
  const totalAssets = totalCurrentAssets + totalFixedAssets;
  const recordedLiabilities = 0;
  const totalEquity = totalAssets - recordedLiabilities;
  const referenceEquity = cashFlow.openingEquity + profitLoss.bottomLine;
  const equityGap = totalEquity - referenceEquity;
  const expectedInventory =
    cashFlow.openingInventory +
    cashFlow.stockPurchases -
    profitLoss.cogs;
  const inventoryGap = totalInventory - expectedInventory;
  const hybridBoMCount = countProductsWithHybridBoM(products, productAssignments);

  if (Math.abs(inventoryGap) >= 1) {
    appendDiagnostic(diagnostics, {
      code: "INVENTORY_RECONCILIATION_GAP",
      severity: "warning",
      message:
        "Nilai persediaan saat ini belum sama dengan roll-forward stok dari modal awal, pembelian, dan HPP. Biasanya terjadi karena opname manual, koreksi stok, resep BOM, atau transaksi lama yang belum lengkap.",
    });
  }

  if (hybridBoMCount > 0) {
    appendDiagnostic(diagnostics, {
      code: "BOM_HYBRID_STOCK",
      severity: "warning",
      message: `${hybridBoMCount} produk ber-BoM masih juga menyimpan stok produk jadi. Tanpa modul produksi, perpindahan bahan baku ke produk jadi belum punya jurnal konversi tersendiri.`,
    });
  }

  if ((currentAssets ?? cashFlowParams.assets)?.some((asset) => !asset.archivedAt)) {
    appendDiagnostic(diagnostics, {
      code: "DEPRECIATION_NOT_RECORDED",
      severity: "info",
      message:
        "Aset tetap masih disajikan pada biaya perolehan bruto. Penyusutan belum dibentuk sebagai jurnal akuntansi terpisah.",
    });
  }

  if (Math.abs(equityGap) >= 1) {
    appendDiagnostic(diagnostics, {
      code: "EQUITY_RECONCILIATION_GAP",
      severity: "warning",
      message:
        "Ekuitas residu dari aset tercatat belum sama dengan modal awal plus laba berjalan. Selisih ini ditampilkan sebagai hasil rekonsiliasi data, bukan akun penyeimbang buatan.",
    });
  }

  return {
    ...cashFlow,
    warehouseProductInventory,
    terminalProductInventory,
    productInventory,
    materialInventory,
    totalInventory,
    totalCurrentAssets,
    totalFixedAssets,
    totalAssets,
    recordedLiabilities,
    profitBottomLine: profitLoss.bottomLine,
    referenceEquity,
    equityGap,
    totalEquity,
    expectedInventory,
    inventoryGap,
    diagnostics,
  };
}
