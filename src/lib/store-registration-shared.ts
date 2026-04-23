const STORE_REGISTRATION_TOKEN_PATTERN = /^[a-z0-9-]+$/;
const STORE_LINK_KIND_PATTERN = /^(DIRECT|LANDING)$/;

export const STORE_AFFILIATE_COOKIE = "mbk_store_aff_token";
export const STORE_AFFILIATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 14; // 14 hari

export type StoreLinkKind = "DIRECT" | "LANDING";
export const DEFAULT_STORE_LINK_KIND: StoreLinkKind = "DIRECT";

export function buildStoreRegistrationPath(token: string): string {
  return `/register/store/${token}`;
}

export function buildStoreRegistrationHubPath(): string {
  return "/register/store";
}

export function buildStoreTrackingPath(
  token: string,
  kind: StoreLinkKind = DEFAULT_STORE_LINK_KIND
): string {
  const normalizedToken = normalizeStoreRegistrationToken(token);
  const normalizedKind = normalizeStoreLinkKind(kind);
  return `/go/store/${normalizedToken}?kind=${normalizedKind.toLowerCase()}`;
}

export function normalizeStoreRegistrationToken(token: string): string {
  return token.trim().toLowerCase();
}

export function isStoreRegistrationToken(token: string): boolean {
  return STORE_REGISTRATION_TOKEN_PATTERN.test(
    normalizeStoreRegistrationToken(token)
  );
}

export function normalizeStoreLinkKind(kind: string): StoreLinkKind {
  return kind.trim().toUpperCase() === "LANDING" ? "LANDING" : "DIRECT";
}

export function isStoreLinkKind(kind: string): kind is StoreLinkKind {
  return STORE_LINK_KIND_PATTERN.test(kind.trim().toUpperCase());
}

export function getStoreLinkKindFromQuery(raw: string | null | undefined): StoreLinkKind {
  if (!raw) return DEFAULT_STORE_LINK_KIND;
  return normalizeStoreLinkKind(raw);
}
