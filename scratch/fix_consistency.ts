
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const agents = await prisma.agent.findMany();
  
  for (const agent of agents) {
    const newTotalMinted = agent.tokenBalance + agent.totalUsed;
    if (agent.totalMinted !== newTotalMinted) {
      console.log(`Adjusting ${agent.name}: totalMinted ${agent.totalMinted} -> ${newTotalMinted}`);
      await prisma.agent.update({
        where: { id: agent.id },
        data: { totalMinted: newTotalMinted }
      });
    }
  }
  console.log('Consistency check complete.');
}
main();
