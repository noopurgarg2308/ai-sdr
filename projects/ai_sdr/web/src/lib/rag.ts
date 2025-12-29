import type { CompanyId } from "@/types/chat";
import { prisma } from "./prisma";
import { openai } from "./openai";
import type { Document } from "@prisma/client";

// Cache for PDF-to-slide lookups to avoid repeated queries
const slideCache = new Map<string, Map<number, string>>(); // PDF ID -> (pageNumber -> slide ID)

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
  mediaAssetId?: string; // Link to source media asset (for slides, images, etc.)
  pageNumber?: number; // For PDF pages/slides
}): Promise<Document> {
  const { companyId, title, source, content, mediaAssetId, pageNumber } = options;
  
  console.log(`[RAG] Ingesting document "${title}" for company ${companyId}`);
  
  // Create the document
  const document = await prisma.document.create({
    data: {
      companyId,
      title,
      source: source || "manual",
      content,
      mediaAssetId: mediaAssetId || null,
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
  
  // Store chunks with embeddings and metadata linking to media asset
  await prisma.$transaction(
    chunks.map((chunkContent, index) =>
      prisma.chunk.create({
        data: {
          documentId: document.id,
          companyId,
          index,
          content: chunkContent,
          embedding: JSON.stringify(embeddings[index]),
          // Store metadata linking to media asset if available
          metadata: mediaAssetId ? JSON.stringify({
            sourceType: source === "ocr" ? "image" : source === "pdf_extract" ? "text" : source === "pdf_page_extract" ? "slide" : "text",
            mediaAssetId: mediaAssetId,
            pageNumber: pageNumber,
          }) : null,
        },
      })
    )
  );
  
  console.log(`[RAG] Successfully ingested ${chunks.length} chunks for document ${document.id}`);
  
  return document;
}

/**
 * Search knowledge base using semantic similarity
 * Returns chunks with linked media assets
 */
export async function searchKnowledge(options: {
  companyId: string;
  query: string;
  limit?: number;
}): Promise<Array<{
  content: string;
  score: number;
  documentId: string;
  mediaAssetId?: string;
  pageNumber?: number;
}>> {
  const { companyId, query, limit = 5 } = options;
  
  console.log(`[RAG] ========== STARTING SEARCH ==========`);
  console.log(`[RAG] Searching knowledge for company ${companyId}, query: "${query}"`);
  
  // Get embedding for the query
  const queryEmbeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  
  const queryEmbedding = queryEmbeddingResponse.data[0].embedding;
  
  // Extract query keywords for document matching
  const queryLower = query.toLowerCase();
  
  // First, try to find documents that match the query (e.g., "Q1 2024" -> Q1 2024 documents)
  let matchingDocumentIds: string[] = [];
  if (queryLower.includes("q1 2024")) {
    const q1Docs = await prisma.document.findMany({
      where: {
        companyId,
        title: { contains: "Q1 2024" },
      },
      select: { id: true },
      take: 10,
    });
    matchingDocumentIds = q1Docs.map(d => d.id);
  } else if (queryLower.includes("q2 2024")) {
    const q2Docs = await prisma.document.findMany({
      where: {
        companyId,
        title: { contains: "Q2 2024" },
      },
      select: { id: true },
      take: 10,
    });
    matchingDocumentIds = q2Docs.map(d => d.id);
  } else if (queryLower.includes("q3 2024")) {
    const q3Docs = await prisma.document.findMany({
      where: {
        companyId,
        title: { contains: "Q3 2024" },
      },
      select: { id: true },
      take: 10,
    });
    matchingDocumentIds = q3Docs.map(d => d.id);
  } else if (queryLower.includes("q4 2024")) {
    const q4Docs = await prisma.document.findMany({
      where: {
        companyId,
        title: { contains: "Q4 2024" },
      },
      select: { id: true },
      take: 10,
    });
    matchingDocumentIds = q4Docs.map(d => d.id);
  }
  
  // Fetch chunks: prioritize matching documents, then recent chunks
  // IMPORTANT: Fetch from both main PDF documents AND page-level documents
  // This ensures we consider all relevant content, not just main document chunks
  let chunks;
  if (matchingDocumentIds.length > 0) {
    // First get chunks from matching documents (both main PDF docs and page-level docs)
    const matchingChunks = await prisma.chunk.findMany({
      where: {
        companyId,
        documentId: { in: matchingDocumentIds },
      },
      take: 200,
      include: {
        document: {
          select: {
            id: true,
            mediaAssetId: true,
            title: true,
            source: true, // Include source to distinguish page-level vs main PDF
          },
        },
      },
    });
    
    // Also fetch page-level chunks from matching documents
    // This ensures we consider both main PDF document chunks AND page-level chunks
    // The semantic similarity will naturally determine which are more relevant
    const pageLevelDocs = await prisma.document.findMany({
      where: {
        companyId,
        source: { in: ["pdf_page_extract", "ocr"] }, // Page-level documents
        title: { contains: queryLower.includes("q1 2024") ? "Q1 2024" : 
                        queryLower.includes("q2 2024") ? "Q2 2024" :
                        queryLower.includes("q3 2024") ? "Q3 2024" :
                        queryLower.includes("q4 2024") ? "Q4 2024" : "" },
      },
      select: { id: true },
      take: 100, // Get more page-level documents to ensure we have candidates
    });
    
    const pageLevelDocIds = pageLevelDocs.map(d => d.id);
    const pageLevelChunks = pageLevelDocIds.length > 0 ? await prisma.chunk.findMany({
      where: {
        companyId,
        documentId: { in: pageLevelDocIds },
      },
      take: 200, // Get chunks from page-level documents
      include: {
        document: {
          select: {
            id: true,
            mediaAssetId: true,
            title: true,
            source: true,
          },
        },
      },
    }) : [];
    
    // Then get other recent chunks (excluding what we already fetched)
    const allFetchedDocIds = [...matchingDocumentIds, ...pageLevelDocIds];
    const otherChunks = await prisma.chunk.findMany({
      where: {
        companyId,
        documentId: { notIn: allFetchedDocIds },
      },
      take: 200, // Reduced from 300 since we're fetching more page-level chunks
      orderBy: { createdAt: "desc" },
      include: {
        document: {
          select: {
            id: true,
            mediaAssetId: true,
            title: true,
            source: true,
          },
        },
      },
    });
    
    // Combine all chunks - semantic similarity will determine ranking
    chunks = [...matchingChunks, ...pageLevelChunks, ...otherChunks];
  } else {
    // No matching documents, get chunks from all sources
    // Include both main PDF document chunks and page-level chunks
    // Semantic similarity will determine which are most relevant
    chunks = await prisma.chunk.findMany({
      where: { companyId },
      take: 500,
      orderBy: { createdAt: "desc" },
      include: {
        document: {
          select: {
            id: true,
            mediaAssetId: true,
            title: true,
            source: true,
          },
        },
      },
    });
  }
  
  if (chunks.length === 0) {
    console.log(`[RAG] No chunks found for company ${companyId}`);
    return [];
  }
  
  // Extract query keywords for boosting exact matches
  // Extract important keywords (numbers, quarters, years, key terms)
  const queryKeywords = queryLower
    .split(/\s+/)
    .filter(w => w.length > 1)
    .filter(w => !['the', 'a', 'an', 'in', 'on', 'at', 'for', 'were', 'what', 'airbnb'].includes(w));
  
  // First, build a map of PDF IDs to their slides (for chunks that need slide lookup)
  const pdfIdsNeedingSlides = new Set<string>();
  chunks.forEach(chunk => {
    const chunkMetadata = chunk.metadata ? JSON.parse(chunk.metadata) : {};
    const mediaAssetId = chunkMetadata.mediaAssetId || chunk.document.mediaAssetId;
    const pageNumber = chunkMetadata.pageNumber;
    if (mediaAssetId && pageNumber) {
      pdfIdsNeedingSlides.add(mediaAssetId);
    }
  });
  
  // Pre-fetch slide mappings for all PDFs that need them
  if (pdfIdsNeedingSlides.size > 0) {
    const pdfAssets = await prisma.mediaAsset.findMany({
      where: {
        id: { in: Array.from(pdfIdsNeedingSlides) },
        companyId,
        type: "pdf",
      },
      select: { id: true },
    });
    
    const pdfIds = new Set(pdfAssets.map(p => p.id));
    const allSlides = await prisma.mediaAsset.findMany({
      where: {
        companyId,
        type: "slide",
      },
      select: {
        id: true,
        metadata: true,
      },
      take: 1000,
    });
    
    // Build cache for all PDFs
    allSlides.forEach(slide => {
      if (!slide.metadata) return;
      try {
        const slideMetadata = JSON.parse(slide.metadata as string);
        if (slideMetadata.parentPdfId && pdfIds.has(slideMetadata.parentPdfId) && slideMetadata.pageNumber) {
          let pdfSlideMap = slideCache.get(slideMetadata.parentPdfId);
          if (!pdfSlideMap) {
            pdfSlideMap = new Map();
            slideCache.set(slideMetadata.parentPdfId, pdfSlideMap);
          }
          pdfSlideMap.set(slideMetadata.pageNumber, slide.id);
        }
      } catch {
        // Ignore invalid metadata
      }
    });
  }
  
  // Calculate similarity for each chunk
  const results = chunks.map((chunk) => {
    const chunkEmbedding = JSON.parse(chunk.embedding) as number[];
    let score = cosineSimilarity(queryEmbedding, chunkEmbedding);
    
    // Extract metadata early so we can use it later for slide resolution
    const chunkMetadata = chunk.metadata ? JSON.parse(chunk.metadata) : {};
    
    // Use pure semantic similarity - don't artificially boost chunks just because they have slides
    // Relevance should be determined by content similarity, not by whether they link to slides
    
    // Boost score if chunk contains exact query keywords
    const contentLower = chunk.content.toLowerCase();
    
    // Strong boost for exact phrase matches (e.g., "Q1 2024")
    if (queryLower.includes("q1 2024") && contentLower.includes("q1 2024")) {
      score += 0.3; // Strong boost for exact quarter match
    }
    if (queryLower.includes("q2 2024") && contentLower.includes("q2 2024")) {
      score += 0.3;
    }
    if (queryLower.includes("q3 2024") && contentLower.includes("q3 2024")) {
      score += 0.3;
    }
    if (queryLower.includes("q4 2024") && contentLower.includes("q4 2024")) {
      score += 0.3;
    }
    
    // Boost for keyword matches
    const keywordMatches = queryKeywords.filter(kw => contentLower.includes(kw)).length;
    if (keywordMatches > 0) {
      // Boost by up to 0.2 for keyword matches
      const boost = Math.min(0.2, (keywordMatches / queryKeywords.length) * 0.2);
      score += boost;
    }
    
    // Penalize if query asks for specific quarter but chunk mentions different quarter
    if (queryLower.includes("q1 2024") && !contentLower.includes("q1 2024")) {
      if (contentLower.includes("q2 2024") || contentLower.includes("q3 2024") || contentLower.includes("q4 2024")) {
        score -= 0.1; // Small penalty for wrong quarter
      }
    }
    
    // Strong boost if document title matches the query's quarter
    const docTitle = chunk.document.title.toLowerCase();
    if (queryLower.includes("q1 2024") && docTitle.includes("q1 2024")) {
      score += 0.4; // Very strong boost for matching document
    }
    if (queryLower.includes("q2 2024") && docTitle.includes("q2 2024")) {
      score += 0.4;
    }
    if (queryLower.includes("q3 2024") && docTitle.includes("q3 2024")) {
      score += 0.4;
    }
    if (queryLower.includes("q4 2024") && docTitle.includes("q4 2024")) {
      score += 0.4;
    }
    
    // Extract media asset info from chunk metadata or document (already parsed above)
    let mediaAssetId = chunkMetadata.mediaAssetId || chunk.document.mediaAssetId || undefined;
    const pageNumber = chunkMetadata.pageNumber || undefined;
    
    // If mediaAssetId points to a PDF and we have a pageNumber, find the specific slide from cache
    if (mediaAssetId && pageNumber) {
      const pdfSlideMap = slideCache.get(mediaAssetId);
      if (pdfSlideMap && pdfSlideMap.has(pageNumber)) {
        mediaAssetId = pdfSlideMap.get(pageNumber)!;
        console.log(`[RAG] Resolved PDF ${mediaAssetId} page ${pageNumber} to slide ${mediaAssetId}`);
      } else {
        console.log(`[RAG] WARNING: Could not resolve PDF ${mediaAssetId} page ${pageNumber} to slide (not in cache)`);
      }
    } else if (mediaAssetId && !pageNumber) {
      // If we have a PDF ID but no pageNumber, we can't determine which slide to show
      // Check if it's actually a PDF (we'll verify this later, but for now set to undefined)
      // This prevents returning PDF IDs that can't be resolved to slides
      console.log(`[RAG] Chunk has PDF mediaAssetId ${mediaAssetId} but no pageNumber - cannot resolve to specific slide`);
      // Don't return PDF ID if we can't resolve it to a slide
      mediaAssetId = undefined;
    }
    
    return {
      content: chunk.content,
      score,
      documentId: chunk.documentId,
      mediaAssetId,
      pageNumber,
    };
  });
  
  // Sort by similarity descending and return top N
  results.sort((a, b) => b.score - a.score);
  
  const topResults = results.slice(0, limit);
  console.log(`[RAG] ========== SEARCH RESULTS DEBUG ==========`);
  console.log(`[RAG] Query: "${query}"`);
  console.log(`[RAG] Found ${topResults.length} relevant chunks (top score: ${topResults[0]?.score.toFixed(3)})`);
  console.log(`[RAG] Top ${Math.min(5, topResults.length)} results:`);
  topResults.slice(0, 5).forEach((r, idx) => {
    console.log(`[RAG]   ${idx + 1}. Score: ${r.score.toFixed(3)}, mediaAssetId: ${r.mediaAssetId || 'none'}, pageNumber: ${r.pageNumber || 'none'}`);
    console.log(`[RAG]      Content preview: ${r.content.substring(0, 150)}...`);
  });
  
  // Log which results have linked media assets
  const withMedia = topResults.filter(r => r.mediaAssetId);
  if (withMedia.length > 0) {
    console.log(`[RAG] ${withMedia.length} results have linked media assets`);
    console.log(`[RAG] Media asset IDs from top results:`, withMedia.map(r => ({ mediaAssetId: r.mediaAssetId, pageNumber: r.pageNumber })));
  } else {
    console.log(`[RAG] WARNING: No results have linked media assets!`);
  }
  console.log(`[RAG] ==========================================`);
  
  return topResults;
}

