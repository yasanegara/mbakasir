
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const tenants = await prisma.tenant.findMany({
    where: { agentId: 'cmok658q9002yp501xzo2eqoo' }
  });
  console.log(JSON.stringify(tenants, null, 2));
}
main();
