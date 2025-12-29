import { searchKnowledge } from "./rag";
import { searchMediaAssets } from "./media";
import { prisma } from "./prisma";
import type { CompanyId } from "@/types/chat";

export interface SmartSearchResult {
  textResults: Array<{
    content: string;
    score: number;
    documentId: string;
    mediaAssetId?: string;
    pageNumber?: number;
    timestamp?: string;
  }>;
  visualResults: Array<{
    type: string;
    url: string;
    title: string;
    description?: string;
    thumbnail?: string;
  }>;
  linkedVisuals: Array<{
    type: string;
    url: string;
    title: string;
    description?: string;
    timestamp?: string;
  }>;
}

/**
 * Intelligent search that combines RAG knowledge base with visual media assets
 */
export async function intelligentSearch(
  companyId: CompanyId,
  query: string,
  options?: {
    includeVisuals?: boolean;
    limit?: number;
  }
): Promise<SmartSearchResult> {
  const { includeVisuals = true, limit = 5 } = options || {};

  console.log(`[SmartSearch] Searching for: "${query}" in company ${companyId}`);

  // 1. Search RAG knowledge base
  const ragResults = await searchKnowledge({
    companyId,
    query,
    limit,
  });

  console.log(`[SmartSearch] RAG found ${ragResults.length} text results`);

  // 2. Extract document IDs from RAG results
  const documentIds = ragResults.map((r) => r.documentId);

  // 3. Fetch documents to get mediaAssetId links
  const documents = await prisma.document.findMany({
    where: {
      id: { in: documentIds },
    },
    select: {
      id: true,
      mediaAssetId: true,
      mediaAsset: {
        select: {
          id: true,
          type: true,
          url: true,
          title: true,
          description: true,
          thumbnail: true,
        },
      },
    },
  });

  // 4. Build text results with metadata
  // IMPORTANT: Only use mediaAssetId from result (rag.ts already resolved PDFs to slides or set to undefined)
  // Do NOT fall back to document's mediaAssetId - if rag.ts set it to undefined, it means we can't resolve to a specific slide
  const textResults = ragResults.map((result) => {
    // Use mediaAssetId from result only - rag.ts has already handled PDF->slide resolution
    // If result.mediaAssetId is undefined, it means we intentionally couldn't resolve it (no pageNumber)
    const mediaAssetId = result.mediaAssetId || undefined; // Don't fall back to document's PDF ID
    return {
      content: result.content,
      score: result.score,
      documentId: result.documentId,
      mediaAssetId,
      pageNumber: result.pageNumber, // Include page number if available
    };
  });

  // 5. Extract linked visuals from RAG results
  // IMPORTANT: Only include visuals that are NOT PDFs (PDFs should be resolved to slides in rag.ts)
  // Also prefer mediaAssetId from chunk metadata (more specific) over document's mediaAssetId
  const linkedVisuals: Array<{
    type: string;
    url: string;
    title: string;
    description?: string;
    thumbnail?: string;
  }> = [];
  
  // Use mediaAssetIds from RAG results (which should already be resolved to slides)
  const mediaAssetIdsFromRAG = new Set(ragResults
    .filter(r => r.mediaAssetId) // Only results with mediaAssetId
    .map(r => r.mediaAssetId!));
  
  if (mediaAssetIdsFromRAG.size > 0) {
    const assets = await prisma.mediaAsset.findMany({
      where: {
        id: { in: Array.from(mediaAssetIdsFromRAG) },
        companyId,
      },
      select: {
        id: true,
        type: true,
        url: true,
        title: true,
        description: true,
        thumbnail: true,
      },
    });
    
    // Filter out PDFs - only include slides, images, etc.
    linkedVisuals.push(...assets
      .filter(a => a.type !== "pdf")
      .map(a => ({
        type: a.type,
        url: a.url,
        title: a.title,
        description: a.description || undefined,
        thumbnail: a.thumbnail || undefined,
      })));
  }

  console.log(`[SmartSearch] Found ${linkedVisuals.length} linked visuals from RAG (PDFs filtered out)`);

  // 6. Search visual media directly (if requested)
  // IMPORTANT: Only use direct media search if RAG didn't find any linked visuals
  // This prevents showing irrelevant fallback visuals when the query doesn't match anything
  let visualResults: any[] = [];
  if (includeVisuals && linkedVisuals.length === 0) {
    // Only search directly if we have no linked visuals from RAG
    // This ensures we only show visuals that are actually relevant to the search results
    console.log(`[SmartSearch] No linked visuals from RAG, skipping direct media search to avoid irrelevant results`);
    // Don't do direct media search - it would return generic results that don't match the query
  }

  return {
    textResults,
    visualResults,
    linkedVisuals,
  };
}

/**
 * Search specifically for content with visual proof
 */
export async function searchWithVisuals(
  companyId: CompanyId,
  query: string
): Promise<{
  answer: string;
  visuals: Array<{
    type: string;
    url: string;
    title: string;
    timestamp?: string;
  }>;
}> {
  const results = await intelligentSearch(companyId, query);

  // Combine all unique visuals
  const allVisuals = [
    ...results.linkedVisuals,
    ...results.visualResults,
  ];

  // Deduplicate by URL
  const uniqueVisuals = Array.from(
    new Map(allVisuals.map((v) => [v.url, v])).values()
  );

  // Build answer from top text results
  const answer = results.textResults
    .slice(0, 3)
    .map((r) => r.content)
    .join("\n\n");

  return {
    answer,
    visuals: uniqueVisuals.slice(0, 5),
  };
}

