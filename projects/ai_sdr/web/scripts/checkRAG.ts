import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { prisma } from "../src/lib/prisma";

async function main() {
  const company = await prisma.company.findUnique({
    where: { slug: "hypersonix" },
  });

  console.log("Company ID:", company?.id);

  if (!company) {
    console.log("Company not found!");
    return;
  }

  const docCount = await prisma.document.count({
    where: { companyId: company.id },
  });

  const chunkCount = await prisma.chunk.count({
    where: { companyId: company.id },
  });

  console.log("Documents:", docCount);
  console.log("Chunks:", chunkCount);

  if (chunkCount === 0) {
    console.log("\n❌ No chunks found! RAG won't work.");
    console.log("Run: npm run seed:hypersonix");
  } else {
    console.log("\n✅ RAG data exists!");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

