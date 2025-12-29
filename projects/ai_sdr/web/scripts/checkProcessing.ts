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
    console.log(`\n- ${asset.title} (${asset.type})`);
    console.log(`  URL: ${asset.url}`);
    console.log(`  Status: ${asset.processingStatus || "not processed"}`);
    console.log(`  Created: ${asset.createdAt}`);
    
    if (asset.type === "video") {
      console.log(`  Transcript: ${asset.transcript ? `YES (${asset.transcript.length} chars)` : "NO"}`);
      console.log(`  Frame Analysis: ${asset.frameAnalysis ? "YES" : "NO"}`);
      if (asset.frameAnalysis) {
        try {
          const frames = JSON.parse(asset.frameAnalysis as string);
          console.log(`  Frames analyzed: ${Array.isArray(frames) ? frames.length : "N/A"}`);
        } catch (e) {
          console.log(`  Frame Analysis: Invalid JSON`);
        }
      }
    } else if (asset.type === "image" || asset.type === "chart") {
      console.log(`  Extracted Text: ${asset.extractedText ? `YES (${asset.extractedText.length} chars)` : "NO"}`);
    }
  });

  // Check documents with mediaAssetId
  const linkedDocs = await prisma.document.findMany({
    where: {
      companyId: company.id,
      mediaAssetId: { not: null },
    },
    include: {
      mediaAsset: true,
    },
  });

  console.log(`\n📄 Documents linked to media: ${linkedDocs.length}`);
  linkedDocs.forEach((doc) => {
    console.log(`\n- ${doc.title}`);
    console.log(`  → MediaAsset: ${doc.mediaAssetId}`);
    console.log(`  → Content length: ${doc.content.length} chars`);
    console.log(`  → Source: ${doc.source || "unknown"}`);
    if (doc.mediaAsset) {
      console.log(`  → Media Type: ${doc.mediaAsset.type}`);
      if (doc.mediaAsset.type === "video") {
        console.log(`  → Video Transcript: ${doc.mediaAsset.transcript?.substring(0, 100) || "N/A"}...`);
      }
    }
    console.log(`  → Content preview: ${doc.content.substring(0, 150)}...`);
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
