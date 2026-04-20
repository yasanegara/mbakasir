const STORE_REGISTRATION_TOKEN_PATTERN = /^[a-z0-9-]+$/;

export function buildStoreRegistrationPath(token: string): string {
  return `/register/store/${token}`;
}

export function normalizeStoreRegistrationToken(token: string): string {
  return token.trim().toLowerCase();
}

export function isStoreRegistrationToken(token: string): boolean {
  return STORE_REGISTRATION_TOKEN_PATTERN.test(
    normalizeStoreRegistrationToken(token)
  );
}
