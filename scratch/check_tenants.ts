
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const keepers = ['Hanif Al Mujahid', 'Mujahida Ahmad '];
  const agents = await prisma.agent.findMany({
    where: { name: { in: keepers } },
    include: { tenants: true }
  });
  console.log(JSON.stringify(agents, null, 2));
}
main();
