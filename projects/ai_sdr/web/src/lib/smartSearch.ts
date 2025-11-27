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
  const textResults = ragResults.map((result) => {
    const doc = documents.find((d) => d.id === result.documentId);
    return {
      content: result.content,
      score: result.score,
      documentId: result.documentId,
      mediaAssetId: doc?.mediaAssetId || undefined,
    };
  });

  // 5. Extract linked visuals from RAG results
  const linkedVisuals = documents
    .filter((d) => d.mediaAsset)
    .map((d) => ({
      type: d.mediaAsset!.type,
      url: d.mediaAsset!.url,
      title: d.mediaAsset!.title,
      description: d.mediaAsset!.description || undefined,
      thumbnail: d.mediaAsset!.thumbnail || undefined,
    }));

  console.log(`[SmartSearch] Found ${linkedVisuals.length} linked visuals from RAG`);

  // 6. Search visual media directly (if requested)
  let visualResults: any[] = [];
  if (includeVisuals) {
    visualResults = await searchMediaAssets({
      companyId,
      query,
      limit: 3,
    });
    console.log(`[SmartSearch] Direct media search found ${visualResults.length} visuals`);
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

