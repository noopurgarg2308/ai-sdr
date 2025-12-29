import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";

const QUANTIVALQ_COMPANY_ID = "cmj52tf810000w3lw1rvkkieh";

async function main() {
  console.log("🔍 Checking Q1 2024 PDF for actual financial results...\n");

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

  console.log(`✅ Found: ${q1PDF.title}\n`);

  // Find document from Q1 2024 PDF
  const q1Document = await prisma.document.findFirst({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      mediaAssetId: q1PDF.id,
      source: "pdf_extract", // Main PDF text document
    },
  });

  if (!q1Document) {
    console.log("❌ No document found from Q1 2024 PDF!");
    return;
  }

  console.log(`📄 Document: ${q1Document.title}`);
  console.log(`   Content length: ${q1Document.content.length} chars\n`);

  // Check for key financial terms
  const content = q1Document.content.toLowerCase();
  const hasRevenue = content.includes("revenue") || content.includes("$2.14") || content.includes("2.14 billion");
  const hasNetIncome = content.includes("net income") || content.includes("net loss");
  const hasEBITDA = content.includes("ebitda");
  const hasFreeCashFlow = content.includes("free cash flow") || content.includes("fcf");
  const hasQ1Results = content.includes("q1 revenue") || content.includes("q1 2024 revenue") || 
                        content.includes("first quarter 2024");

  console.log("🔍 Financial terms found:");
  console.log(`   Revenue: ${hasRevenue ? "✅" : "❌"}`);
  console.log(`   Net Income: ${hasNetIncome ? "✅" : "❌"}`);
  console.log(`   EBITDA: ${hasEBITDA ? "✅" : "❌"}`);
  console.log(`   Free Cash Flow: ${hasFreeCashFlow ? "✅" : "❌"}`);
  console.log(`   Q1 Results: ${hasQ1Results ? "✅" : "❌"}\n`);

  // Find chunks with revenue information
  const chunks = await prisma.chunk.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      documentId: q1Document.id,
    },
  });

  console.log(`🧩 Total chunks from Q1 2024 PDF: ${chunks.length}\n`);

  // Find chunks with financial results
  const financialChunks = chunks.filter((chunk) => {
    const c = chunk.content.toLowerCase();
    return (c.includes("revenue") && (c.includes("q1 2024") || c.includes("2.14") || c.includes("billion"))) ||
           (c.includes("net income") && c.includes("q1")) ||
           (c.includes("ebitda") && c.includes("q1"));
  });

  console.log(`💰 Chunks with Q1 2024 financial results: ${financialChunks.length}\n`);

  if (financialChunks.length > 0) {
    console.log("✅ Sample financial chunks:\n");
    financialChunks.slice(0, 3).forEach((chunk, i) => {
      console.log(`${i + 1}. ${chunk.content.substring(0, 300).replace(/\n/g, " ")}...\n`);
    });
  } else {
    console.log("❌ No chunks found with Q1 2024 financial results!\n");
    console.log("   Searching for any revenue mentions...\n");
    
    const revenueChunks = chunks.filter((chunk) => 
      chunk.content.toLowerCase().includes("revenue")
    );
    
    console.log(`   Chunks mentioning 'revenue': ${revenueChunks.length}`);
    if (revenueChunks.length > 0) {
      console.log("\n   Sample:\n");
      console.log(`   ${revenueChunks[0].content.substring(0, 400).replace(/\n/g, " ")}...\n`);
    }
  }

  // Test search specifically for Q1 2024 revenue
  console.log("\n🔍 Testing search for 'Q1 2024 revenue'...\n");
  const { searchKnowledge } = await import("../src/lib/rag");
  const results = await searchKnowledge({
    companyId: QUANTIVALQ_COMPANY_ID,
    query: "Q1 2024 revenue",
    limit: 5,
  });

  console.log(`📊 Search Results: ${results.length}\n`);
  results.forEach((r, i) => {
    const isFromQ1PDF = r.documentId === q1Document.id;
    const hasQ1Revenue = r.content.toLowerCase().includes("q1 2024") && 
                         r.content.toLowerCase().includes("revenue");
    console.log(`${i + 1}. Score: ${r.score.toFixed(4)}`);
    console.log(`   From Q1 2024 PDF: ${isFromQ1PDF ? "✅ YES" : "❌ NO"}`);
    console.log(`   Has Q1 2024 revenue: ${hasQ1Revenue ? "✅ YES" : "❌ NO"}`);
    console.log(`   Preview: ${r.content.substring(0, 200).replace(/\n/g, " ")}...\n`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
