import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const storefrontSchema = z.object({
  description: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNo: z.string().optional(),
  bankAccountName: z.string().optional(),
  allowShipping: z.boolean().optional(),
  shippingCost: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, "Hanya huruf kecil, angka, dan tanda hubung").optional(),
});

// GET: ambil data storefront milik tenant
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "TENANT" || !session.tenantId) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const storefront = await prisma.storefrontConfig.findUnique({
    where: { tenantId: session.tenantId },
  });

  return Response.json({ storefront });
}

// POST: update/buat pengaturan storefront
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "TENANT" || !session.tenantId) {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const data = await req.json();
    const parsed = storefrontSchema.parse(data);

    // Cek storefront sudah ada
    const existing = await prisma.storefrontConfig.findUnique({
      where: { tenantId: session.tenantId },
    });

    if (!existing) {
      return Response.json({ error: "Storefront belum diaktifkan. Hubungi agen Anda." }, { status: 403 });
    }

    // Cek slug unik jika diubah
    if (parsed.slug && parsed.slug !== existing.slug) {
      const slugTaken = await prisma.storefrontConfig.findUnique({ where: { slug: parsed.slug } });
      if (slugTaken) {
        return Response.json({ error: "URL toko sudah digunakan, coba yang lain." }, { status: 400 });
      }
    }

    const updated = await prisma.storefrontConfig.update({
      where: { tenantId: session.tenantId },
      data: {
        ...(parsed.description !== undefined && { description: parsed.description }),
        ...(parsed.bankName !== undefined && { bankName: parsed.bankName }),
        ...(parsed.bankAccountNo !== undefined && { bankAccountNo: parsed.bankAccountNo }),
        ...(parsed.bankAccountName !== undefined && { bankAccountName: parsed.bankAccountName }),
        ...(parsed.allowShipping !== undefined && { allowShipping: parsed.allowShipping }),
        ...(parsed.shippingCost !== undefined && { shippingCost: parsed.shippingCost }),
        ...(parsed.isActive !== undefined && { isActive: parsed.isActive }),
        ...(parsed.slug !== undefined && { slug: parsed.slug }),
      },
    });

    revalidatePath("/settings");
    revalidatePath(`/store/${updated.slug}`);

    return Response.json({ success: true, storefront: updated });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return Response.json({ error: err.errors[0].message }, { status: 400 });
    }
    return Response.json({ error: "Gagal menyimpan pengaturan" }, { status: 500 });
  }
}
