import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { prisma } from "../src/lib/prisma";

async function main() {
  const company = await prisma.company.findUnique({
    where: { slug: "hypersonix" },
  });

  console.log("Company:", company?.id, company?.displayName);

  if (!company) {
    console.error("Company not found!");
    return;
  }

  const count = await prisma.mediaAsset.count({
    where: { companyId: company.id },
  });

  console.log("Total MediaAssets:", count);

  if (count > 0) {
    const assets = await prisma.mediaAsset.findMany({
      where: { companyId: company.id },
      take: 5,
    });
    console.log("\nSample assets:");
    assets.forEach((asset) => {
      console.log(`- ${asset.title} (${asset.type}, category: ${asset.category})`);
    });
  } else {
    console.log("No visual assets found! Run: npm run seed:visuals");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

