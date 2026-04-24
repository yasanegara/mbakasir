import { prisma } from "../src/lib/prisma";

async function checkPrismaProperties() {
  console.log("=== PRISMA PROPERTIES ===");
  const props = Object.keys(prisma);
  console.log(props.filter(p => !p.startsWith("_")).join(", "));
  
  console.log("\nChecking specific models:");
  console.log("posTerminal:", !!(prisma as any).posTerminal);
  console.log("productAssignment:", !!(prisma as any).productAssignment);
}

checkPrismaProperties()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
