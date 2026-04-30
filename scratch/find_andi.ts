
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const agent = await prisma.agent.findFirst({ where: { name: 'ANDI' } });
  console.log(JSON.stringify(agent, null, 2));
}
main();
