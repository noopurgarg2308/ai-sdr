/**
 * Example script: Create a website source and trigger a crawl
 * 
 * Usage:
 *   npx tsx scripts/createWebsiteSource.ts --companyId=<id> --url=<website-url>
 * 
 * Example:
 *   npx tsx scripts/createWebsiteSource.ts --companyId=cmj52tf810000w3lw1rvkkieh --url=https://example.com
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { addMediaAsset } from "../src/lib/media";
import { queueMediaProcessing } from "../src/lib/queue";

async function main() {
  const args = process.argv.slice(2);
  const companyId = args.find(arg => arg.startsWith("--companyId="))?.split("=")[1];
  const url = args.find(arg => arg.startsWith("--url="))?.split("=")[1];
  const maxPages = args.find(arg => arg.startsWith("--maxPages="))?.split("=")[1];
  const maxDepth = args.find(arg => arg.startsWith("--maxDepth="))?.split("=")[1];
  const includeImages = args.find(arg => arg.startsWith("--includeImages="))?.split("=")[1] !== "false";

  if (!companyId || !url) {
    console.error("Usage: npx tsx scripts/createWebsiteSource.ts --companyId=<id> --url=<website-url> [--maxPages=50] [--maxDepth=3] [--includeImages=true]");
    process.exit(1);
  }

  // Validate company exists
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    console.error(`Company not found: ${companyId}`);
    process.exit(1);
  }

  console.log(`Creating website source for company: ${company.displayName}`);
  console.log(`URL: ${url}`);

  // Create website media asset
  const websiteAsset = await addMediaAsset({
    companyId,
    type: "website",
    url,
    title: `Website: ${new URL(url).hostname}`,
    description: `Website source for ${company.displayName}`,
    metadata: {
      maxPages: maxPages ? Number(maxPages) : 50,
      maxDepth: maxDepth ? Number(maxDepth) : 3,
      includeImages,
      createdAt: new Date().toISOString(),
    },
  });

  console.log(`✅ Created website source: ${websiteAsset.id}`);

  // Queue crawl job
  const jobId = await queueMediaProcessing(
    websiteAsset.id,
    companyId,
    "website",
    {
      maxPages: maxPages ? Number(maxPages) : undefined,
      maxDepth: maxDepth ? Number(maxDepth) : undefined,
      includeImages,
    }
  );

  console.log(`✅ Queued crawl job: ${jobId}`);
  console.log(`\nTo check status, use:`);
  console.log(`  GET /api/admin/companies/${companyId}/websites/${websiteAsset.id}/crawl`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
