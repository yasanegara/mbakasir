import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { NextRequest } from "next/server";
import { z } from "zod";

const CreateEmployeeSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  pin: z.string().length(6).regex(/^\d{6}$/, "PIN harus 6 digit angka"),
  password: z.string().min(8),
  role: z.enum(["CASHIER"]).default("CASHIER"),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "TENANT" || !session.tenantId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employees = await prisma.user.findMany({
    where: { tenantId: session.tenantId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      pin: true,
      isActive: true,
      createdAt: true,
    },
  });

  return Response.json({ employees });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "TENANT" || !session.tenantId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CreateEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { name, email, phone, pin, password, role } = parsed.data;

  // Cek apakah email sudah ada di tenant
  const existing = await prisma.user.findFirst({
    where: { tenantId: session.tenantId, email },
  });
  if (existing) {
    return Response.json({ error: "Email sudah terdaftar di toko ini" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  const employee = await prisma.user.create({
    data: {
      tenantId: session.tenantId,
      name,
      email,
      phone,
      pin,
      passwordHash,
      role,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      pin: true,
      isActive: true,
      createdAt: true,
    },
  });

  return Response.json({ employee }, { status: 201 });
}
