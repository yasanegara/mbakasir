import { NextRequest, NextResponse } from "next/server";

// ============================================================
// BARCODE PRODUCT LOOKUP API
// Sumber data: Open Food Facts (gratis, tanpa API key)
// Fallback: UPC Item DB (trial, gratis untuk penggunaan rendah)
// ============================================================

export async function GET(req: NextRequest) {
  const barcode = req.nextUrl.searchParams.get("barcode");

  if (!barcode) {
    return NextResponse.json({ error: "Barcode tidak disertakan" }, { status: 400 });
  }

  // ─── 1. Coba Open Food Facts (sangat baik untuk produk makanan/minuman) ───
  try {
    const offRes = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,product_name_id,categories_tags,image_front_url,brands,quantity,serving_size`,
      {
        headers: { "User-Agent": "MbaKasir/1.0 (contact@mbakasir.id)" },
        next: { revalidate: 86400 }, // Cache 24 jam
      }
    );

    if (offRes.ok) {
      const offData = await offRes.json();
      if (offData.status === 1 && offData.product) {
        const p = offData.product;

        const rawCategories: string[] = p.categories_tags || [];
        // Ambil kategori bahasa Indonesia dulu, fallback ke Inggris
        const categoryRaw =
          rawCategories.find((c: string) => c.startsWith("id:")) ||
          rawCategories.find((c: string) => c.startsWith("en:")) ||
          "";
        const category = categoryRaw
          .replace(/^(id:|en:)/, "")
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l: string) => l.toUpperCase()) || "";

        const name =
          p.product_name_id ||
          p.product_name ||
          "";

        return NextResponse.json({
          found: true,
          source: "openfoodfacts",
          sku: barcode,
          name: name.trim(),
          category: category.trim(),
          brand: p.brands || "",
          imageUrl: p.image_front_url || "",
          quantity: p.quantity || "",
        });
      }
    }
  } catch (e) {
    console.warn("Open Food Facts lookup failed:", e);
  }

  // ─── 2. Fallback: UPC Item DB (trial tanpa key, limit 100 req/hari) ───
  try {
    const upcRes = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
      { next: { revalidate: 86400 } }
    );

    if (upcRes.ok) {
      const upcData = await upcRes.json();
      const item = upcData?.items?.[0];
      if (item) {
        return NextResponse.json({
          found: true,
          source: "upcitemdb",
          sku: barcode,
          name: item.title || "",
          category: item.category || "",
          brand: item.brand || "",
          imageUrl: item.images?.[0] || "",
          quantity: "",
        });
      }
    }
  } catch (e) {
    console.warn("UPC Item DB lookup failed:", e);
  }

  // ─── 3. Tidak ditemukan di manapun — tetap kembalikan SKU saja ───
  return NextResponse.json({
    found: false,
    source: null,
    sku: barcode,
    name: "",
    category: "",
    brand: "",
    imageUrl: "",
    quantity: "",
  });
}
