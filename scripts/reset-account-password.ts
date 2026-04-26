import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

type Scope = "superadmin" | "agent" | "user" | "all";

function normalizeEmailAddress(email: string): string {
  return email.trim().toLowerCase();
}

function parseFlag(
  flags: string[],
  name: string
): string | undefined {
  const prefix = `${name}=`;
  const match = flags.find((flag) => flag.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

function printUsage(): void {
  console.log(`
Usage:
  npm run db:reset-password -- <email> <new-password> [--scope=superadmin|agent|user|all] [--tenant-id=<tenantId>]

Examples:
  npm run db:reset-password -- abyanpurnawan@gmail.com TempPass@2026!
  npm run db:reset-password -- abyanpurnawan@gmail.com TempPass@2026! --scope=user
  npm run db:reset-password -- kasir@example.com TempPass@2026! --scope=user --tenant-id=cm123
  `);
}

async function main() {
  const [emailArg, newPassword, ...flags] = process.argv.slice(2);

  if (!emailArg || !newPassword) {
    printUsage();
    process.exit(1);
  }

  const scope = (parseFlag(flags, "--scope") ?? "").toLowerCase() as Scope | "";
  const tenantId = parseFlag(flags, "--tenant-id");

  if (scope && !["superadmin", "agent", "user", "all"].includes(scope)) {
    console.error(`❌ Scope tidak valid: ${scope}`);
    printUsage();
    process.exit(1);
  }

  const email = normalizeEmailAddress(emailArg);
  const prisma = new PrismaClient();

  try {
    const [superAdmin, agent, users] = await Promise.all([
      prisma.superAdmin.findUnique({
        where: { email },
        select: { id: true, email: true, name: true },
      }),
      prisma.agent.findUnique({
        where: { email },
        select: { id: true, email: true, name: true, isActive: true },
      }),
      prisma.user.findMany({
        where: {
          email,
          ...(tenantId ? { tenantId } : {}),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tenantId: true,
          isActive: true,
          tenant: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [{ tenantId: "asc" }, { role: "asc" }],
      }),
    ]);

    const totalMatches =
      Number(Boolean(superAdmin)) + Number(Boolean(agent)) + users.length;

    if (totalMatches === 0) {
      console.error(`❌ Akun dengan email ${email} tidak ditemukan.`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const updatedTargets: string[] = [];

    const updateSuperAdmin = async () => {
      if (!superAdmin) {
        throw new Error(`Akun superadmin ${email} tidak ditemukan`);
      }
      await prisma.superAdmin.update({
        where: { id: superAdmin.id },
        data: { passwordHash },
      });
      updatedTargets.push(`SUPERADMIN ${superAdmin.email} (${superAdmin.name})`);
    };

    const updateAgent = async () => {
      if (!agent) {
        throw new Error(`Akun agent ${email} tidak ditemukan`);
      }
      await prisma.agent.update({
        where: { id: agent.id },
        data: { passwordHash },
      });
      updatedTargets.push(`AGENT ${agent.email} (${agent.name})`);
    };

    const updateUsers = async () => {
      if (users.length === 0) {
        throw new Error(
          tenantId
            ? `Akun user ${email} pada tenant ${tenantId} tidak ditemukan`
            : `Akun user ${email} tidak ditemukan`
        );
      }

      if (!scope && users.length > 1) {
        console.error("❌ Email ini dipakai oleh lebih dari satu user tenant.");
        console.error("Gunakan --scope=user --tenant-id=<tenantId> agar reset tidak ambigu.");
        console.table(
          users.map((user) => ({
            role: user.role,
            tenantId: user.tenantId,
            tenantName: user.tenant.name,
            name: user.name,
            isActive: user.isActive,
          }))
        );
        process.exit(1);
      }

      for (const user of users) {
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash },
        });
        updatedTargets.push(
          `USER ${user.email} (${user.role}) tenant=${user.tenantId} ${user.name}`
        );
      }
    };

    if (scope === "superadmin") {
      await updateSuperAdmin();
    } else if (scope === "agent") {
      await updateAgent();
    } else if (scope === "user") {
      await updateUsers();
    } else if (scope === "all") {
      if (superAdmin) await updateSuperAdmin();
      if (agent) await updateAgent();
      if (users.length > 0) await updateUsers();
    } else if (totalMatches === 1) {
      if (superAdmin) {
        await updateSuperAdmin();
      } else if (agent) {
        await updateAgent();
      } else {
        await updateUsers();
      }
    } else {
      console.error("❌ Email ini cocok ke lebih dari satu akun/role.");
      console.error("Pilih salah satu dengan --scope=superadmin|agent|user|all.");
      console.table([
        superAdmin
          ? {
              scope: "superadmin",
              id: superAdmin.id,
              name: superAdmin.name,
            }
          : null,
        agent
          ? {
              scope: "agent",
              id: agent.id,
              name: agent.name,
            }
          : null,
        ...users.map((user) => ({
          scope: "user",
          id: user.id,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantName: user.tenant.name,
        })),
      ].filter(Boolean));
      process.exit(1);
    }

    console.log("✅ Password berhasil direset untuk:");
    for (const target of updatedTargets) {
      console.log(`- ${target}`);
    }
    console.log("ℹ️ Password baru tidak ditampilkan ulang. Gunakan password yang Anda kirim saat menjalankan command.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Gagal reset password:", error);
  process.exit(1);
});
