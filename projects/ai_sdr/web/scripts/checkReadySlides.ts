import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { searchMediaAssets } from "../src/lib/media";

const QUANTIVALQ_COMPANY_ID = "cmj52tf810000w3lw1rvkkieh";

async function main() {
  console.log("🔍 Checking ready slides for queries...\n");

  // Check all slide assets
  const allSlides = await prisma.mediaAsset.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      type: "slide",
    },
    select: {
      id: true,
      title: true,
      processingStatus: true,
      url: true,
      metadata: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const completed = allSlides.filter(s => s.processingStatus === "completed");
  const processing = allSlides.filter(s => s.processingStatus === "processing");
  const pending = allSlides.filter(s => !s.processingStatus || s.processingStatus === "pending");
  const failed = allSlides.filter(s => s.processingStatus === "failed");

  console.log(`📊 Slide Status:`);
  console.log(`   ✅ Completed: ${completed.length}`);
  console.log(`   🔄 Processing: ${processing.length}`);
  console.log(`   ⏳ Pending: ${pending.length}`);
  console.log(`   ❌ Failed: ${failed.length}`);
  console.log(`   📦 Total: ${allSlides.length}\n`);

  if (completed.length > 0) {
    console.log(`✅ ${completed.length} slides are READY for queries!\n`);
    console.log(`Sample completed slides:`);
    completed.slice(0, 5).forEach((slide, i) => {
      const metadata = slide.metadata ? JSON.parse(slide.metadata) : {};
      console.log(`   ${i + 1}. ${slide.title}`);
      console.log(`      Page: ${metadata.pageNumber || "?"}`);
      console.log(`      URL: ${slide.url}`);
    });
  } else {
    console.log(`⏳ No slides are completed yet. Still processing...\n`);
  }

  // Test the searchMediaAssets function
  console.log(`\n🔍 Testing searchMediaAssets function:\n`);
  
  const testQueries = [
    "revenue",
    "financial",
    "chart",
    "Q2 2024",
  ];

  for (const query of testQueries) {
    const results = await searchMediaAssets({
      companyId: QUANTIVALQ_COMPANY_ID,
      type: "slide",
      query: query,
      limit: 5,
    });
    
    console.log(`Query: "${query}" → Found ${results.length} slides`);
    if (results.length > 0) {
      results.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.title}`);
      });
    }
  }

  // Check if show_visual tool can find anything
  console.log(`\n📋 Summary:`);
  console.log(`   Ready slides: ${completed.length}`);
  console.log(`   Can be found by show_visual: ${completed.length > 0 ? "✅ Yes" : "❌ No"}`);
  console.log(`   Searchable by query: ${completed.length > 0 ? "✅ Yes" : "❌ No"}\n`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
