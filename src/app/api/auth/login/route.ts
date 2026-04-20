import { prisma as db } from "@/lib/prisma";
import {
  normalizeEmailAddress,
  verifyPassword,
  signToken,
  setSessionCookie,
} from "@/lib/auth";
import { NextRequest } from "next/server";

// ============================================================
// AUTHENTICATION API — /api/auth/login
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const normalizedEmail =
      typeof email === "string" ? normalizeEmailAddress(email) : "";

    if (!normalizedEmail || !password) {
      return Response.json({ error: "Email dan password wajib diisi" }, { status: 400 });
    }

    // 1. Cek SuperAdmin
    const superAdmin = await db.superAdmin.findUnique({ where: { email: normalizedEmail } });
    if (superAdmin && await verifyPassword(password, superAdmin.passwordHash)) {
      const token = signToken({
        sub: superAdmin.id,
        email: superAdmin.email,
        role: "SUPERADMIN",
        name: superAdmin.name,
      });
      await setSessionCookie(token);
      return Response.json({ role: "SUPERADMIN" });
    }

    // 2. Cek Agen
    const agent = await db.agent.findUnique({ where: { email: normalizedEmail } });
    if (agent && agent.isActive && await verifyPassword(password, agent.passwordHash)) {
      const token = signToken({
        sub: agent.id,
        email: agent.email,
        role: "AGENT",
        name: agent.name,
        agentId: agent.id,
      });
      await setSessionCookie(token);
      return Response.json({ role: "AGENT" });
    }

    // 3. Cek User (Tenant/Cashier)
    // Find first matching email. If there are multiple (e.g. same email across tenants), 
    // ideally we need tenant hint, but for simplicity we take first active.
    const user = await db.user.findFirst({ 
      where: { email: normalizedEmail, isActive: true },
      include: { tenant: true }
    });
    
    if (user && await verifyPassword(password, user.passwordHash)) {
       if (user.tenant.status === "SUSPENDED") {
         return Response.json({ error: "Toko sedang disuspensi" }, { status: 403 });
       }
       
      const token = signToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        tenantId: user.tenantId,
      });
      await setSessionCookie(token);
      return Response.json({ role: user.role });
    }

    return Response.json({ error: "Email atau password salah" }, { status: 401 });

  } catch (error) {
    console.error("Login API Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
