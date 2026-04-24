import { prisma } from "@/lib/prisma";

export async function GET() {
  const props = Object.keys(prisma).filter(p => !p.startsWith("_"));
  return Response.json({
    props,
    hasPosTerminal: !!(prisma as any).posTerminal,
    hasProductAssignment: !!(prisma as any).productAssignment,
    prismaVersion: (globalThis as any).prismaVersion
  });
}
