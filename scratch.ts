import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const terminals = await prisma.posTerminal.findMany({
    where: { isDefault: false },
    include: { tenant: { include: { agent: true } } }
  })
  console.log("Terminals to reset:", terminals.map(t => ({ id: t.id, name: t.name, tenantId: t.tenantId, agentBalance: t.tenant.agent.tokenBalance })))
}
main()
