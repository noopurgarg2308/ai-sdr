import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";

const QUANTIVALQ_COMPANY_ID = "cmj52tf810000w3lw1rvkkieh";

async function main() {
  console.log("🧹 Cleaning up and resetting processing...\n");

  // 1. Reset all PDFs stuck in "processing" status
  const processingPDFs = await prisma.mediaAsset.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      type: "pdf",
      processingStatus: "processing",
    },
  });

  console.log(`📄 Resetting ${processingPDFs.length} PDFs stuck in processing...`);
  
  for (const pdf of processingPDFs) {
    await prisma.mediaAsset.update({
      where: { id: pdf.id },
      data: { 
        processingStatus: "pending",
        // Clear partial slide references
        metadata: JSON.stringify({
          ...(pdf.metadata ? JSON.parse(pdf.metadata) : {}),
          slideAssetIds: [],
          numPages: undefined,
        }),
      },
    });
    console.log(`   ✅ Reset: ${pdf.title}`);
  }

  // 2. Find and delete incomplete slide assets (orphaned slides)
  const processingSlides = await prisma.mediaAsset.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      type: "slide",
      OR: [
        { processingStatus: "processing" },
        { processingStatus: "pending" },
      ],
    },
  });

  console.log(`\n🗑️  Deleting ${processingSlides.length} incomplete/orphaned slides...`);
  
  // Delete the slide assets and their associated documents
  for (const slide of processingSlides) {
    // Delete associated documents first
    await prisma.document.deleteMany({
      where: { mediaAssetId: slide.id },
    });
    
    // Delete the slide asset
    await prisma.mediaAsset.delete({
      where: { id: slide.id },
    });
    
    console.log(`   ✅ Deleted: ${slide.title}`);
  }

  // 3. Reset failed PDFs
  const failedPDFs = await prisma.mediaAsset.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      type: "pdf",
      processingStatus: "failed",
    },
  });

  console.log(`\n🔄 Resetting ${failedPDFs.length} failed PDFs...`);
  
  for (const pdf of failedPDFs) {
    await prisma.mediaAsset.update({
      where: { id: pdf.id },
      data: { 
        processingStatus: "pending",
        metadata: JSON.stringify({
          ...(pdf.metadata ? JSON.parse(pdf.metadata) : {}),
          slideAssetIds: [],
          numPages: undefined,
          error: undefined,
        }),
      },
    });
    console.log(`   ✅ Reset: ${pdf.title}`);
  }

  // 4. Clean up any PDFs with partial slide references
  const pdfsWithPartialSlides = await prisma.mediaAsset.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      type: "pdf",
      processingStatus: "completed",
    },
  });

  let cleanedCount = 0;
  for (const pdf of pdfsWithPartialSlides) {
    const metadata = pdf.metadata ? JSON.parse(pdf.metadata) : {};
    const slideAssetIds = metadata.slideAssetIds || [];
    
    // Check if slide assets actually exist
    if (slideAssetIds.length > 0) {
      const existingSlides = await prisma.mediaAsset.findMany({
        where: {
          id: { in: slideAssetIds },
        },
        select: { id: true },
      });
      
      const existingIds = existingSlides.map(s => s.id);
      const missingIds = slideAssetIds.filter((id: string) => !existingIds.includes(id));
      
      if (missingIds.length > 0) {
        // Clean up references to non-existent slides
        await prisma.mediaAsset.update({
          where: { id: pdf.id },
          data: {
            metadata: JSON.stringify({
              ...metadata,
              slideAssetIds: existingIds,
            }),
          },
        });
        cleanedCount++;
      }
    }
  }

  if (cleanedCount > 0) {
    console.log(`\n🧹 Cleaned up ${cleanedCount} PDFs with orphaned slide references`);
  }

  console.log(`\n✅ Cleanup complete!`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Reset ${processingPDFs.length} processing PDFs`);
  console.log(`   - Deleted ${processingSlides.length} incomplete slides`);
  console.log(`   - Reset ${failedPDFs.length} failed PDFs`);
  console.log(`   - Cleaned ${cleanedCount} PDFs with orphaned references`);
  console.log(`\n💡 Ready for reprocessing with smart OCR logic!`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
