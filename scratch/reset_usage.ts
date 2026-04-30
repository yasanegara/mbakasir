
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const keepers = ['Hanif Mujahid', 'Mujahidah Ahmad'];
  
  const agentsToReset = await prisma.agent.findMany({
    where: {
      name: {
        notIn: keepers
      }
    },
    select: {
      id: true,
      name: true
    }
  });

  console.log(`Found ${agentsToReset.length} agents to reset.`);
  for (const agent of agentsToReset) {
    console.log(`- ${agent.name} (${agent.id})`);
  }

  const agentIds = agentsToReset.map(a => a.id);

  if (agentIds.length === 0) {
    console.log("No agents to reset.");
    return;
  }

  // 1. Reset Agent totalUsed
  const updatedAgents = await prisma.agent.updateMany({
    where: {
      id: { in: agentIds }
    },
    data: {
      totalUsed: 0
    }
  });
  console.log(`Updated ${updatedAgents.count} agents.`);

  // 2. Reset Tenant tokenUsed for these agents
  const updatedTenants = await prisma.tenant.updateMany({
    where: {
      agentId: { in: agentIds }
    },
    data: {
      tokenUsed: 0
    }
  });
  console.log(`Updated ${updatedTenants.count} tenants.`);

  // 3. Delete consumption ledger entries
  const deletedLedger = await prisma.tokenLedger.deleteMany({
    where: {
      agentId: { in: agentIds },
      type: {
        not: 'MINT'
      }
    }
  });
  console.log(`Deleted ${deletedLedger.count} ledger entries.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
