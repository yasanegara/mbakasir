
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const agents = await prisma.agent.findMany({
    where: {
      OR: [
        { name: { contains: 'rezha', mode: 'insensitive' } },
        { email: { contains: 'rezha', mode: 'insensitive' } }
      ]
    }
  });
  console.log(JSON.stringify(agents, null, 2));
}
main();
