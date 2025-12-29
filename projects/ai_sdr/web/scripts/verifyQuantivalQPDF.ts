import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { searchKnowledge } from "../src/lib/rag";

async function main() {
  console.log("🔍 Verifying QuantivalQ PDF upload and processing...\n");

  // Look up the company
  const company = await prisma.company.findUnique({
    where: { slug: "quantivalq" },
    include: {
      mediaAssets: {
        where: { type: "pdf" },
        include: {
          documents: {
            include: {
              _count: {
                select: { chunks: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          documents: true,
          chunks: true,
          mediaAssets: true,
        },
      },
    },
  });

  if (!company) {
    console.error('❌ Error: Company with slug "quantivalq" not found.');
    process.exit(1);
  }

  console.log(`✅ Company: ${company.displayName}`);
  console.log(`   ID: ${company.id}\n`);

  console.log("=".repeat(60));
  console.log("📊 Overall Statistics:");
  console.log(`   Total Documents: ${company._count.documents}`);
  console.log(`   Total Chunks: ${company._count.chunks}`);
  console.log(`   Total Media Assets: ${company._count.mediaAssets}`);
  console.log("=".repeat(60));

  // Check PDF uploads
  const pdfAssets = company.mediaAssets.filter((a) => a.type === "pdf");

  if (pdfAssets.length === 0) {
    console.log("\n⚠️  No PDF files found!");
    console.log("   Upload PDFs at: http://localhost:3000/admin/companies/cmj52tf810000w3lw1rvkkieh/media");
    process.exit(0);
  }

  console.log(`\n📄 Found ${pdfAssets.length} PDF file(s):\n`);

  for (const pdf of pdfAssets) {
    console.log("─".repeat(60));
    console.log(`📄 PDF: ${pdf.title}`);
    console.log(`   ID: ${pdf.id}`);
    console.log(`   URL: ${pdf.url}`);
    console.log(`   Status: ${pdf.processingStatus || "pending"}`);
    console.log(`   Uploaded: ${new Date(pdf.createdAt).toLocaleString()}`);

    if (pdf.processedAt) {
      console.log(`   Processed: ${new Date(pdf.processedAt).toLocaleString()}`);
    }

    // Check extracted text
    if (pdf.extractedText) {
      const textLength = pdf.extractedText.length;
      const preview = pdf.extractedText.substring(0, 200).replace(/\n/g, " ");
      console.log(`   ✅ Text Extracted: ${textLength} characters`);
      console.log(`   Preview: "${preview}..."`);
    } else {
      console.log(`   ⚠️  No extracted text found`);
    }

    // Check linked documents
    if (pdf.documents && pdf.documents.length > 0) {
      console.log(`\n   📚 Linked RAG Documents: ${pdf.documents.length}`);
      pdf.documents.forEach((doc, idx) => {
        const chunkCount = doc._count.chunks;
        console.log(`      ${idx + 1}. ${doc.title}`);
        console.log(`         Document ID: ${doc.id}`);
        console.log(`         Source: ${doc.source || "unknown"}`);
        console.log(`         Chunks: ${chunkCount}`);
        console.log(`         Created: ${new Date(doc.createdAt).toLocaleString()}`);

        if (chunkCount === 0) {
          console.log(`         ⚠️  WARNING: Document has no chunks!`);
        }
      });
    } else {
      console.log(`\n   ⚠️  No RAG documents linked to this PDF`);
      console.log(`      This means the PDF text was not indexed for search.`);
      if (pdf.processingStatus === "failed") {
        console.log(`      Processing status is "failed" - check logs for errors.`);
      } else if (pdf.processingStatus === "processing") {
        console.log(`      PDF is still being processed...`);
      } else {
        console.log(`      Try re-processing the PDF or check if auto-process was enabled.`);
      }
    }
  }

  // Test RAG search with sample queries
  console.log("\n" + "=".repeat(60));
  console.log("🧪 Testing RAG Search:");
  console.log("=".repeat(60));

  if (company._count.chunks === 0) {
    console.log("\n⚠️  No chunks found in knowledge base!");
    console.log("   PDFs may not have been processed yet.");
    console.log("   Check processing status above.");
  } else {
    // Test queries that should find content from PDFs
    const testQueries = [
      "What is the company about?",
      "Tell me about the business",
      "What are the key products?",
    ];

    for (const query of testQueries) {
      console.log(`\n📝 Query: "${query}"`);
      try {
        const results = await searchKnowledge({
          companyId: company.id,
          query,
          limit: 3,
        });

        if (results.length === 0) {
          console.log("   ⚠️  No results found");
        } else {
          console.log(`   ✅ Found ${results.length} relevant chunks:`);
          results.forEach((result, idx) => {
            const preview = result.content.substring(0, 150).replace(/\n/g, " ");
            console.log(`      ${idx + 1}. Score: ${result.score.toFixed(3)}`);
            console.log(`         Content: "${preview}..."`);
            console.log(`         Document ID: ${result.documentId}`);
          });
        }
      } catch (error) {
        console.error(`   ❌ Error:`, error);
      }
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 Summary:");
  console.log("=".repeat(60));

  const processedPDFs = pdfAssets.filter((p) => p.processingStatus === "completed");
  const failedPDFs = pdfAssets.filter((p) => p.processingStatus === "failed");
  const pendingPDFs = pdfAssets.filter(
    (p) => !p.processingStatus || p.processingStatus === "pending" || p.processingStatus === "processing"
  );

  console.log(`   PDFs Uploaded: ${pdfAssets.length}`);
  console.log(`   ✅ Processed: ${processedPDFs.length}`);
  console.log(`   ⚠️  Pending: ${pendingPDFs.length}`);
  console.log(`   ❌ Failed: ${failedPDFs.length}`);

  const totalChunksFromPDFs = pdfAssets.reduce(
    (sum, pdf) =>
      sum +
      (pdf.documents?.reduce((docSum, doc) => docSum + doc._count.chunks, 0) || 0),
    0
  );

  console.log(`\n   Chunks from PDFs: ${totalChunksFromPDFs}`);
  console.log(`   Total chunks in KB: ${company._count.chunks}`);

  if (totalChunksFromPDFs > 0) {
    console.log(`\n   ✅ PDFs are indexed and searchable!`);
  } else {
    console.log(`\n   ⚠️  PDFs are not yet indexed.`);
    if (pendingPDFs.length > 0) {
      console.log(`   PDFs are still processing - wait a bit and check again.`);
    } else if (failedPDFs.length > 0) {
      console.log(`   Some PDFs failed processing - check errors above.`);
    }
  }

  console.log("\n" + "=".repeat(60));
}

main()
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
