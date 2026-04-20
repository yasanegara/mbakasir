import { NextRequest } from "next/server";
import { z } from "zod";
import {
  getSession,
  hashPassword,
  normalizeEmailAddress,
} from "@/lib/auth";
import { findExistingLoginIdentity } from "@/lib/auth-identity";
import { prisma } from "@/lib/prisma";

const createAgentSchema = z.object({
  name: z.string().trim().min(2, "Nama agen minimal 2 karakter").max(120),
  email: z.string().trim().email("Email agen tidak valid"),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(72, "Password terlalu panjang"),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const parsed = createAgentSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message || "Data agen tidak valid" },
        { status: 400 }
      );
    }

    const email = normalizeEmailAddress(parsed.data.email);
    const existingIdentity = await findExistingLoginIdentity(prisma, email);

    if (existingIdentity) {
      return Response.json(
        { error: "Email ini sudah dipakai akun lain untuk login." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const agent = await prisma.agent.create({
      data: {
        name: parsed.data.name.trim(),
        email,
        phone: parsed.data.phone?.trim() || null,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    return Response.json({ success: true, agent });
  } catch (error) {
    console.error("Create Agent Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
