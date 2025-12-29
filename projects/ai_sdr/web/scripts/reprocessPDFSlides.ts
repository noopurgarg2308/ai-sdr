import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { processPDFAsset } from "../src/lib/pdfProcessor";

const QUANTIVALQ_COMPANY_ID = "cmj52tf810000w3lw1rvkkieh";

async function main() {
  console.log("🔄 Reprocessing PDFs to extract slides...\n");

  // Find all PDFs for QuantivalQ that need reprocessing:
  // - Failed PDFs
  // - Stuck in processing (over 1 hour)
  // - Completed but missing slides
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const pdfs = await prisma.mediaAsset.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      type: "pdf",
      OR: [
        { processingStatus: "failed" },
        { 
          processingStatus: "processing",
          createdAt: { lt: oneHourAgo }, // Stuck for over 1 hour
        },
        { processingStatus: "completed" },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Found ${pdfs.length} PDFs to reprocess:\n`);

  for (const pdf of pdfs) {
    console.log(`📄 ${pdf.title}`);
    console.log(`   ID: ${pdf.id}`);
    console.log(`   Status: ${pdf.processingStatus || "unknown"}`);
    
    // Check if slides were already extracted
    const metadata = pdf.metadata ? JSON.parse(pdf.metadata) : {};
    const numSlides = metadata.numPages || 0;
    const slideAssetIds = metadata.slideAssetIds || [];
    
    console.log(`   Current slides: ${slideAssetIds.length}`);
    
    // Skip if already completed and has slides (unless it's failed/stuck)
    if (pdf.processingStatus === "completed" && slideAssetIds.length > 0) {
      console.log(`   ⏭️  Already has slides, skipping...\n`);
      continue;
    }
    
    // For failed/stuck PDFs, always reprocess
    if (pdf.processingStatus === "failed" || 
        (pdf.processingStatus === "processing" && new Date(pdf.createdAt) < oneHourAgo)) {
      console.log(`   ⚠️  Failed or stuck - will reprocess...`);
    }

    console.log(`   🔄 Reprocessing to extract slides (using smart OCR logic)...`);
    
    try {
      // Reset processing status to trigger reprocessing
      // Also clear any existing slide references so they can be recreated
      const currentMetadata = pdf.metadata ? JSON.parse(pdf.metadata) : {};
      await prisma.mediaAsset.update({
        where: { id: pdf.id },
        data: { 
          processingStatus: "pending",
          metadata: JSON.stringify({
            ...currentMetadata,
            slideAssetIds: [], // Clear old slides
            numPages: undefined,
          }),
        },
      });

      // Process the PDF (this will extract text + slides with smart OCR)
      await processPDFAsset(pdf.id);
      
      console.log(`   ✅ Successfully reprocessed!\n`);
    } catch (error) {
      console.error(`   ❌ Error:`, error);
      console.log();
    }
  }

  console.log("✅ Reprocessing complete!");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
