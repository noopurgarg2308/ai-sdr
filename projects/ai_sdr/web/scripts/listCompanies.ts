/**
 * List all companies in the database
 * 
 * Usage:
 *   npx tsx scripts/listCompanies.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("📋 Listing all companies...\n");

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      displayName: true,
      shortDescription: true,
      websiteUrl: true,
      createdAt: true,
    },
  });

  if (companies.length === 0) {
    console.log("❌ No companies found in database.");
    console.log("\n💡 Create a company first:");
    console.log("   1. Visit http://localhost:3000/admin/companies");
    console.log("   2. Or use the Admin API: POST /api/admin/companies");
    process.exit(0);
  }

  console.log(`Found ${companies.length} company(ies):\n`);

  companies.forEach((company, index) => {
    console.log(`${index + 1}. ${company.displayName}`);
    console.log(`   ID: ${company.id}`);
    console.log(`   Slug: ${company.slug}`);
    if (company.shortDescription) {
      console.log(`   Description: ${company.shortDescription}`);
    }
    if (company.websiteUrl) {
      console.log(`   Website: ${company.websiteUrl}`);
    }
    console.log(`   Created: ${company.createdAt.toISOString()}`);
    console.log("");
  });

  console.log("💡 To create a website source, use:");
  console.log(`   npx tsx scripts/createWebsiteSource.ts --companyId=<ID> --url=<website-url>`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
