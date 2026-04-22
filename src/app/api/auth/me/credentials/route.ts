import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const UpdateCashierCredentialsSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
    newPin: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "PIN baru harus 6 digit angka")
      .optional(),
    newPassword: z
      .string()
      .min(8, "Password baru minimal 8 karakter")
      .optional(),
  })
  .refine((data) => data.newPin || data.newPassword, {
    message: "Isi PIN baru atau password baru",
    path: ["newPin"],
  });

export async function PATCH(req: NextRequest) {
  const session = await getSession();

  if (!session || session.role !== "CASHIER" || !session.sub || !session.tenantId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const payload = {
    currentPassword:
      typeof body.currentPassword === "string" ? body.currentPassword : "",
    newPin:
      typeof body.newPin === "string" && body.newPin.trim()
        ? body.newPin.trim()
        : undefined,
    newPassword:
      typeof body.newPassword === "string" && body.newPassword.trim()
        ? body.newPassword
        : undefined,
  };

  const parsed = UpdateCashierCredentialsSchema.safeParse(payload);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Response.json({ error: firstIssue?.message || "Payload tidak valid" }, { status: 422 });
  }

  const cashier = await prisma.user.findFirst({
    where: {
      id: session.sub,
      tenantId: session.tenantId,
      role: "CASHIER",
      isActive: true,
    },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!cashier) {
    return Response.json({ error: "Akun kasir tidak ditemukan" }, { status: 404 });
  }

  const isCurrentPasswordValid = await verifyPassword(
    parsed.data.currentPassword,
    cashier.passwordHash
  );

  if (!isCurrentPasswordValid) {
    return Response.json({ error: "Password saat ini tidak sesuai" }, { status: 401 });
  }

  const updateData: {
    pin?: string;
    passwordHash?: string;
  } = {};

  if (parsed.data.newPin) {
    updateData.pin = parsed.data.newPin;
  }

  if (parsed.data.newPassword) {
    updateData.passwordHash = await hashPassword(parsed.data.newPassword);
  }

  await prisma.user.update({
    where: { id: cashier.id },
    data: updateData,
  });

  return Response.json({
    success: true,
    updated: {
      pin: Boolean(parsed.data.newPin),
      password: Boolean(parsed.data.newPassword),
    },
  });
}
