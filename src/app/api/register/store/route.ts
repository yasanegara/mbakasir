import { NextRequest } from "next/server";
import { z } from "zod";
import {
  hashPassword,
  normalizeEmailAddress,
} from "@/lib/auth";
import { findExistingLoginIdentity } from "@/lib/auth-identity";
import { getDefaultPosName, formatPosCode } from "@/lib/pos-terminals";
import { prisma } from "@/lib/prisma";
import {
  isStoreRegistrationToken,
  normalizeStoreRegistrationToken,
} from "@/lib/store-registration-shared";
import { sendTelegramNotification } from "@/lib/notifications";

const registerStoreSchema = z.object({
  token: z
    .string()
    .trim()
    .min(1, "Link pendaftaran toko tidak valid")
    .transform(normalizeStoreRegistrationToken)
    .refine(isStoreRegistrationToken, "Link pendaftaran toko tidak valid"),
  storeName: z.string().trim().min(2, "Nama toko minimal 2 karakter").max(120),
  businessType: z.string().trim().max(80).optional().or(z.literal("")),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  ownerName: z.string().trim().min(2, "Nama owner minimal 2 karakter").max(120),
  ownerEmail: z.string().trim().email("Email owner tidak valid"),
  ownerPhone: z.string().trim().max(40).optional().or(z.literal("")),
  ownerPassword: z
    .string()
    .min(8, "Password owner minimal 8 karakter")
    .max(72, "Password owner terlalu panjang"),
  nik: z.string().optional().or(z.literal("")),
  termsAccepted: z.boolean().refine(val => val === true, "Anda harus menyetujui Syarat dan Ketentuan"),
});

function isExpectedRegistrationError(message: string) {
  return [
    "Link pendaftaran toko tidak valid atau sudah dinonaktifkan.",
    "Akun agen penanggung jawab sedang nonaktif.",
  ].includes(message);
}

export async function POST(req: NextRequest) {
  try {
    const parsed = registerStoreSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message || "Data pendaftaran toko tidak valid" },
        { status: 400 }
      );
    }

    const ownerEmail = normalizeEmailAddress(parsed.data.ownerEmail);
    const existingIdentity = await findExistingLoginIdentity(prisma, ownerEmail);

    if (existingIdentity) {
      return Response.json(
        { error: "Email owner sudah dipakai akun lain untuk login." },
        { status: 409 }
      );
    }

    const ownerPasswordHash = await hashPassword(parsed.data.ownerPassword);

    const result = await prisma.$transaction(async (tx) => {
      const registrationLink = await tx.storeRegistrationLink.findUnique({
        where: {
          token: parsed.data.token,
        },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              isActive: true,
              telegramChatId: true,
              notificationPrefs: true,
            },
          },
        },
      });

      if (!registrationLink || !registrationLink.isActive) {
        throw new Error("Link pendaftaran toko tidak valid atau sudah dinonaktifkan.");
      }

      if (!registrationLink.agent.isActive) {
        throw new Error("Akun agen penanggung jawab sedang nonaktif.");
      }

      const tenant = await tx.tenant.create({
        data: {
          agentId: registrationLink.agentId,
          registrationLinkId: registrationLink.id,
          name: parsed.data.storeName.trim(),
          businessType: parsed.data.businessType?.trim() || null,
          address: parsed.data.address?.trim() || null,
          phone: parsed.data.phone?.trim() || null,
          nik: parsed.data.nik?.trim() || null,
          status: "LOCKED",
        },
      });

      const owner = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: parsed.data.ownerName.trim(),
          email: ownerEmail,
          phone: parsed.data.ownerPhone?.trim() || null,
          passwordHash: ownerPasswordHash,
          role: "TENANT",
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      await tx.posTerminal.create({
        data: {
          tenantId: tenant.id,
          name: getDefaultPosName(1),
          code: formatPosCode(1),
          isDefault: true,
          isActive: true,
          tokenCost: 0,
        },
      });

      await tx.storeRegistrationLink.update({
        where: {
          id: registrationLink.id,
        },
        data: {
          useCount: {
            increment: 1,
          },
          lastUsedAt: new Date(),
        },
      });

      return {
        tenantName: tenant.name,
        ownerEmail: owner.email,
        ownerName: owner.name,
        agentName: registrationLink.agent.name,
        agentTelegramChatId: registrationLink.agent.telegramChatId,
        agentNotificationPrefs: registrationLink.agent.notificationPrefs,
      };
    });

    if (result.agentTelegramChatId) {
      const prefs = result.agentNotificationPrefs as any;
      const shouldNotify = !prefs || prefs.notifyNewStoreRegistration !== false;

      if (shouldNotify) {
        const message = `<b>🔔 Pendaftaran Toko Baru!</b>\n\n` +
          `Toko: <b>${result.tenantName}</b>\n` +
          `Owner: ${result.ownerName}\n` +
          `Email: ${result.ownerEmail}\n\n` +
          `<i>Silakan cek dashboard agen Anda untuk aktivasi.</i>`;
        
        void sendTelegramNotification(result.agentTelegramChatId, message);
      }
    }

    return Response.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Register Store Error:", error);

    if (error instanceof Error && isExpectedRegistrationError(error.message)) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
