import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { searchKnowledge } from "../src/lib/rag";

const QUANTIVALQ_COMPANY_ID = "cmj52tf810000w3lw1rvkkieh";

async function main() {
  console.log("🔍 Testing linked visuals flow...\n");

  const query = "What were Airbnb's financial results in Q1 2024?";
  
  // Step 1: Test search_knowledge
  console.log("1. Testing searchKnowledge...");
  const searchResults = await searchKnowledge({
    companyId: QUANTIVALQ_COMPANY_ID,
    query,
    limit: 5,
  });

  console.log(`   Found ${searchResults.length} results\n`);
  
  // Check which results have mediaAssetId
  const resultsWithMedia = searchResults.filter(r => r.mediaAssetId);
  console.log(`   Results with mediaAssetId: ${resultsWithMedia.length}`);
  
  if (resultsWithMedia.length > 0) {
    console.log("\n   Media Asset IDs found:");
    resultsWithMedia.forEach((r, i) => {
      console.log(`   ${i + 1}. mediaAssetId: ${r.mediaAssetId}, pageNumber: ${r.pageNumber || "none"}`);
      console.log(`      Content preview: ${r.content.substring(0, 100)}...`);
    });
  } else {
    console.log("\n   ❌ NO mediaAssetIds in search results!");
    console.log("   This is the problem - chunks don't have mediaAssetId linked.");
  }

  // Step 2: Check if media assets exist
  if (resultsWithMedia.length > 0) {
    const mediaAssetIds = resultsWithMedia.map(r => r.mediaAssetId!).filter(Boolean);
    console.log(`\n2. Checking if ${mediaAssetIds.length} media assets exist in database...`);
    
    const assets = await prisma.mediaAsset.findMany({
      where: {
        id: { in: mediaAssetIds },
        companyId: QUANTIVALQ_COMPANY_ID,
      },
      select: {
        id: true,
        type: true,
        url: true,
        title: true,
        processingStatus: true,
      },
    });
    
    console.log(`   Found ${assets.length} media assets in database`);
    assets.forEach((asset, i) => {
      console.log(`   ${i + 1}. ${asset.title} (${asset.type})`);
      console.log(`      URL: ${asset.url}`);
      console.log(`      Status: ${asset.processingStatus || "unknown"}`);
    });
    
    if (assets.length === 0) {
      console.log("\n   ❌ Media assets not found in database!");
      console.log("   The mediaAssetIds from chunks don't match any assets.");
    }
  }

  // Step 3: Check chunks directly
  console.log("\n3. Checking chunks from Q1 2024 PDF...");
  const q1PDF = await prisma.mediaAsset.findFirst({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      type: "pdf",
      title: { contains: "Q1 2024" },
      processingStatus: "completed",
    },
    orderBy: { createdAt: "desc" },
  });

  if (q1PDF) {
    const q1Doc = await prisma.document.findFirst({
      where: {
        companyId: QUANTIVALQ_COMPANY_ID,
        mediaAssetId: q1PDF.id,
        source: "pdf_extract",
      },
    });

    if (q1Doc) {
      const chunks = await prisma.chunk.findMany({
        where: {
          companyId: QUANTIVALQ_COMPANY_ID,
          documentId: q1Doc.id,
        },
        take: 3,
      });

      console.log(`   Found ${chunks.length} chunks from Q1 2024 PDF`);
      chunks.forEach((chunk, i) => {
        const metadata = chunk.metadata ? JSON.parse(chunk.metadata) : {};
        console.log(`   ${i + 1}. Has metadata: ${chunk.metadata ? "✅" : "❌"}`);
        console.log(`      mediaAssetId in metadata: ${metadata.mediaAssetId || "❌ NONE"}`);
        console.log(`      Document mediaAssetId: ${q1Doc.mediaAssetId || "❌ NONE"}`);
      });
    }
  }

  // Step 4: Check slides
  console.log("\n4. Checking slides from Q1 2024 PDF...");
  const slides = await prisma.mediaAsset.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      type: "slide",
      metadata: {
        path: ["parentPdfId"],
        equals: q1PDF?.id,
      },
    },
    take: 5,
  });

  console.log(`   Found ${slides.length} slides from Q1 2024 PDF`);
  slides.forEach((slide, i) => {
    console.log(`   ${i + 1}. ${slide.title}`);
    console.log(`      URL: ${slide.url}`);
    console.log(`      Status: ${slide.processingStatus || "unknown"}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
