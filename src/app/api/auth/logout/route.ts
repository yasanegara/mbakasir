import { clearSession } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  await clearSession();
  return Response.json({ success: true });
}
