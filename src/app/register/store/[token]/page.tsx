import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StoreRegistrationForm from "@/components/public/StoreRegistrationForm";
import {
  isStoreRegistrationToken,
  normalizeStoreRegistrationToken,
} from "@/lib/store-registration-shared";

export const dynamic = "force-dynamic";

export default async function RegisterStorePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const normalizedToken = normalizeStoreRegistrationToken(token);

  let registrationLink = null;
  let isValidLink = false;

  if (normalizedToken === "edu") {
    // Jalur Edu: Gunakan Agen Demo virtual
    registrationLink = {
      isActive: true,
      agent: {
        name: "Demo Agen Edukasi",
        isActive: true,
      },
    };
    isValidLink = true;
  } else {
    // Jalur Normal: Cek database
    registrationLink = isStoreRegistrationToken(normalizedToken)
      ? await prisma.storeRegistrationLink.findUnique({
          where: {
            token: normalizedToken,
          },
          include: {
            agent: {
              select: {
                name: true,
                isActive: true,
              },
            },
          },
        })
      : null;

    isValidLink = Boolean(
      registrationLink?.isActive && registrationLink.agent.isActive
    );
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
      }}
    >
      <div style={{ display: "grid", gap: "20px", width: "100%", justifyItems: "center" }}>
        <section
          style={{
            width: "100%",
            maxWidth: "720px",
            padding: "24px",
            borderRadius: "24px",
            background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
            color: "white",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div style={{ fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.76 }}>
            MbaKasir Onboarding
          </div>
          <h1 style={{ marginTop: "10px", fontSize: "32px", lineHeight: 1.15 }}>
            Pendaftaran Toko Baru
          </h1>
          <p style={{ marginTop: "10px", fontSize: "15px", opacity: 0.86 }}>
            Form ini dipakai untuk membuat akun owner toko, tenant baru, dan POS
            utama default dalam satu langkah.
          </p>
        </section>

        {isValidLink && registrationLink ? (
          <StoreRegistrationForm
            token={normalizedToken}
            agentName={registrationLink.agent.name}
          />
        ) : (
          <section className="card" style={{ width: "100%", maxWidth: "720px" }}>
            <h2 style={{ fontSize: "24px" }}>Link Tidak Aktif</h2>
            <p style={{ marginTop: "10px", fontSize: "15px", color: "hsl(var(--text-secondary))" }}>
              Link pendaftaran toko ini sudah tidak berlaku atau agen
              penanggung jawab sedang nonaktif. Minta link baru dari agen Anda
              untuk melanjutkan pendaftaran.
            </p>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "22px" }}>
              <Link href="/login" className="btn btn-primary">
                Masuk ke Dashboard
              </Link>
              <Link href="/" className="btn btn-ghost">
                Kembali
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
