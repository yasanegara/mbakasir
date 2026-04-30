
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const keepers = ['cmok658q9002yp501xzo2eqoo', 'cmoa48bo40001qc0pjrw3v7oe'];
  const deleted = await prisma.agentTokenPurchaseRequest.deleteMany({
    where: {
      status: 'COMPLETED',
      agentId: { notIn: keepers }
    }
  });
  console.log(`Deleted ${deleted.count} completed purchase requests.`);
}
main();
