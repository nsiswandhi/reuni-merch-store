import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@invnity.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
    },
  });

  await prisma.adminSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      bankName: "Bank BCA",
      bankAccountNumber: "0000000000",
      bankAccountName: "Panitia Reuni Akbar InVnity",
      shippingFlatRate: 20000,
      adminNotificationEmail: adminEmail,
    },
  });

  console.log(`Seeded admin: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
