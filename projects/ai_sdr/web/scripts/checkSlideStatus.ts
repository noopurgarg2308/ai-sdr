import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";

const QUANTIVALQ_COMPANY_ID = "cmj52tf810000w3lw1rvkkieh";

async function main() {
  console.log("📊 Checking slide extraction status...\n");

  // Find all PDFs
  const pdfs = await prisma.mediaAsset.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      type: "pdf",
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  console.log(`Found ${pdfs.length} PDFs:\n`);

  let totalSlides = 0;
  let processedSlides = 0;

  for (const pdf of pdfs) {
    const metadata = pdf.metadata ? JSON.parse(pdf.metadata) : {};
    const slideAssetIds = metadata.slideAssetIds || [];
    const numPages = metadata.numPages || 0;
    
    // Check how many slides have been OCR processed
    if (slideAssetIds.length > 0) {
      const slideAssets = await prisma.mediaAsset.findMany({
        where: {
          id: { in: slideAssetIds },
        },
        select: {
          id: true,
          processingStatus: true,
          title: true,
        },
      });
      
      const completed = slideAssets.filter(s => s.processingStatus === "completed").length;
      processedSlides += completed;
    }
    
    totalSlides += slideAssetIds.length;

    const status = pdf.processingStatus || "unknown";
    const statusIcon = status === "completed" ? "✅" : status === "processing" ? "🔄" : "⏳";
    
    console.log(`${statusIcon} ${pdf.title}`);
    console.log(`   Status: ${status}`);
    console.log(`   Slides extracted: ${slideAssetIds.length}/${numPages || "?"}`);
    
    if (slideAssetIds.length > 0) {
      // Check OCR status
      const slideAssets = await prisma.mediaAsset.findMany({
        where: {
          id: { in: slideAssetIds.slice(0, 5) }, // Check first 5
        },
        select: {
          processingStatus: true,
        },
      });
      
      const completed = slideAssets.filter(s => s.processingStatus === "completed").length;
      const processing = slideAssets.filter(s => s.processingStatus === "processing").length;
      const pending = slideAssets.filter(s => !s.processingStatus || s.processingStatus === "pending").length;
      
      console.log(`   OCR status: ${completed} completed, ${processing} processing, ${pending} pending`);
    }
    console.log();
  }

  console.log(`\n📈 Summary:`);
  console.log(`   Total slides extracted: ${totalSlides}`);
  console.log(`   Slides OCR processed: ${processedSlides}`);
  console.log(`   Ready for queries: ${processedSlides > 0 ? "✅ Yes" : "⏳ Not yet"}`);
  
  if (processedSlides > 0) {
    console.log(`\n✅ You can test queries now! ${processedSlides} slides are ready.`);
  } else if (totalSlides > 0) {
    console.log(`\n⏳ Slides extracted but OCR still processing. Wait a bit longer.`);
  } else {
    console.log(`\n⏳ No slides extracted yet. Run: npm run reprocess:pdf:slides`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
