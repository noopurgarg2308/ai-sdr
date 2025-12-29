import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";

const QUANTIVALQ_COMPANY_ID = "cmj52tf810000w3lw1rvkkieh";

async function main() {
  console.log("🔍 Checking for Q1 2024 content...\n");

  // Check for Q1 2024 documents
  const q1Docs = await prisma.document.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      title: { contains: "Q1 2024" },
    },
  });

  console.log(`📄 Q1 2024 Documents: ${q1Docs.length}`);
  q1Docs.forEach(doc => {
    console.log(`  - ${doc.title}`);
    console.log(`    ID: ${doc.id}`);
    console.log(`    Source: ${doc.source}`);
    console.log(`    Media Asset ID: ${doc.mediaAssetId || "none"}`);
  });

  // Check for Q1 2024 chunks
  const allChunks = await prisma.chunk.findMany({
    where: { companyId: QUANTIVALQ_COMPANY_ID },
    include: {
      document: {
        select: {
          title: true,
        },
      },
    },
    take: 1000,
  });

  const q1Chunks = allChunks.filter(chunk => {
    const content = chunk.content.toLowerCase();
    return content.includes("q1 2024") || content.includes("first quarter 2024");
  });

  console.log(`\n🧩 Q1 2024 Chunks: ${q1Chunks.length} (out of ${allChunks.length} total)`);
  if (q1Chunks.length > 0) {
    q1Chunks.slice(0, 5).forEach((chunk, idx) => {
      console.log(`\n  ${idx + 1}. From: ${chunk.document.title}`);
      const metadata = chunk.metadata ? JSON.parse(chunk.metadata) : {};
      console.log(`     Media Asset ID: ${metadata.mediaAssetId || "none"}`);
      console.log(`     Page Number: ${metadata.pageNumber || "none"}`);
      console.log(`     Content preview: ${chunk.content.substring(0, 200)}...`);
    });
  } else {
    console.log("\n❌ NO Q1 2024 CHUNKS FOUND!");
    console.log("   This explains why Q1 2024 queries return Q4 2024 content.");
  }

  // Check for Q4 2024 chunks (for comparison)
  const q4Chunks = allChunks.filter(chunk => {
    const content = chunk.content.toLowerCase();
    return content.includes("q4 2024") || content.includes("fourth quarter 2024");
  });

  console.log(`\n🧩 Q4 2024 Chunks: ${q4Chunks.length} (for comparison)`);

  // Check slides from Q1 vs Q4 PDFs
  const allSlides = await prisma.mediaAsset.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      type: "slide",
    },
    take: 1000,
  });

  const q1Slides = allSlides.filter(slide => {
    if (!slide.metadata) return false;
    try {
      const metadata = JSON.parse(slide.metadata as string);
      return slide.title?.toLowerCase().includes("q1 2024") || 
             metadata.parentPdfTitle?.toLowerCase().includes("q1 2024");
    } catch {
      return false;
    }
  });

  const q4Slides = allSlides.filter(slide => {
    if (!slide.metadata) return false;
    try {
      const metadata = JSON.parse(slide.metadata as string);
      return slide.title?.toLowerCase().includes("q4 2024") || 
             metadata.parentPdfTitle?.toLowerCase().includes("q4 2024");
    } catch {
      return false;
    }
  });

  console.log(`\n🖼️  Q1 2024 Slides: ${q1Slides.length}`);
  console.log(`🖼️  Q4 2024 Slides: ${q4Slides.length}`);

  if (q1Slides.length === 0) {
    console.log("\n❌ NO Q1 2024 SLIDES FOUND!");
    console.log("   This explains why Q1 2024 queries show Q4 2024 slides.");
  }

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY:");
  console.log(`  Q1 2024 Documents: ${q1Docs.length}`);
  console.log(`  Q1 2024 Chunks: ${q1Chunks.length}`);
  console.log(`  Q1 2024 Slides: ${q1Slides.length}`);
  console.log(`  Q4 2024 Chunks: ${q4Chunks.length} (for comparison)`);
  console.log(`  Q4 2024 Slides: ${q4Slides.length} (for comparison)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
