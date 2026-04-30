
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const agent = await prisma.agent.findFirst({
    where: { name: { contains: 'Hanif' } },
    include: {
      agentTokenPurchaseRequests: {
        where: { status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });
  console.log(JSON.stringify(agent, null, 2));
}
main();
