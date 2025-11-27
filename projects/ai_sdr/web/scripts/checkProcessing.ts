import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";

async function main() {
  const company = await prisma.company.findUnique({
    where: { slug: "hypersonix" },
  });

  if (!company) {
    console.log("Company not found!");
    return;
  }

  console.log("Company:", company.displayName, company.id);
  
  // Check media assets
  const assets = await prisma.mediaAsset.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  console.log("\n📦 Recent Media Assets:");
  assets.forEach((asset) => {
    console.log(`- ${asset.title} (${asset.type})`);
    console.log(`  URL: ${asset.url}`);
    console.log(`  Status: ${asset.processingStatus || "not processed"}`);
    console.log(`  Has extractedText: ${asset.extractedText ? "YES" : "NO"}`);
  });

  // Check documents with mediaAssetId
  const linkedDocs = await prisma.document.findMany({
    where: {
      companyId: company.id,
      mediaAssetId: { not: null },
    },
  });

  console.log(`\n📄 Documents linked to media: ${linkedDocs.length}`);
  linkedDocs.forEach((doc) => {
    console.log(`- ${doc.title} → MediaAsset: ${doc.mediaAssetId}`);
  });

  // Check total chunks
  const chunkCount = await prisma.chunk.count({
    where: { companyId: company.id },
  });

  console.log(`\n🧩 Total chunks in RAG: ${chunkCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
