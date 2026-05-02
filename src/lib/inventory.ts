import type {
  LocalPosTerminal,
  LocalProduct,
  LocalProductAssignment,
} from "@/lib/db";

type ProductSeed = Pick<LocalProduct, "localId" | "stock" | "costPrice">;
type ProductAssignmentSeed = Pick<
  LocalProductAssignment,
  "id" | "productId" | "terminalId" | "stock"
>;
type PosTerminalSeed = Pick<LocalPosTerminal, "id" | "name">;

export function buildAssignedStockByProduct(
  productAssignments: ProductAssignmentSeed[] | undefined
): Map<string, number> {
  const stockByProduct = new Map<string, number>();

  for (const assignment of productAssignments ?? []) {
    stockByProduct.set(
      assignment.productId,
      (stockByProduct.get(assignment.productId) ?? 0) + (assignment.stock || 0)
    );
  }

  return stockByProduct;
}

export function buildAssignmentsByProduct(
  productAssignments: ProductAssignmentSeed[] | undefined
): Map<string, ProductAssignmentSeed[]> {
  const assignmentsByProduct = new Map<string, ProductAssignmentSeed[]>();

  for (const assignment of productAssignments ?? []) {
    const current = assignmentsByProduct.get(assignment.productId) ?? [];
    current.push(assignment);
    assignmentsByProduct.set(assignment.productId, current);
  }

  return assignmentsByProduct;
}

export function buildTerminalNameById(
  posTerminals: PosTerminalSeed[] | undefined
): Map<string, string> {
  const terminalNameById = new Map<string, string>();

  for (const terminal of posTerminals ?? []) {
    terminalNameById.set(terminal.id, terminal.name);
  }

  return terminalNameById;
}

export function getProductTotalStock(
  product: ProductSeed,
  assignedStockByProduct: Map<string, number>
): number {
  return product.stock + (assignedStockByProduct.get(product.localId) ?? 0);
}

export function getProductInventoryValue(
  products: ProductSeed[] | undefined,
  productAssignments: ProductAssignmentSeed[] | undefined
): number {
  const assignedStockByProduct = buildAssignedStockByProduct(productAssignments);

  return (products ?? []).reduce(
    (sum, product) =>
      sum + getProductTotalStock(product, assignedStockByProduct) * (product.costPrice || 0),
    0
  );
}
