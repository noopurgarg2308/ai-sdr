import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { processPDFAsset } from "../src/lib/pdfProcessor";

const QUANTIVALQ_COMPANY_ID = "cmj52tf810000w3lw1rvkkieh";

async function main() {
  console.log("🔄 Reprocessing PDFs to ensure page-level chunks are created...\n");

  // Find all PDFs for QuantivalQ
  const pdfs = await prisma.mediaAsset.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      type: "pdf",
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Found ${pdfs.length} PDFs:\n`);

  for (const pdf of pdfs) {
    console.log(`📄 ${pdf.title}`);
    console.log(`   ID: ${pdf.id}`);
    
    // Check if page-level documents exist
    const pageDocs = await prisma.document.findMany({
      where: {
        companyId: QUANTIVALQ_COMPANY_ID,
        source: "pdf_page_extract",
        title: { contains: pdf.title },
      },
    });
    
    console.log(`   Page-level documents: ${pageDocs.length}`);
    
    // Check if slides exist
    const slides = await prisma.mediaAsset.findMany({
      where: {
        companyId: QUANTIVALQ_COMPANY_ID,
        type: "slide",
        metadata: { contains: pdf.id },
      },
    });
    
    console.log(`   Slides: ${slides.length}`);
    
    // If we have slides but no page-level documents, we need to reprocess
    // Or if we don't have slides, we need to process
    if (slides.length === 0 || pageDocs.length === 0) {
      console.log(`   🔄 Reprocessing to create page-level chunks...`);
      
      try {
        // Reset processing status
        await prisma.mediaAsset.update({
          where: { id: pdf.id },
          data: { 
            processingStatus: "pending",
          },
        });

        // Process the PDF (this will extract slides and create page-level documents)
        await processPDFAsset(pdf.id);
        
        console.log(`   ✅ Successfully reprocessed!\n`);
      } catch (error) {
        console.error(`   ❌ Error:`, error);
        console.log();
      }
    } else {
      console.log(`   ✅ Already has slides and page-level documents\n`);
    }
  }

  // Now check if we should delete main PDF document chunks to prioritize page-level chunks
  console.log("\n🔍 Checking if we should clean up main PDF document chunks...\n");
  
  const mainPDFDocs = await prisma.document.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      source: "pdf_extract", // Main PDF documents (not page-level)
    },
    include: {
      chunks: true,
    },
  });

  console.log(`Found ${mainPDFDocs.length} main PDF documents with ${mainPDFDocs.reduce((sum, doc) => sum + doc.chunks.length, 0)} chunks`);
  
  // For each main PDF document, check if we have page-level documents
  let chunksToDelete = 0;
  for (const doc of mainPDFDocs) {
    const pdfTitle = doc.title.replace(" (PDF)", "");
    const pageDocs = await prisma.document.findMany({
      where: {
        companyId: QUANTIVALQ_COMPANY_ID,
        source: "pdf_page_extract",
        title: { contains: pdfTitle },
      },
    });
    
    if (pageDocs.length > 0) {
      console.log(`   📄 ${doc.title}: Has ${pageDocs.length} page-level documents, ${doc.chunks.length} main document chunks`);
      console.log(`      💡 Main document chunks will be kept but page-level chunks will be prioritized in search`);
      // We'll keep both - the search boosting logic should prioritize page-level chunks
    }
  }

  console.log("\n✅ Reprocessing complete!");
  console.log("\n💡 Note: Page-level chunks (with pageNumber) will be prioritized in search over main PDF document chunks");
  
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
