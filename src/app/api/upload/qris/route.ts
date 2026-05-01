import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { randomBytes } from "crypto";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPERADMIN" && session.role !== "AGENT")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "File wajib disertakan" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return Response.json({ error: "Hanya file gambar yang diizinkan" }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return Response.json({ error: "Ukuran file maksimal 5MB" }, { status: 400 });
    }

    const ext = extname(file.name) || ".png";
    const uniqueName = `qris-${randomBytes(12).toString("hex")}${ext}`;

    const uploadDir = join(process.cwd(), "storage", "uploads", "qris");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = join(uploadDir, uniqueName);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/qris/${uniqueName}`;

    return Response.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error("QRIS Upload Error:", err);
    return Response.json({ error: "Upload QRIS gagal" }, { status: 500 });
  }
}
