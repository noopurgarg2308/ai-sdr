import type { CompanyId } from "@/types/chat";
import { prisma } from "./prisma";
import { openai } from "./openai";
import type { Document } from "@prisma/client";

// Chunking configuration
const CHUNK_SIZE = 800; // ~800 words
const CHUNK_OVERLAP = 200; // ~200 words overlap

/**
 * Split text into overlapping chunks based on word count
 */
export function chunkText(text: string): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(" ");
    chunks.push(chunk);
    
    // Move forward by (CHUNK_SIZE - CHUNK_OVERLAP) to create overlap
    i += CHUNK_SIZE - CHUNK_OVERLAP;
    
    // Break if we're at the end
    if (i >= words.length) break;
  }
  
  return chunks;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }
  
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

/**
 * Ingest a company document: create Document, chunk text, embed chunks, and store
 */
export async function ingestCompanyDoc(options: {
  companyId: string;
  title: string;
  source?: string;
  content: string;
}): Promise<Document> {
  const { companyId, title, source, content } = options;
  
  console.log(`[RAG] Ingesting document "${title}" for company ${companyId}`);
  
  // Create the document
  const document = await prisma.document.create({
    data: {
      companyId,
      title,
      source: source || "manual",
      content,
    },
  });
  
  // Chunk the text
  const chunks = chunkText(content);
  console.log(`[RAG] Created ${chunks.length} chunks`);
  
  // Get embeddings for all chunks in batch
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: chunks,
  });
  
  const embeddings = embeddingResponse.data.map((item) => item.embedding);
  
  // Store chunks with embeddings in a transaction
  await prisma.$transaction(
    chunks.map((chunkContent, index) =>
      prisma.chunk.create({
        data: {
          documentId: document.id,
          companyId,
          index,
          content: chunkContent,
          embedding: JSON.stringify(embeddings[index]),
        },
      })
    )
  );
  
  console.log(`[RAG] Successfully ingested ${chunks.length} chunks for document ${document.id}`);
  
  return document;
}

/**
 * Search knowledge base using semantic similarity
 */
export async function searchKnowledge(options: {
  companyId: string;
  query: string;
  limit?: number;
}): Promise<{ content: string; score: number; documentId: string }[]> {
  const { companyId, query, limit = 5 } = options;
  
  console.log(`[RAG] Searching knowledge for company ${companyId}, query: "${query}"`);
  
  // Get embedding for the query
  const queryEmbeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  
  const queryEmbedding = queryEmbeddingResponse.data[0].embedding;
  
  // Fetch chunks for this company (limit to 200 for performance)
  const chunks = await prisma.chunk.findMany({
    where: { companyId },
    take: 200,
    orderBy: { createdAt: "desc" },
  });
  
  if (chunks.length === 0) {
    console.log(`[RAG] No chunks found for company ${companyId}`);
    return [];
  }
  
  // Calculate similarity for each chunk
  const results = chunks.map((chunk) => {
    const chunkEmbedding = JSON.parse(chunk.embedding) as number[];
    const score = cosineSimilarity(queryEmbedding, chunkEmbedding);
    
    return {
      content: chunk.content,
      score,
      documentId: chunk.documentId,
    };
  });
  
  // Sort by similarity descending and return top N
  results.sort((a, b) => b.score - a.score);
  
  const topResults = results.slice(0, limit);
  console.log(`[RAG] Found ${topResults.length} relevant chunks (top score: ${topResults[0]?.score.toFixed(3)})`);
  
  return topResults;
}

