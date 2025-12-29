import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { openai } from "../src/lib/openai";

const QUANTIVALQ_COMPANY_ID = "cmj52tf810000w3lw1rvkkieh";

// Simple cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function main() {
  const query = "Q1 2024 revenue";
  const queryLower = query.toLowerCase();
  
  console.log(`🔍 Testing search for: "${query}"\n`);
  
  // Get query embedding
  const queryEmbeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  const queryEmbedding = queryEmbeddingResponse.data[0].embedding;
  
  // Get Q1 2024 PDF document
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
    console.log("❌ Q1 2024 PDF not found!");
    return;
  }
  
  const q1Document = await prisma.document.findFirst({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      mediaAssetId: q1PDF.id,
      source: "pdf_extract",
    },
  });
  
  if (!q1Document) {
    console.log("❌ Q1 2024 document not found!");
    return;
  }
  
  console.log(`✅ Q1 2024 Document: ${q1Document.title}\n`);
  
  // Get chunks from Q1 2024 PDF
  const q1Chunks = await prisma.chunk.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      documentId: q1Document.id,
    },
    take: 5,
  });
  
  console.log(`📄 Q1 2024 PDF chunks: ${q1Chunks.length}\n`);
  
  // Calculate scores for Q1 chunks
  console.log("Q1 2024 PDF Chunks:\n");
  q1Chunks.forEach((chunk, i) => {
    const chunkEmbedding = JSON.parse(chunk.embedding) as number[];
    let score = cosineSimilarity(queryEmbedding, chunkEmbedding);
    
    const contentLower = chunk.content.toLowerCase();
    const docTitle = q1Document.title.toLowerCase();
    
    // Apply boosts
    if (queryLower.includes("q1 2024") && contentLower.includes("q1 2024")) {
      score += 0.3;
    }
    if (queryLower.includes("q1 2024") && docTitle.includes("q1 2024")) {
      score += 0.4;
    }
    
    const hasRevenue = contentLower.includes("revenue");
    const hasQ1 = contentLower.includes("q1 2024");
    
    console.log(`${i + 1}. Score: ${score.toFixed(4)}`);
    console.log(`   Has Q1 2024: ${hasQ1 ? "✅" : "❌"}`);
    console.log(`   Has revenue: ${hasRevenue ? "✅" : "❌"}`);
    console.log(`   Preview: ${chunk.content.substring(0, 150).replace(/\n/g, " ")}...\n`);
  });
  
  // Compare with top search results
  console.log("\n" + "=".repeat(60) + "\n");
  console.log("Top search results (for comparison):\n");
  
  const allChunks = await prisma.chunk.findMany({
    where: { companyId: QUANTIVALQ_COMPANY_ID },
    take: 200,
    orderBy: { createdAt: "desc" },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          mediaAssetId: true,
        },
      },
    },
  });
  
  const results = allChunks.map((chunk) => {
    const chunkEmbedding = JSON.parse(chunk.embedding) as number[];
    let score = cosineSimilarity(queryEmbedding, chunkEmbedding);
    
    const contentLower = chunk.content.toLowerCase();
    const docTitle = chunk.document.title.toLowerCase();
    
    if (queryLower.includes("q1 2024") && contentLower.includes("q1 2024")) {
      score += 0.3;
    }
    if (queryLower.includes("q1 2024") && docTitle.includes("q1 2024")) {
      score += 0.4;
    }
    
    return {
      content: chunk.content,
      score,
      documentId: chunk.documentId,
      docTitle: chunk.document.title,
      isQ1PDF: chunk.documentId === q1Document.id,
    };
  });
  
  results.sort((a, b) => b.score - a.score);
  
  results.slice(0, 5).forEach((r, i) => {
    console.log(`${i + 1}. Score: ${r.score.toFixed(4)}`);
    console.log(`   From Q1 PDF: ${r.isQ1PDF ? "✅ YES" : "❌ NO"}`);
    console.log(`   Document: ${r.docTitle}`);
    console.log(`   Preview: ${r.content.substring(0, 150).replace(/\n/g, " ")}...\n`);
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
