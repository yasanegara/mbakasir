import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const link = await prisma.agentRegistrationLink.findUnique({
    where: { token: "leader" },
  });
  console.log("LINK DATA:", link);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
