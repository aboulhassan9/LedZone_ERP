import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SYSTEM_ROLES = ["Super Admin", "Admin", "Manager", "Employee"] as const;

// Which permission keys each system role starts with. Users can regrant/revoke later
// through the Roles admin page — this is only the initial, sane default.
const ROLE_PERMISSION_KEYS: Record<(typeof SYSTEM_ROLES)[number], string[] | "*"> = {
  "Super Admin": "*",
  Admin: [
    "users.manage",
    "audit.view",
    "company.manage",
    "currency.manage",
    "exchange_rates.manage",
    "notifications.manage",
  ],
  Manager: ["audit.view"],
  Employee: [],
};

async function main() {
  const allPermissions = await prisma.permission.findMany();

  for (const roleName of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, isSystem: true, description: `System role: ${roleName}` },
    });

    const keys = ROLE_PERMISSION_KEYS[roleName];
    const permissions =
      keys === "*" ? allPermissions : allPermissions.filter((p) => keys.includes(p.key));

    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
