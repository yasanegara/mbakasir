
import { PrismaClient, TokenLedgerType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const keepers = [
    { name: 'Hanif Al Mujahid', id: 'cmok658q9002yp501xzo2eqoo' },
    { name: 'Mujahida Ahmad ', id: 'cmoa48bo40001qc0pjrw3v7oe' }
  ];

  for (const keeper of keepers) {
    const agent = await prisma.agent.findUnique({
      where: { id: keeper.id },
      include: { tenants: true }
    });

    if (!agent) {
      console.log(`Agent ${keeper.name} not found.`);
      continue;
    }

    const calculatedUsed = agent.totalMinted - agent.tokenBalance;
    
    if (calculatedUsed <= 0) {
      console.log(`Agent ${keeper.name} has no used tokens to restore (Balance: ${agent.tokenBalance}, Minted: ${agent.totalMinted}).`);
      continue;
    }

    console.log(`Restoring ${calculatedUsed} tokens for ${keeper.name}...`);

    await prisma.$transaction(async (tx) => {
      // 1. Update Agent
      await tx.agent.update({
        where: { id: agent.id },
        data: { totalUsed: calculatedUsed }
      });

      // 2. Update Tenant (assuming first tenant used them all, as they only have one)
      if (agent.tenants.length > 0) {
        await tx.tenant.update({
          where: { id: agent.tenants[0].id },
          data: { tokenUsed: calculatedUsed }
        });
      }

      // 3. Create Ledger entry to balance
      await tx.tokenLedger.create({
        data: {
          agentId: agent.id,
          tenantId: agent.tenants[0]?.id,
          type: TokenLedgerType.ADJUST,
          amount: -calculatedUsed,
          balanceBefore: agent.totalMinted,
          balanceAfter: agent.tokenBalance,
          description: "Restored usage data after accidental cleanup (Adjustment)"
        }
      });
    });

    console.log(`Successfully restored ${keeper.name}.`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
