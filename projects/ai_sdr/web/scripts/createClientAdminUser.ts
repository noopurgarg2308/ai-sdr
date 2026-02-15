/**
 * Create a client admin user.
 * Usage: npx tsx scripts/createClientAdminUser.ts <email> <password> <companyId>
 *
 * Company IDs can be found via: npx prisma studio or npx tsx scripts/listCompanies.ts
 */
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { hash } from "bcryptjs";

async function main() {
  const [email, password, companyId] = process.argv.slice(2);
  if (!email || !password || !companyId) {
    console.error("Usage: npx tsx scripts/createClientAdminUser.ts <email> <password> <companyId>");
    process.exit(1);
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });
  if (!company) {
    console.error(`Company ${companyId} not found`);
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existing) {
    console.error(`User ${email} already exists`);
    process.exit(1);
  }

  const passwordHash = await hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      companyId,
    },
    include: { company: true },
  });

  console.log(`Created user ${user.email} for company ${user.company.displayName} (${user.company.slug})`);
  console.log(`Login at: /client-admin/login`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
