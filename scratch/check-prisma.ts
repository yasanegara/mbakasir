import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const fields = Object.keys((prisma as any).learnDocument.fields || {});
  console.log("Fields in LearnDocument:", fields);
  await prisma.$disconnect();
}

main();
