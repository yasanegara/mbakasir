
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const agents = await prisma.agent.findMany({
    where: { name: { contains: 'Muhammad Abyan' } }
  });
  console.log(JSON.stringify(agents, null, 2));
}
main();
