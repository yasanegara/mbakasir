
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const ledger = await prisma.tokenLedger.findMany({
    where: { type: { in: ['ACTIVATE', 'POS_ADD'] } }
  });
  console.log(JSON.stringify(ledger, null, 2));
}
main();
