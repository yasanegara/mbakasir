import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // @ts-expect-error
    const packages = await prisma.agentPackage.findMany({
      orderBy: { price: "asc" },
    });
    return Response.json({ packages });
  } catch (err) {
    return Response.json({ error: "Gagal memuat paket agen" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return Response.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const data = await req.json();
    
    // @ts-expect-error
    const pkg = await prisma.agentPackage.create({
      data: {
        name: data.name,
        tokenAmount: data.tokenAmount,
        price: data.price,
        description: data.description || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    return Response.json({ success: true, package: pkg });
  } catch (err: any) {
    console.error("Agent package creation error:", err);
    return Response.json({ error: "Gagal membuat paket agen: " + (err.message || String(err)) }, { status: 500 });
  }
}
