
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const requests = await prisma.agentTokenPurchaseRequest.findMany({
    where: { status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { agentId: true, packageName: true }
  });
  console.log(JSON.stringify(requests, null, 2));
}
main();
