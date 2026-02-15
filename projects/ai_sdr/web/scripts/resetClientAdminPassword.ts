/**
 * Reset a client admin user's password.
 * Usage: npx tsx scripts/resetClientAdminPassword.ts <email> <newPassword>
 *
 * Use this when you need to set a new password for an existing user (e.g. after a login issue).
 */
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { hash } from "bcryptjs";

async function main() {
  const [email, newPassword] = process.argv.slice(2);
  if (!email || !newPassword) {
    console.error("Usage: npx tsx scripts/resetClientAdminPassword.ts <email> <newPassword>");
    process.exit(1);
  }

  const emailNormalized = email.trim().toLowerCase();
  const passwordTrimmed = newPassword.trim();

  if (!passwordTrimmed) {
    console.error("Password cannot be empty");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email: emailNormalized },
    include: { company: true },
  });

  if (!user) {
    console.error(`User not found: ${emailNormalized}`);
    process.exit(1);
  }

  const passwordHash = await hash(passwordTrimmed, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  console.log(`Password reset for ${user.email} (${user.company.displayName})`);
  console.log("They can now log in at /client-admin/login with the new password.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
