import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { randomBytes } from "crypto";

const ALLOWED_TYPES: Record<string, string[]> = {
  logo: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
  favicon: ["image/png", "image/x-icon", "image/vnd.microsoft.icon", "image/svg+xml", "image/jpeg"],
};

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null; // "logo" | "favicon"

    if (!file || !type) {
      return Response.json({ error: "File dan tipe wajib disertakan" }, { status: 400 });
    }

    if (!["logo", "favicon"].includes(type)) {
      return Response.json({ error: "Tipe tidak valid" }, { status: 400 });
    }

    const allowedMimes = ALLOWED_TYPES[type];
    if (!allowedMimes.includes(file.type)) {
      return Response.json(
        { error: `Format file tidak didukung. Gunakan: ${allowedMimes.join(", ")}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return Response.json({ error: "Ukuran file maksimal 2MB" }, { status: 400 });
    }

    const ext = extname(file.name) || (file.type === "image/svg+xml" ? ".svg" : ".png");
    const uniqueName = `${type}-${randomBytes(8).toString("hex")}${ext}`;

    const uploadDir = join(process.cwd(), "storage", "uploads", "brand");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = join(uploadDir, uniqueName);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/brand/${uniqueName}`;

    return Response.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error("Brand Upload Error:", err);
    return Response.json({ error: "Upload gagal. Coba lagi." }, { status: 500 });
  }
}
