
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const packages = await prisma.agentPackage.findMany();
  console.log(JSON.stringify(packages, null, 2));
}
main();
