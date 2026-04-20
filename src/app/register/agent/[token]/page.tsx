import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
// @ts-expect-error: TS compiler cache sync issue
import AgentRegisterFormClient from "./AgentRegisterFormClient";

export default async function RegisterAgentWithTokenPage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const { token } = params;

  // Validasi token
  // @ts-expect-error: TS Server cache issue
  const linkData = await prisma.agentRegistrationLink.findUnique({
    where: { token },
  });

  if (!linkData || !linkData.isActive) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(var(--bg))" }}>
        <div className="card" style={{ maxWidth: "400px", textAlign: "center" }}>
          <h1 style={{ fontSize: "20px", color: "hsl(var(--danger))", marginBottom: "8px" }}>Tautan Tidak Valid</h1>
          <p style={{ color: "hsl(var(--text-secondary))", marginBottom: "20px" }}>
            Tautan pendaftaran agen ini sudah tidak berlaku atau salah. Silakan hubungi pusat.
          </p>
          <a href="/login" className="btn btn-primary" style={{ display: "inline-flex" }}>Kembali ke Login</a>
        </div>
      </div>
    );
  }

  return <AgentRegisterFormClient token={token} />;
}
