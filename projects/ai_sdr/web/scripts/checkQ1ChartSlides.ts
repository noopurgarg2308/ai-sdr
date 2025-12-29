import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";

const QUANTIVALQ_COMPANY_ID = "cmj52tf810000w3lw1rvkkieh";

async function main() {
  console.log("🔍 Checking Q1 2024 chart/slide linking...\n");

  // Find Q1 2024 documents
  const q1Docs = await prisma.document.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      title: { contains: "Q1 2024" },
    },
  });

  console.log(`📄 Q1 2024 Documents: ${q1Docs.length}\n`);

  // Check page-level documents (these should have slides)
  const pageLevelDocs = q1Docs.filter(doc => 
    doc.source === "pdf_page_extract" || doc.source === "ocr"
  );

  console.log(`📑 Page-level documents: ${pageLevelDocs.length}`);
  console.log(`📑 Main PDF documents: ${q1Docs.length - pageLevelDocs.length}\n`);

  // Check chunks from page-level documents
  const pageLevelChunks = await prisma.chunk.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      documentId: { in: pageLevelDocs.map(d => d.id) },
    },
    include: {
      document: {
        select: {
          title: true,
          source: true,
        },
      },
    },
    take: 50,
  });

  console.log(`🧩 Page-level chunks: ${pageLevelChunks.length}\n`);

  // Analyze chunks with metadata
  let chunksWithSlides = 0;
  let chunksWithoutSlides = 0;
  let chunksWithPageNumber = 0;
  let chunksWithoutPageNumber = 0;

  const chartKeywords = ["chart", "revenue", "growth", "graph", "visualization"];

  console.log("📊 Analyzing chunks for chart-related content:\n");

  pageLevelChunks.forEach((chunk, idx) => {
    const metadata = chunk.metadata ? JSON.parse(chunk.metadata) : {};
    const hasMediaAssetId = !!metadata.mediaAssetId;
    const hasPageNumber = !!metadata.pageNumber;
    const contentLower = chunk.content.toLowerCase();
    const hasChartKeywords = chartKeywords.some(kw => contentLower.includes(kw));

    if (hasMediaAssetId) chunksWithSlides++;
    else chunksWithoutSlides++;

    if (hasPageNumber) chunksWithPageNumber++;
    else chunksWithoutPageNumber++;

    if (hasChartKeywords || idx < 5) {
      console.log(`  Chunk ${idx + 1}:`);
      console.log(`    Doc: ${chunk.document.title}`);
      console.log(`    Source: ${chunk.document.source}`);
      console.log(`    Media Asset ID: ${metadata.mediaAssetId || "❌ NONE"}`);
      console.log(`    Page Number: ${metadata.pageNumber || "❌ NONE"}`);
      console.log(`    Has chart keywords: ${hasChartKeywords ? "✅" : "❌"}`);
      console.log(`    Content preview: ${chunk.content.substring(0, 150)}...`);
      console.log("");
    }
  });

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY:");
  console.log(`  Page-level chunks with mediaAssetId: ${chunksWithSlides}`);
  console.log(`  Page-level chunks WITHOUT mediaAssetId: ${chunksWithoutSlides}`);
  console.log(`  Page-level chunks with pageNumber: ${chunksWithPageNumber}`);
  console.log(`  Page-level chunks WITHOUT pageNumber: ${chunksWithoutPageNumber}`);

  // Check if slides exist for Q1 2024
  const q1Slides = await prisma.mediaAsset.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      type: "slide",
    },
    take: 1000,
  });

  const q1SlidesFiltered = q1Slides.filter(slide => {
    if (!slide.metadata) return false;
    try {
      const metadata = JSON.parse(slide.metadata as string);
      return slide.title?.toLowerCase().includes("q1 2024") || 
             metadata.parentPdfTitle?.toLowerCase().includes("q1 2024") ||
             slide.title?.toLowerCase().includes("q1");
    } catch {
      return false;
    }
  });

  console.log(`\n  Q1 2024 Slides in database: ${q1SlidesFiltered.length}`);

  if (chunksWithoutSlides > 0) {
    console.log("\n⚠️  ISSUE FOUND:");
    console.log(`   ${chunksWithoutSlides} page-level chunks don't have mediaAssetId!`);
    console.log("   This means they can't link to slides.");
    console.log("\n   SOLUTION: Reprocess Q1 2024 PDFs to ensure page-level chunks have mediaAssetId");
  }

  if (chunksWithoutPageNumber > 0) {
    console.log("\n⚠️  ISSUE FOUND:");
    console.log(`   ${chunksWithoutPageNumber} page-level chunks don't have pageNumber!`);
    console.log("   This means they can't resolve to specific slides.");
  }

  if (q1SlidesFiltered.length === 0) {
    console.log("\n⚠️  ISSUE FOUND:");
    console.log("   No Q1 2024 slides found in database!");
    console.log("   This means PDFs weren't processed to extract slides.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
