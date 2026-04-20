import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getBrandConfig, upsertBrandConfig } from "@/lib/brand-config";
import { z } from "zod";

// Menerima URL absolut (https://...) atau path relatif (/uploads/...) dari internal upload
const isValidUrl = (val: string) => {
  if (!val) return true;
  if (val.startsWith("/")) return true; // path relatif dari /api/admin/brand-upload
  try {
    new URL(val);
    return true;
  } catch {
    return false;
  }
};

const brandConfigSchema = z.object({
  appName: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(200).optional().or(z.literal("")),
  metaDescription: z.string().trim().max(500).optional().or(z.literal("")),
  logoUrl: z
    .string()
    .trim()
    .refine(isValidUrl, "URL logo tidak valid")
    .optional()
    .or(z.literal("")),
  faviconUrl: z
    .string()
    .trim()
    .refine(isValidUrl, "URL favicon tidak valid")
    .optional()
    .or(z.literal("")),
  primaryColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Format warna harus #RRGGBB").optional(),
  supportPhone: z.string().trim().max(20).optional().or(z.literal("")),
  supportMessage: z.string().trim().max(300).optional().or(z.literal("")),
});

async function requireSuperAdmin() {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") return null;
  return session;
}

export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) return Response.json({ error: "Akses ditolak" }, { status: 403 });

  const config = await getBrandConfig();
  return Response.json({ config });
}

export async function POST(req: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) return Response.json({ error: "Akses ditolak" }, { status: 403 });

  try {
    const body = await req.json();
    const parsed = brandConfigSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message || "Data tidak valid" },
        { status: 400 }
      );
    }

    const config = await upsertBrandConfig({
      appName: parsed.data.appName,
      tagline: parsed.data.tagline || null,
      metaDescription: parsed.data.metaDescription || null,
      logoUrl: parsed.data.logoUrl || null,
      faviconUrl: parsed.data.faviconUrl || null,
      primaryColor: parsed.data.primaryColor,
      supportPhone: parsed.data.supportPhone || null,
      supportMessage: parsed.data.supportMessage || null,
    });

    return Response.json({ success: true, config });
  } catch (err) {
    console.error("Brand Config Save Error:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
