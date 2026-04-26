import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorefrontConfigDelegate, getOnlineOrderDelegate } from "@/lib/prisma";
import { z } from "zod";
import { sendTelegramNotification } from "@/lib/notifications";

const checkoutSchema = z.object({
  slug: z.string(),
  customerName: z.string().min(2),
  customerPhone: z.string().min(8),
  customerAddress: z.string().min(5),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1),
  })).min(1),
});

// GET: ambil data storefront publik berdasarkan slug
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (!slug) return Response.json({ error: "Slug tidak valid" }, { status: 400 });

  const storefront = await getStorefrontConfigDelegate(prisma).findUnique({
    where: { slug, isActive: true },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          products: {
            where: { isActive: true, showInPos: true },
            select: {
              id: true,
              name: true,
              price: true,
              imageUrl: true,
              category: true,
              stock: true,
              unit: true,
            },
            orderBy: [{ category: "asc" }, { name: "asc" }],
          },
        },
      },
    },
  });

  if (!storefront) {
    return Response.json({ error: "Toko tidak ditemukan atau tidak aktif" }, { status: 404 });
  }

  return Response.json({ storefront });
}

// POST: buat pesanan baru
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const parsed = checkoutSchema.parse(data);

    const storefront = await getStorefrontConfigDelegate(prisma).findUnique({
      where: { slug: parsed.slug, isActive: true },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            agent: { select: { telegramChatId: true, notificationPrefs: true } },
          },
        },
      },
    });

    if (!storefront) {
      return Response.json({ error: "Toko tidak ditemukan atau tidak aktif" }, { status: 404 });
    }

    // Ambil harga produk yang dipesan
    const productIds = parsed.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, tenantId: storefront.tenantId, isActive: true },
      select: { id: true, name: true, price: true, stock: true },
    });

    if (products.length !== productIds.length) {
      return Response.json({ error: "Beberapa produk tidak tersedia" }, { status: 400 });
    }

    // Hitung subtotal
    let subtotal = 0;
    const orderItems = parsed.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const itemSubtotal = Number(product.price) * item.quantity;
      subtotal += itemSubtotal;
      return {
        productId: item.productId,
        productName: product.name,
        price: Number(product.price),
        quantity: item.quantity,
        subtotal: itemSubtotal,
      };
    });

    const shippingCost = storefront.allowShipping ? Number(storefront.shippingCost) : 0;
    const totalAmount = subtotal + shippingCost;

    // Buat pesanan
    const order = await getOnlineOrderDelegate(prisma).create({
      data: {
        tenantId: storefront.tenantId,
        storefrontId: storefront.id,
        customerName: parsed.customerName,
        customerPhone: parsed.customerPhone,
        customerAddress: parsed.customerAddress,
        notes: parsed.notes || null,
        shippingCost,
        subtotal,
        totalAmount,
        status: "PENDING",
        items: { create: orderItems },
      },
      include: { items: true },
    });

    // Notifikasi Telegram ke Agen (opsional)
    const agent = storefront.tenant.agent;
    if (agent?.telegramChatId) {
      const prefs = agent.notificationPrefs as any;
      if (!prefs || prefs.notifyTokenPurchase !== false) {
        const msg = `🛍️ <b>Pesanan Online Baru!</b>\n\n` +
          `Toko: <b>${storefront.tenant.name}</b>\n` +
          `Pelanggan: ${parsed.customerName} (${parsed.customerPhone})\n` +
          `Total: Rp ${totalAmount.toLocaleString("id-ID")}\n` +
          `Alamat: ${parsed.customerAddress}\n\n` +
          `<i>Silakan cek dashboard toko untuk konfirmasi.</i>`;
        void sendTelegramNotification(agent.telegramChatId, msg);
      }
    }

    return Response.json({ success: true, orderId: order.id });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return Response.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("Checkout error:", err);
    return Response.json({ error: "Gagal membuat pesanan" }, { status: 500 });
  }
}

// PATCH: update bukti transfer untuk pesanan yang sudah ada
export async function PATCH(req: NextRequest) {
  try {
    const { orderId, paymentProofUrl, slug } = await req.json();

    if (!orderId || !paymentProofUrl || !slug) {
      return Response.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Verifikasi order milik storefront yang benar
    const storefront = await getStorefrontConfigDelegate(prisma).findUnique({
      where: { slug, isActive: true },
    });

    if (!storefront) {
      return Response.json({ error: "Toko tidak ditemukan" }, { status: 404 });
    }

    const order = await getOnlineOrderDelegate(prisma).update({
      where: { id: orderId, storefrontId: storefront.id },
      data: { paymentProofUrl },
    });

    return Response.json({ success: true, order });
  } catch (err) {
    console.error("Proof update error:", err);
    return Response.json({ error: "Gagal memperbarui bukti pembayaran" }, { status: 500 });
  }
}
