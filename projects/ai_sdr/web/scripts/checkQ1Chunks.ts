import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";

const QUANTIVALQ_COMPANY_ID = "cmj52tf810000w3lw1rvkkieh";

async function main() {
  console.log("🔍 Checking Q1 2024 PDF chunks...\n");

  // Find Q1 2024 PDF
  const q1PDF = await prisma.mediaAsset.findFirst({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      type: "pdf",
      title: { contains: "Q1 2024" },
      processingStatus: "completed",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!q1PDF) {
    console.log("❌ No completed Q1 2024 PDF found!");
    return;
  }

  console.log(`✅ Found Q1 2024 PDF: ${q1PDF.title}`);
  console.log(`   ID: ${q1PDF.id}`);
  console.log(`   Status: ${q1PDF.processingStatus}\n`);

  // Find documents from this PDF
  const documents = await prisma.document.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      mediaAssetId: q1PDF.id,
    },
  });

  console.log(`📄 Documents from Q1 2024 PDF: ${documents.length}`);
  documents.forEach((doc) => {
    console.log(`  - ${doc.title} (${doc.source})`);
    console.log(`    Content: ${doc.content.length} chars`);
    const hasQ1 = doc.content.toLowerCase().includes("q1 2024");
    console.log(`    Contains Q1 2024: ${hasQ1 ? "✅" : "❌"}`);
  });

  // Find chunks from these documents
  const documentIds = documents.map((d) => d.id);
  const chunks = await prisma.chunk.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      documentId: { in: documentIds },
    },
    include: {
      document: {
        select: {
          title: true,
        },
      },
    },
    take: 20,
  });

  console.log(`\n🧩 Chunks from Q1 2024 PDF: ${chunks.length} (showing first 20)`);
  
  const q1Chunks = chunks.filter((c) => {
    const content = c.content.toLowerCase();
    return content.includes("q1 2024") || 
           content.includes("first quarter 2024") ||
           content.includes("revenue") ||
           content.includes("financial");
  });

  console.log(`\n🔍 Chunks with Q1/financial keywords: ${q1Chunks.length}`);
  
  if (q1Chunks.length > 0) {
    console.log("\n✅ Sample chunks:");
    q1Chunks.slice(0, 5).forEach((chunk) => {
      console.log(`\n  From: ${chunk.document.title}`);
      const preview = chunk.content.substring(0, 200);
      console.log(`  Content: ${preview}...`);
    });
  } else {
    console.log("\n❌ No chunks with Q1/financial keywords found!");
    console.log("   This explains why search isn't finding Q1 2024 results.");
  }

  // Test search
  console.log("\n🔍 Testing search for 'Q1 2024 financial results'...");
  const { searchKnowledge } = await import("../src/lib/rag");
  const results = await searchKnowledge({
    companyId: QUANTIVALQ_COMPANY_ID,
    query: "Q1 2024 financial results",
    limit: 5,
  });

  console.log(`\n📊 Search Results: ${results.length}`);
  results.forEach((r, i) => {
    console.log(`\n  ${i + 1}. Score: ${r.score.toFixed(3)}`);
    console.log(`     Content: ${r.content.substring(0, 150)}...`);
    console.log(`     Has mediaAssetId: ${r.mediaAssetId ? "✅" : "❌"}`);
    const hasQ1 = r.content.toLowerCase().includes("q1 2024");
    console.log(`     Contains Q1 2024: ${hasQ1 ? "✅" : "❌"}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
