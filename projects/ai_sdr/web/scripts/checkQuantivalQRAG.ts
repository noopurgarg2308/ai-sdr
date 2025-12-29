import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";

const QUANTIVALQ_COMPANY_ID = "cmj52tf810000w3lw1rvkkieh";

async function main() {
  console.log("🔍 Checking QuantivalQ RAG Status...\n");

  // Check company
  const company = await prisma.company.findUnique({
    where: { id: QUANTIVALQ_COMPANY_ID },
  });

  if (!company) {
    console.log("❌ Company not found!");
    return;
  }

  console.log(`✅ Company: ${company.displayName} (${company.slug})\n`);

  // Check PDF media assets
  const pdfAssets = await prisma.mediaAsset.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      type: "pdf",
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`📄 PDF Assets: ${pdfAssets.length}`);
  pdfAssets.forEach((asset) => {
    console.log(`\n  - ${asset.title}`);
    console.log(`    Status: ${asset.processingStatus || "pending"}`);
    console.log(`    URL: ${asset.url}`);
    console.log(`    Created: ${asset.createdAt}`);
    if (asset.extractedText) {
      console.log(`    Extracted Text: ${asset.extractedText.length} chars`);
      // Check if Q1 2024 is mentioned
      const hasQ1 = asset.extractedText.toLowerCase().includes("q1 2024") || 
                     asset.extractedText.toLowerCase().includes("first quarter 2024");
      console.log(`    Contains Q1 2024: ${hasQ1 ? "✅ YES" : "❌ NO"}`);
    }
  });

  // Check documents
  const documents = await prisma.document.findMany({
    where: { companyId: QUANTIVALQ_COMPANY_ID },
    include: {
      mediaAsset: {
        select: {
          id: true,
          title: true,
          type: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`\n📚 Documents: ${documents.length}`);
  documents.forEach((doc) => {
    console.log(`\n  - ${doc.title}`);
    console.log(`    Source: ${doc.source || "unknown"}`);
    console.log(`    Content: ${doc.content.length} chars`);
    console.log(`    Media Asset: ${doc.mediaAssetId ? doc.mediaAsset?.title || doc.mediaAssetId : "None"}`);
    
    // Check if Q1 2024 is mentioned
    const hasQ1 = doc.content.toLowerCase().includes("q1 2024") || 
                   doc.content.toLowerCase().includes("first quarter 2024");
    console.log(`    Contains Q1 2024: ${hasQ1 ? "✅ YES" : "❌ NO"}`);
    
    if (hasQ1) {
      // Show snippet
      const q1Index = doc.content.toLowerCase().indexOf("q1 2024");
      if (q1Index === -1) {
        const q1Index2 = doc.content.toLowerCase().indexOf("first quarter 2024");
        if (q1Index2 !== -1) {
          const snippet = doc.content.substring(Math.max(0, q1Index2 - 50), q1Index2 + 200);
          console.log(`    Snippet: ...${snippet}...`);
        }
      } else {
        const snippet = doc.content.substring(Math.max(0, q1Index - 50), q1Index + 200);
        console.log(`    Snippet: ...${snippet}...`);
      }
    }
  });

  // Check chunks
  const chunkCount = await prisma.chunk.count({
    where: { companyId: QUANTIVALQ_COMPANY_ID },
  });

  console.log(`\n🧩 Total Chunks: ${chunkCount}`);

  if (chunkCount === 0) {
    console.log("\n❌ NO CHUNKS FOUND! RAG won't work.");
    console.log("   PDFs may not have been processed yet.");
    return;
  }

  // Check chunks for Q1 2024 content
  const allChunks = await prisma.chunk.findMany({
    where: { companyId: QUANTIVALQ_COMPANY_ID },
    include: {
      document: {
        select: {
          title: true,
          source: true,
        },
      },
    },
    take: 100, // Check first 100 chunks
  });

  const q1Chunks = allChunks.filter((chunk) => {
    const content = chunk.content.toLowerCase();
    return content.includes("q1 2024") || content.includes("first quarter 2024");
  });

  console.log(`\n🔍 Chunks containing Q1 2024: ${q1Chunks.length} (out of ${allChunks.length} checked)`);

  if (q1Chunks.length > 0) {
    console.log("\n✅ Found Q1 2024 content in chunks!");
    q1Chunks.slice(0, 3).forEach((chunk) => {
      console.log(`\n  - From: ${chunk.document.title}`);
      const q1Index = chunk.content.toLowerCase().indexOf("q1 2024");
      if (q1Index === -1) {
        const q1Index2 = chunk.content.toLowerCase().indexOf("first quarter 2024");
        if (q1Index2 !== -1) {
          const snippet = chunk.content.substring(Math.max(0, q1Index2 - 30), q1Index2 + 150);
          console.log(`    Content: ...${snippet}...`);
        }
      } else {
        const snippet = chunk.content.substring(Math.max(0, q1Index - 30), q1Index + 150);
        console.log(`    Content: ...${snippet}...`);
      }
    });
  } else {
    console.log("\n❌ NO Q1 2024 CONTENT FOUND IN CHUNKS!");
    console.log("   This explains why the search isn't finding Q1 2024 data.");
  }

  // Check slides
  const slides = await prisma.mediaAsset.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      type: "slide",
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`\n🖼️  Slides: ${slides.length}`);
  if (slides.length > 0) {
    slides.slice(0, 5).forEach((slide) => {
      console.log(`  - ${slide.title}`);
      console.log(`    Status: ${slide.processingStatus || "pending"}`);
      if (slide.extractedText) {
        console.log(`    OCR Text: ${slide.extractedText.length} chars`);
      }
    });
  }

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY:");
  console.log(`  PDFs: ${pdfAssets.length}`);
  console.log(`  Documents: ${documents.length}`);
  console.log(`  Chunks: ${chunkCount}`);
  console.log(`  Slides: ${slides.length}`);
  console.log(`  Q1 2024 in chunks: ${q1Chunks.length > 0 ? "✅ YES" : "❌ NO"}`);
  
  if (q1Chunks.length === 0 && chunkCount > 0) {
    console.log("\n⚠️  ISSUE: Chunks exist but don't contain Q1 2024 content.");
    console.log("   Possible causes:");
    console.log("   1. PDFs weren't fully processed");
    console.log("   2. Q1 2024 PDF wasn't uploaded");
    console.log("   3. Text extraction failed");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
