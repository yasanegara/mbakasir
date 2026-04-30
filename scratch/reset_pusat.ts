
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.agent.update({
    where: { email: 'pusat@mbakasir.local' },
    data: { tokenBalance: 0 }
  });
  console.log('Pusat (SuperAdmin) balance reset to 0.');
}
main();
