import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Updating Koin to Token in database...");
  
  // 1. Update TokenConversion targetLabel, rewardUnit, and description
  const conversions = await prisma.tokenConversion.findMany();
  
  for (const conv of conversions) {
    const newLabel = conv.targetLabel.replace(/Koin/g, "Token").replace(/koin/g, "token");
    const newUnit = conv.rewardUnit.replace(/Koin/g, "Token").replace(/koin/g, "token");
    const newDesc = conv.description ? conv.description.replace(/Koin/g, "Token").replace(/koin/g, "token") : conv.description;
    
    if (newLabel !== conv.targetLabel || newUnit !== conv.rewardUnit || newDesc !== conv.description) {
      console.log(`Updating conversion: ${conv.targetKey} -> ${newLabel}`);
      await prisma.tokenConversion.update({
        where: { id: conv.id },
        data: {
          targetLabel: newLabel,
          rewardUnit: newUnit,
          description: newDesc
        }
      });
    }
  }

  // 2. Update TokenConfig tokenName
  await (prisma as any).tokenConfig.updateMany({
    where: { tokenName: { contains: "Koin" } },
    data: { tokenName: "SuperToken" }
  });

  console.log("Done!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
