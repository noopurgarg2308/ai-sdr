/**
 * List all client admin users (for debugging login issues).
 * Usage: npx tsx scripts/listClientAdminUsers.ts
 */
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    const users = await prisma.user.findMany({
      include: { company: { select: { displayName: true, slug: true } } },
    });
    if (users.length === 0) {
      console.log("No users found. Create one with:");
      console.log("  npx tsx scripts/createClientAdminUser.ts <email> <password> <companyId>");
      console.log("\nGet company IDs with: npx tsx scripts/listCompanies.ts");
      return;
    }
    console.log(`Found ${users.length} user(s):\n`);
    users.forEach((u) => {
      console.log(`  ${u.email} → ${u.company.displayName} (${u.company.slug})`);
    });
  } catch (e: any) {
    if (e.code === "P42" || e.message?.includes("does not exist")) {
      console.log("User table may not exist. Run: npx prisma migrate dev");
    } else {
      console.error(e);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
