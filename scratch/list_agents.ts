
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const agents = await prisma.agent.findMany({ select: { name: true, tokenBalance: true, totalMinted: true, totalUsed: true } });
  console.log(JSON.stringify(agents, null, 2));
}
main();
