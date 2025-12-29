import { intelligentSearch } from "./smartSearch";
import { prisma } from "./prisma";
import type { CompanyId } from "@/types/chat";

export interface UnifiedSearchResult {
  results: Array<{
    content: string;
    score: number;
    source: "tavus" | "your-rag" | "merged";
    documentId?: string;
    mediaAssetId?: string;
    pageNumber?: number;
    timestamp?: string;
  }>;
  linkedVisuals: Array<{
    type: string;
    url: string;
    title: string;
    description?: string;
    thumbnail?: string;
    timestamp?: string;
  }>;
  visualResults: Array<{
    type: string;
    url: string;
    title: string;
    description?: string;
    thumbnail?: string;
  }>;
  metadata: {
    tavusResults: number;
    ragResults: number;
    latency: number;
    strategy: string;
  };
}

interface TavusSearchResult {
  content: string;
  score: number;
  source?: string;
}

/**
 * Search Tavus Knowledge Base
 * Uses the Tavus client library for proper API integration
 */
async function searchTavusKB(
  companyId: string,
  query: string,
  limit: number
): Promise<TavusSearchResult[]> {
  // Check if company has Tavus KB enabled
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { useTavusKB: true, tavusReplicaId: true },
  });

  if (!company?.useTavusKB || !company.tavusReplicaId) {
    console.log(`[HybridSearch] Tavus KB not enabled for company ${companyId}`);
    return [];
  }

  try {
    const { getTavusClient } = await import("./tavus");
    const tavusClient = getTavusClient();

    if (!tavusClient) {
      console.warn("[HybridSearch] Tavus client not available (TAVUS_API_KEY not set)");
      return [];
    }

    // Use Tavus client to search knowledge base
    const results = await tavusClient.searchKnowledgeBase(
      company.tavusReplicaId,
      query,
      { limit }
    );

    return results.map((r) => ({
      content: r.content,
      score: r.score,
      source: r.source || "tavus",
    }));
  } catch (error) {
    console.error("[HybridSearch] Tavus search error:", error);
    // Fail gracefully - return empty array so your RAG can still work
    return [];
  }
}

/**
 * Search Your Multimodal RAG
 */
async function searchYourRAG(
  companyId: string,
  query: string,
  limit: number
): Promise<{
  textResults: Array<{
    content: string;
    score: number;
    documentId: string;
    mediaAssetId?: string;
    pageNumber?: number;
    timestamp?: string;
  }>;
  linkedVisuals: Array<any>;
  visualResults: Array<any>;
}> {
  // Use your existing intelligentSearch
  const results = await intelligentSearch(companyId, query, {
    includeVisuals: true,
    limit,
  });

  return {
    textResults: results.textResults,
    linkedVisuals: results.linkedVisuals,
    visualResults: results.visualResults,
  };
}

/**
 * Remove duplicate or very similar results
 */
function deduplicateResults(
  results: Array<{
    content: string;
    score: number;
    source: string;
    documentId?: string;
    mediaAssetId?: string;
    pageNumber?: number;
  }>
): Array<{
  content: string;
  score: number;
  source: string;
  documentId?: string;
  mediaAssetId?: string;
  pageNumber?: number;
}> {
  const seen = new Set<string>();
  const unique: typeof results = [];

  for (const result of results) {
    // Create a simple hash of the content (first 150 chars, normalized)
    const normalized = result.content
      .substring(0, 150)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");

    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(result);
    }
  }

  return unique;
}

/**
 * Merge results from both knowledge bases and rank by relevance
 */
function mergeAndRankResults(
  tavusResults: TavusSearchResult[],
  ragResults: {
    textResults: Array<{
      content: string;
      score: number;
      documentId: string;
      mediaAssetId?: string;
      timestamp?: string;
    }>;
    linkedVisuals: Array<any>;
    visualResults: Array<any>;
  },
  limit: number,
  tavusWeight: number = 0.5
): {
  results: Array<{
    content: string;
    score: number;
    source: "tavus" | "your-rag" | "merged";
    documentId?: string;
    mediaAssetId?: string;
    timestamp?: string;
  }>;
  linkedVisuals: Array<any>;
  visualResults: Array<any>;
} {
  // Combine all results
  const allResults = [
    ...tavusResults.map((r) => ({
      content: r.content,
      score: r.score * tavusWeight, // Apply weight to Tavus results
      source: "tavus" as const,
      documentId: undefined,
      mediaAssetId: undefined,
      timestamp: undefined,
    })),
    ...ragResults.textResults.map((r) => ({
      content: r.content,
      score: r.score * (1 - tavusWeight), // Apply weight to RAG results
      source: "your-rag" as const,
      documentId: r.documentId,
      mediaAssetId: r.mediaAssetId,
      pageNumber: r.pageNumber,
      timestamp: r.timestamp,
    })),
  ];

  // Deduplicate similar content
  const uniqueResults = deduplicateResults(allResults);

  // Sort by score (highest first)
  uniqueResults.sort((a, b) => b.score - a.score);

  // Take top N
  const topResults = uniqueResults.slice(0, limit);

  return {
    results: topResults.map(r => ({
      ...r,
      pageNumber: (r as any).pageNumber, // Preserve pageNumber from RAG results
    })),
    linkedVisuals: ragResults.linkedVisuals, // Only from your RAG
    visualResults: ragResults.visualResults, // Only from your RAG
  };
}

/**
 * Smart routing: Determine if query needs multimodal RAG
 */
