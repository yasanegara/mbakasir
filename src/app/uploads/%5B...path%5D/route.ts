import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const pathParts = resolvedParams.path;
  
  // Konstruksi path file (di luar folder public agar lebih aman dan terhindar dari konflik static serving)
  const filePath = join(process.cwd(), "storage", "uploads", ...pathParts);

  if (!existsSync(filePath)) {
    return new Response("File not found", { status: 404 });
  }

  try {
    const fileBuffer = await readFile(filePath);
    
    // Tentukan content type sederhana
    let contentType = "application/octet-stream";
    const ext = pathParts[pathParts.length - 1].toLowerCase();
    if (ext.endsWith(".png")) contentType = "image/png";
    else if (ext.endsWith(".jpg") || ext.endsWith(".jpeg")) contentType = "image/jpeg";
    else if (ext.endsWith(".webp")) contentType = "image/webp";
    else if (ext.endsWith(".svg")) contentType = "image/svg+xml";

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return new Response("Error reading file", { status: 500 });
  }
}
