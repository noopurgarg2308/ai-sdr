/**
 * Verify a client admin user's password.
 * Usage: npx tsx scripts/verifyClientAdminPassword.ts <email> <password>
 *
 * Use this to debug login issues - confirms whether the password matches the stored hash.
 */
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { compare } from "bcryptjs";

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: npx tsx scripts/verifyClientAdminPassword.ts <email> <password>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { company: true },
  });

  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  console.log(`Found user: ${user.email} (company: ${user.company.displayName})`);
  const valid = await compare(password, user.passwordHash);
  console.log(valid ? "✓ Password is CORRECT" : "✗ Password is WRONG");
  if (!valid) {
    console.log("\nTroubleshooting:");
    console.log("  1. Re-create the user from /admin/companies (Create Client Admin User form)");
    console.log("  2. Use a simple password without special chars to rule out encoding issues");
    console.log("  3. Avoid copy-paste; type the password manually");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
