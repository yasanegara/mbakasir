
import { PrismaClient, AgentTokenPurchaseRequestStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get all active packages for reference
  const packages = await prisma.agentPackage.findMany({
    where: { isActive: true }
  });
  const packageMap = new Map(packages.map(p => [p.name, p.tokenAmount]));

  console.log('Package Reference:', JSON.stringify(Object.fromEntries(packageMap), null, 2));

  // 1. Specific adjustments requested by user
  const specifics = [
    { name: 'Ferdiyan Saputra ', id: 'cmoezjwcx0005pk0p548xcrmp', packageName: 'Entry Level' },
    { name: 'Muhammad Abyan', id: 'cmofu0wl40001lc0pol6dyalh', packageName: 'Tes Pasar' },
    { name: 'ANDI', id: 'cmoehz54m0001rs0p0ghvsdb4', packageName: 'Tes Pasar' }
  ];

  for (const s of specifics) {
    const tokens = packageMap.get(s.packageName) || 0;
    console.log(`Syncing ${s.name} to ${s.packageName} (${tokens} tokens)...`);
    
    await prisma.$transaction(async (tx) => {
      // Update Agent
      await tx.agent.update({
        where: { id: s.id },
        data: {
          tokenBalance: tokens,
          totalMinted: tokens,
          totalUsed: 0
        }
      });

      // Update/Re-verify Purchase Request
      await tx.agentTokenPurchaseRequest.updateMany({
        where: {
          agentId: s.id,
          status: AgentTokenPurchaseRequestStatus.COMPLETED
        },
        data: {
          packageName: s.packageName,
          tokenAmount: tokens
        }
      });
    });
  }

  // 2. Sync all other agents who have a completed request
  const otherAgents = await prisma.agent.findMany({
    where: {
      id: { notIn: specifics.map(s => s.id) },
      email: { notIn: ["agen.demo@mbakasir.id", "pusat@mbakasir.local"] }
    },
    include: {
      agentTokenPurchaseRequests: {
        where: { status: AgentTokenPurchaseRequestStatus.COMPLETED },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  for (const agent of otherAgents) {
    const lastRequest = agent.agentTokenPurchaseRequests[0];
    if (lastRequest) {
      const expectedTokens = packageMap.get(lastRequest.packageName);
      if (expectedTokens !== undefined && agent.totalMinted !== expectedTokens) {
        console.log(`Syncing ${agent.name} to its package ${lastRequest.packageName} (${expectedTokens} tokens)...`);
        await prisma.agent.update({
          where: { id: agent.id },
          data: {
            tokenBalance: expectedTokens,
            totalMinted: expectedTokens,
            totalUsed: 0
          }
        });
      }
    }
  }

  console.log('All agents synchronized with package definitions.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
