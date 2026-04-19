import { getSession } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getSession();
  
  if (!session) {
    return Response.json({ user: null }, { status: 401 });
  }

  return Response.json({ user: session });
}