function shouldUseMultimodalRAG(query: string): boolean {
  const multimodalKeywords = [
    "show",
    "display",
    "see",
    "look",
    "video",
    "image",
    "screenshot",
    "chart",
    "dashboard",
    "visual",
    "demo",
    "picture",
    "graph",
    "diagram",
  ];

  const lowerQuery = query.toLowerCase();
  return multimodalKeywords.some((keyword) => lowerQuery.includes(keyword));
}

/**
 * Main hybrid search function
 */
export async function hybridSearch(
  companyId: CompanyId,
  query: string,
  options?: {
    limit?: number;
    preferFast?: boolean;
  }
): Promise<UnifiedSearchResult> {
  const { limit = 5, preferFast = false } = options || {};
  const startTime = Date.now();

  // Get company configuration
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      useTavusKB: true,
      searchStrategy: true,
      tavusKBWeight: true,
      tavusReplicaId: true,
    },
  });

  const useTavus = company?.useTavusKB ?? false;
  const strategy = company?.searchStrategy || "parallel";
  const tavusWeight = company?.tavusKBWeight ?? 0.5;

  // If Tavus not enabled, only use your RAG
  if (!useTavus || preferFast) {
    if (preferFast && useTavus) {
      // Fast mode: only Tavus
      const tavusResults = await searchTavusKB(companyId, query, limit);
      const latency = Date.now() - startTime;

      return {
        results: tavusResults.map((r) => ({
          content: r.content,
          score: r.score,
          source: "tavus" as const,
        })),
        linkedVisuals: [],
        visualResults: [],
        metadata: {
          tavusResults: tavusResults.length,
          ragResults: 0,
          latency,
          strategy: "fast-tavus-only",
        },
      };
    }

    // Only your RAG
    const ragResults = await searchYourRAG(companyId, query, limit);
    const latency = Date.now() - startTime;

    return {
      results: ragResults.textResults.map((r) => ({
        content: r.content,
        score: r.score,
        source: "your-rag" as const,
        documentId: r.documentId,
        mediaAssetId: r.mediaAssetId,
        pageNumber: r.pageNumber,
        timestamp: r.timestamp,
      })),
      linkedVisuals: ragResults.linkedVisuals,
      visualResults: ragResults.visualResults,
      metadata: {
        tavusResults: 0,
        ragResults: ragResults.textResults.length,
        latency,
        strategy: "your-rag-only",
      },
    };
  }

  // Determine strategy
  let finalStrategy = strategy;
  if (strategy === "smart") {
    // Smart routing based on query
    if (shouldUseMultimodalRAG(query)) {
      finalStrategy = "your-rag-only";
    } else {
      finalStrategy = "fallback";
    }
  }

  // Execute based on strategy
  if (finalStrategy === "your-rag-only") {
    const ragResults = await searchYourRAG(companyId, query, limit);
    const latency = Date.now() - startTime;

    return {
      results: ragResults.textResults.map((r) => ({
        content: r.content,
        score: r.score,
        source: "your-rag" as const,
        documentId: r.documentId,
        mediaAssetId: r.mediaAssetId,
        pageNumber: r.pageNumber,
        timestamp: r.timestamp,
      })),
      linkedVisuals: ragResults.linkedVisuals,
      visualResults: ragResults.visualResults,
      metadata: {
        tavusResults: 0,
        ragResults: ragResults.textResults.length,
        latency,
        strategy: "your-rag-only",
      },
    };
  }

  if (finalStrategy === "fallback") {
    // Try Tavus first, fallback to RAG
    const tavusResults = await searchTavusKB(companyId, query, limit);
    const hasGoodResults =
      tavusResults.length > 0 && tavusResults[0].score > 0.6;

    if (hasGoodResults) {
      const latency = Date.now() - startTime;
      return {
        results: tavusResults.map((r) => ({
          content: r.content,
          score: r.score,
          source: "tavus" as const,
        })),
        linkedVisuals: [],
        visualResults: [],
        metadata: {
          tavusResults: tavusResults.length,
          ragResults: 0,
          latency,
          strategy: "fallback-tavus",
        },
      };
    }

    // Fallback to RAG
    const ragResults = await searchYourRAG(companyId, query, limit);
    const latency = Date.now() - startTime;

    return {
      results: ragResults.textResults.map((r) => ({
        content: r.content,
        score: r.score,
        source: "your-rag" as const,
        documentId: r.documentId,
        mediaAssetId: r.mediaAssetId,
        pageNumber: r.pageNumber,
        timestamp: r.timestamp,
      })),
      linkedVisuals: ragResults.linkedVisuals,
      visualResults: ragResults.visualResults,
      metadata: {
        tavusResults: tavusResults.length,
        ragResults: ragResults.textResults.length,
        latency,
        strategy: "fallback-rag",
      },
    };
  }

  // Default: Parallel search (search both and merge)
  const [tavusResults, ragResults] = await Promise.all([
    searchTavusKB(companyId, query, limit * 2), // Get more, will merge
    searchYourRAG(companyId, query, limit * 2),
  ]);

  // Merge and rank
  const merged = mergeAndRankResults(
    tavusResults,
    ragResults,
    limit,
    tavusWeight
  );

  const latency = Date.now() - startTime;

  return {
    results: merged.results,
    linkedVisuals: merged.linkedVisuals,
    visualResults: merged.visualResults,
    metadata: {
      tavusResults: tavusResults.length,
      ragResults: ragResults.textResults.length,
      latency,
      strategy: "parallel",
    },
  };
}

