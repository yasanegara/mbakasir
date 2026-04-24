import { prisma } from "../src/lib/prisma";

async function debugTerminals() {
  console.log("=== DEBUG TERMINALS & ASSIGNMENTS ===");
  
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true }
  });

  for (const t of tenants) {
    console.log(`\nTenant: ${t.name} (${t.id})`);
    
    const terminals = await prisma.posTerminal.findMany({
      where: { tenantId: t.id }
    });

    for (const pt of terminals) {
      console.log(`  - POS: ${pt.name} [${pt.code}] (Target: ${pt.targetRevenue})`);
      const assignments = await prisma.productAssignment.count({
        where: { terminalId: pt.id }
      });
      console.log(`    Assignments: ${assignments} products`);
    }
  }
}

debugTerminals()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
