import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  STORE_AFFILIATE_COOKIE,
  buildStoreRegistrationPath,
  isStoreRegistrationToken,
  normalizeStoreRegistrationToken,
} from "@/lib/store-registration-shared";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function pickSingleValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0] ?? null;
  return null;
}

export default async function RegisterStoreHubPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const tokenFromQuery =
    pickSingleValue(resolvedSearchParams.store) ??
    pickSingleValue(resolvedSearchParams.agent) ??
    pickSingleValue(resolvedSearchParams.aff);

  const cookieStore = await cookies();
  const tokenFromCookie = cookieStore.get(STORE_AFFILIATE_COOKIE)?.value ?? null;
  const rawToken = tokenFromQuery || tokenFromCookie;

  if (rawToken && isStoreRegistrationToken(rawToken)) {
    const normalized = normalizeStoreRegistrationToken(rawToken);
    redirect(buildStoreRegistrationPath(normalized));
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
      }}
    >
      <section className="card" style={{ maxWidth: "680px", width: "100%", textAlign: "center" }}>
        <h1 style={{ fontSize: "28px", lineHeight: 1.2 }}>Link Agen Belum Terdeteksi</h1>
        <p style={{ marginTop: "10px", fontSize: "15px", color: "hsl(var(--text-secondary))", lineHeight: 1.6 }}>
          Untuk melanjutkan pendaftaran toko, gunakan link resmi dari agen Anda agar afiliasi tercatat dengan benar.
        </p>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", marginTop: "22px" }}>
          <Link href="/" className="btn btn-ghost">
            Kembali ke Halaman Depan
          </Link>
          <Link href="/login" className="btn btn-primary">
            Masuk ke Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}

