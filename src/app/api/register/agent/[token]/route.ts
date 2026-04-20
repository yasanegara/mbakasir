import { NextRequest } from "next/server";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const agentRegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  whatsappNumber: z.string().min(8),
  password: z.string().min(6),
  nik: z.string().optional().or(z.literal("")),
  termsAccepted: z.boolean().refine(val => val === true, "Anda harus menyetujui Syarat dan Ketentuan"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Cek token valid
    const linkData = await prisma.agentRegistrationLink.findUnique({
      where: { token }
    });

    if (!linkData || !linkData.isActive) {
      return Response.json({ error: "Tautan pendaftaran agen ini salah atau sudah dinonaktifkan." }, { status: 400 });
    }

    const data = await req.json();
    const parsed = agentRegisterSchema.parse(data);

    // Cek duplikasi email di role Agen
    const existingAgent = await prisma.agent.findUnique({
      where: { email: parsed.email },
    });

    if (existingAgent) {
      return Response.json(
        { error: "Email ini sudah digunakan oleh agen lain" },
        { status: 400 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(parsed.password, salt);

    // Transaksi pembuatan agen dan update penggunaan link
    const newAgent = await prisma.$transaction(async (tx) => {
      const payload: any = {
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        whatsappNumber: parsed.whatsappNumber,
        nik: parsed.nik || null,
        passwordHash,
        tokenBalance: 0,
        tokenResalePrice: 0,
        isActive: true,
        registrationLinkId: linkData.id,
      };

      const created = await tx.agent.create({ data: payload });

      await tx.agentRegistrationLink.update({
        where: { id: linkData.id },
        data: {
          useCount: { increment: 1 },
          lastUsedAt: new Date(),
        }
      });

      return created;
    });

    return Response.json({ success: true, agentId: newAgent.id });
  } catch (err: any) {
    console.error("Agent Token Register Error:", err);
    return Response.json(
      { error: "Gagal memproses pendaftaran. Periksa input." },
      { status: 400 }
    );
  }
}
