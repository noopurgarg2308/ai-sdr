import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { searchKnowledge } from "../src/lib/rag";

async function main() {
  console.log("🔍 Testing QuantivalQ RAG search...\n");

  // Look up the company
  const company = await prisma.company.findUnique({
    where: { slug: "quantivalq" },
  });

  if (!company) {
    console.error('❌ Error: Company with slug "quantivalq" not found.');
    console.error('   Please create the company first by running: npm run create:quantivalq');
    process.exit(1);
  }

  console.log(`✓ Found company: ${company.displayName} (${company.id})\n`);

  // Test queries
  const testQueries = [
    "What is QuantivalQ?",
    "What are the pricing plans?",
    "Tell me about machine learning capabilities",
    "How does the API work?",
    "What are the use cases?",
  ];

  for (const query of testQueries) {
    console.log(`\n📝 Query: "${query}"`);
    console.log("─".repeat(60));

    try {
      const results = await searchKnowledge({
        companyId: company.id,
        query,
        limit: 3,
      });

      if (results.length === 0) {
        console.log("   ⚠️  No results found");
        console.log("   💡 Make sure documents have been ingested: npm run seed:quantivalq:docs");
      } else {
        console.log(`   ✅ Found ${results.length} relevant results:\n`);
        results.forEach((result, index) => {
          console.log(`   ${index + 1}. Score: ${result.score.toFixed(3)}`);
          console.log(`      Content: ${result.content.substring(0, 150)}...`);
          console.log(`      Document ID: ${result.documentId}\n`);
        });
      }
    } catch (error) {
      console.error(`   ❌ Error searching:`, error);
    }
  }

  // Check document and chunk counts
  const docCount = await prisma.document.count({
    where: { companyId: company.id },
  });

  const chunkCount = await prisma.chunk.count({
    where: { companyId: company.id },
  });

  console.log("\n" + "=".repeat(60));
  console.log("📊 RAG Statistics:");
  console.log(`   Documents: ${docCount}`);
  console.log(`   Chunks: ${chunkCount}`);
  console.log("=".repeat(60));

  if (docCount === 0) {
    console.log("\n⚠️  No documents found. Run: npm run seed:quantivalq:docs");
  }

  if (chunkCount === 0) {
    console.log("⚠️  No chunks found. Documents may not have been processed.");
  }

  console.log("\n✅ RAG test complete!");
  console.log("\n📝 Next steps:");
  console.log("   1. Test in widget: http://localhost:3000/widget/quantivalq");
  console.log("   2. Try asking questions about QuantivalQ");
  console.log("   3. Check if images were processed: npm run seed:quantivalq:images");
}

main()
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
