
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const agent = await prisma.agent.findFirst({ where: { name: 'Pusat (SuperAdmin)' } });
  console.log(JSON.stringify(agent, null, 2));
}
main();
