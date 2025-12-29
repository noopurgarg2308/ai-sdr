# Hybrid RAG Architecture: Tavus + Your Multimodal RAG

## The Challenge

With a hybrid approach, you have **two knowledge bases**:
1. **Tavus Knowledge Base** - Text documents (PDFs, TXTs, etc.) - Fast (30ms)
2. **Your Multimodal RAG** - Text + OCR from images + Video transcripts + Frame analysis

**Question:** How does the system know where to search, or should it search both and merge?

---

## Solution: Unified Search Interface

Create a **unified search layer** that intelligently queries both knowledge bases and merges results.

### Architecture Overview

```
┌─────────────────────────────────────────┐
│  Tavus CVI (Video Avatar)                │
│  - Calls search_knowledge() function     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Unified Search Interface                │
│  (search_knowledge wrapper)              │
│  ├─ Analyzes query type                 │
│  ├─ Routes to appropriate KB(s)         │
│  ├─ Searches both in parallel           │
│  └─ Merges & ranks results              │
└─────────────────────────────────────────┘
    ↓                    ↓
┌─────────────┐    ┌─────────────┐
│ Tavus KB    │    │ Your RAG    │
│ (Text docs) │    │ (Multimodal)│
│ ~30ms       │    │ ~200-500ms  │
└─────────────┘    └─────────────┘
```

---

## Implementation Strategy

### Option 1: Parallel Search + Merge (Recommended)

**Search both knowledge bases in parallel, then merge results by relevance.**

**Benefits:**
- ✅ Fastest overall (parallel execution)
- ✅ Most comprehensive results
- ✅ No routing logic needed
- ✅ Best user experience

**Flow:**
```typescript
User Query: "Tell me about pricing"
  ↓
Parallel Search:
  ├─ Tavus KB: Search text documents (30ms)
  └─ Your RAG: Search multimodal (200ms)
  ↓
Merge Results:
  ├─ Combine by relevance score
  ├─ Deduplicate similar content
  ├─ Rank by score
  └─ Return top N results
```

**Implementation:**
```typescript
// src/lib/hybridSearch.ts
export async function hybridSearch(
  companyId: string,
  query: string,
  options?: {
    limit?: number;
    preferFast?: boolean; // Use Tavus only if true
  }
): Promise<UnifiedSearchResult> {
  const { limit = 5, preferFast = false } = options || {};

  // If preferFast, only use Tavus (for simple text queries)
  if (preferFast) {
    return await searchTavusOnly(companyId, query, limit);
  }

  // Otherwise, search both in parallel
  const [tavusResults, ragResults] = await Promise.all([
    searchTavusKB(companyId, query, limit * 2), // Get more, will merge
    searchYourRAG(companyId, query, limit * 2),
  ]);

  // Merge and rank
  return mergeAndRankResults(tavusResults, ragResults, limit);
}
```

---

### Option 2: Smart Routing

**Analyze query to determine which KB to use, with fallback.**

**Benefits:**
- ✅ Faster for simple queries (only search Tavus)
- ✅ Lower cost (don't search both unnecessarily)
- ✅ More efficient

**Flow:**
```typescript
User Query: "Tell me about pricing"
  ↓
Analyze Query:
  ├─ Contains "show", "display", "video", "image"? 
  │  → Route to Your RAG (multimodal)
  ├─ Simple text question?
  │  → Route to Tavus KB (fast)
  └─ Complex or unclear?
     → Search both
  ↓
Return Results
```

**Implementation:**
```typescript
function shouldUseMultimodalRAG(query: string): boolean {
  const multimodalKeywords = [
    'show', 'display', 'see', 'look', 'video', 'image', 
    'screenshot', 'chart', 'dashboard', 'visual', 'demo'
  ];
  
  const lowerQuery = query.toLowerCase();
  return multimodalKeywords.some(keyword => lowerQuery.includes(keyword));
}

export async function smartHybridSearch(
  companyId: string,
  query: string,
  limit: number = 5
): Promise<UnifiedSearchResult> {
  // Determine which KB to use
  if (shouldUseMultimodalRAG(query)) {
    // Use your RAG for multimodal queries
    return await searchYourRAG(companyId, query, limit);
  }
  
  // For simple text queries, try Tavus first
  const tavusResults = await searchTavusKB(companyId, query, limit);
  
  // If Tavus has good results (score > 0.7), use them
  if (tavusResults.length > 0 && tavusResults[0].score > 0.7) {
    return tavusResults;
  }
  
  // Otherwise, fallback to your RAG or search both
  const ragResults = await searchYourRAG(companyId, query, limit);
  return mergeAndRankResults(tavusResults, ragResults, limit);
}
```

---

### Option 3: Fallback Chain

**Try Tavus first (fast), fallback to your RAG if needed.**

**Benefits:**
- ✅ Fast for common queries
- ✅ Comprehensive for complex queries
- ✅ Cost-effective

**Flow:**
```typescript
User Query: "Tell me about pricing"
  ↓
Step 1: Search Tavus KB (30ms)
  ├─ Good results? (score > 0.6)
  │  → Return Tavus results
  └─ Poor results? (score < 0.6)
     ↓
Step 2: Search Your RAG (200ms)
  └─ Return RAG results (or merge both)
```

**Implementation:**
```typescript
export async function fallbackHybridSearch(
  companyId: string,
  query: string,
  limit: number = 5
): Promise<UnifiedSearchResult> {
  // Try Tavus first (fast)
  const tavusResults = await searchTavusKB(companyId, query, limit);
  
  // Check if results are good enough
  const hasGoodResults = tavusResults.length > 0 && 
                         tavusResults[0].score > 0.6;
  
  if (hasGoodResults) {
    return {
      results: tavusResults,
      source: 'tavus',
      latency: 30,
    };
  }
  
  // Fallback to your RAG
  const ragResults = await searchYourRAG(companyId, query, limit);
  
  return {
    results: ragResults,
    source: ragResults.length > 0 ? 'your-rag' : 'none',
    latency: 200,
  };
}
```

---

## Recommended Implementation: Option 1 (Parallel + Merge)

### Why Parallel + Merge?

1. **Best User Experience** - Always get the most relevant results
2. **No Routing Logic** - Simpler, less error-prone
3. **Fast Enough** - Parallel execution means total time ≈ max(Tavus, Your RAG) ≈ 200-500ms
4. **Comprehensive** - Never miss relevant content

### Code Implementation

```typescript
// src/lib/hybridSearch.ts

import { searchKnowledge } from './rag';
import { intelligentSearch } from './smartSearch';
import type { CompanyId } from '@/types/chat';

export interface UnifiedSearchResult {
  results: Array<{
    content: string;
    score: number;
    source: 'tavus' | 'your-rag' | 'merged';
    mediaAssetId?: string;
    timestamp?: string;
  }>;
  linkedVisuals: Array<{
    type: string;
    url: string;
    title: string;
    timestamp?: string;
  }>;
  metadata: {
    tavusResults: number;
    ragResults: number;
    latency: number;
  };
}

/**
 * Search Tavus Knowledge Base
 */
async function searchTavusKB(
  companyId: string,
  query: string,
  limit: number
): Promise<Array<{ content: string; score: number }>> {
  // TODO: Implement Tavus API call
  // This is a placeholder - you'll need to integrate Tavus SDK
  
  try {
    // Example Tavus API call (adjust based on actual API)
    const response = await fetch('https://api.tavus.io/v1/knowledge/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TAVUS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId, // or replicaId
        query,
        limit,
      }),
    });
    
    const data = await response.json();
    
    return data.results.map((r: any) => ({
      content: r.content || r.text,
      score: r.score || r.relevance || 0.8, // Tavus may not return scores
    }));
  } catch (error) {
    console.error('[HybridSearch] Tavus search error:', error);
    return []; // Fail gracefully
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
  textResults: Array<{ content: string; score: number; mediaAssetId?: string }>;
  linkedVisuals: Array<any>;
}> {
  // Use your existing intelligentSearch
  const results = await intelligentSearch(companyId, query, {
    includeVisuals: true,
    limit,
  });
  
  return {
    textResults: results.textResults,
    linkedVisuals: results.linkedVisuals,
  };
}

/**
 * Merge results from both knowledge bases and rank by relevance
 */
function mergeAndRankResults(
  tavusResults: Array<{ content: string; score: number }>,
  ragResults: {
    textResults: Array<{ content: string; score: number; mediaAssetId?: string }>;
    linkedVisuals: Array<any>;
  },
  limit: number
): UnifiedSearchResult {
  // Combine all results
  const allResults = [
    ...tavusResults.map(r => ({
      ...r,
      source: 'tavus' as const,
      mediaAssetId: undefined,
    })),
    ...ragResults.textResults.map(r => ({
      ...r,
      source: 'your-rag' as const,
    })),
  ];
  
  // Deduplicate similar content (simple approach)
  const uniqueResults = deduplicateResults(allResults);
  
  // Sort by score (highest first)
  uniqueResults.sort((a, b) => b.score - a.score);
  
  // Take top N
  const topResults = uniqueResults.slice(0, limit);
  
  return {
    results: topResults,
    linkedVisuals: ragResults.linkedVisuals, // Only from your RAG
    metadata: {
      tavusResults: tavusResults.length,
      ragResults: ragResults.textResults.length,
      latency: 0, // Will be set by caller
    },
  };
}

/**
 * Remove duplicate or very similar results
 */
function deduplicateResults(
  results: Array<{ content: string; score: number; source: string }>
): Array<{ content: string; score: number; source: string }> {
  const seen = new Set<string>();
  const unique: typeof results = [];
  
  for (const result of results) {
    // Create a simple hash of the content (first 100 chars)
    const hash = result.content.substring(0, 100).toLowerCase().trim();
    
    if (!seen.has(hash)) {
      seen.add(hash);
      unique.push(result);
    }
  }
  
  return unique;
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
  
  // If preferFast, only use Tavus (for simple text queries)
  if (preferFast) {
    const tavusResults = await searchTavusKB(companyId, query, limit);
    return {
      results: tavusResults.map(r => ({
        ...r,
        source: 'tavus' as const,
      })),
      linkedVisuals: [],
      metadata: {
        tavusResults: tavusResults.length,
        ragResults: 0,
        latency: Date.now() - startTime,
      },
    };
  }
  
  // Search both in parallel
  const [tavusResults, ragResults] = await Promise.all([
    searchTavusKB(companyId, query, limit * 2), // Get more, will merge
    searchYourRAG(companyId, query, limit * 2),
  ]);
  
  // Merge and rank
  const merged = mergeAndRankResults(tavusResults, ragResults, limit);
  
  // Add latency
  merged.metadata.latency = Date.now() - startTime;
  
  return merged;
}
```

### Update Your Tool Dispatcher

```typescript
// src/lib/tools.ts

import { hybridSearch } from './hybridSearch';

export async function dispatchToolCall(
  companyId: CompanyId,
  name: string,
  args: any
): Promise<any> {
  switch (name) {
    case "search_knowledge": {
      // Use hybrid search instead of just intelligentSearch
      const results = await hybridSearch(companyId, args.query, {
        limit: 5,
        preferFast: false, // Always search both for comprehensive results
      });
      
      return {
        results: results.results.map((r) => ({
          content: r.content,
          score: r.score,
          source: r.source, // Indicates which KB it came from
        })),
        linkedVisuals: results.linkedVisuals,
        metadata: results.metadata,
      };
    }
    // ... other tools
  }
}
```

---

## Data Flow Example

### Example 1: Simple Text Query

```
User: "What is Hypersonix?"
  ↓
Parallel Search:
  ├─ Tavus KB: Finds product description (score: 0.85)
  └─ Your RAG: Finds product summary (score: 0.82)
  ↓
Merge:
  ├─ Both results similar, keep highest score
  ├─ Deduplicate
  └─ Return: Tavus result (score: 0.85)
  ↓
Response: "Hypersonix is an AI-powered revenue intelligence platform..."
```

### Example 2: Multimodal Query

```
User: "Show me the pricing dashboard"
  ↓
Parallel Search:
  ├─ Tavus KB: Finds text about pricing (score: 0.65)
  └─ Your RAG: Finds OCR text from dashboard.png (score: 0.92)
       + Links to dashboard.png image
  ↓
Merge:
  ├─ Your RAG result is much better (0.92 vs 0.65)
  ├─ Includes linked visual asset
  └─ Return: Your RAG result + dashboard.png
  ↓
Response: "Our pricing dashboard shows..." [displays dashboard.png]
```

### Example 3: Video Query

```
User: "How does pricing optimization work?"
  ↓
Parallel Search:
  ├─ Tavus KB: Finds text docs about pricing (score: 0.70)
  └─ Your RAG: Finds video transcript at 2:30 (score: 0.88)
       + Links to demo video with timestamp
  ↓
Merge:
  ├─ Your RAG result is better
  ├─ Includes video with timestamp
  └─ Return: Your RAG result + video at 2:30
  ↓
Response: "Pricing optimization uses AI..." [shows video starting at 2:30]
```

---

## Configuration Options

### Per-Company Configuration

```typescript
// prisma/schema.prisma
model Company {
  // ... existing fields
  tavusReplicaId    String?
  useTavusKB        Boolean  @default(true)
  searchStrategy    String   @default("parallel") // "parallel" | "smart" | "fallback"
  tavusKBWeight     Float    @default(0.5) // Weight for Tavus results in merge
}
```

### Search Strategy Selection

```typescript
export async function hybridSearch(
  companyId: CompanyId,
  query: string,
  options?: { limit?: number }
): Promise<UnifiedSearchResult> {
  // Get company config
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { searchStrategy: true, useTavusKB: true },
  });
  
  const strategy = company?.searchStrategy || 'parallel';
  const useTavus = company?.useTavusKB ?? true;
  
  if (!useTavus) {
    // Only use your RAG
    return await searchYourRAG(companyId, query, options?.limit || 5);
  }
  
  switch (strategy) {
    case 'parallel':
      return await parallelSearch(companyId, query, options);
    case 'smart':
      return await smartRoutingSearch(companyId, query, options);
    case 'fallback':
      return await fallbackSearch(companyId, query, options);
    default:
      return await parallelSearch(companyId, query, options);
  }
}
```

---

## Performance Considerations

### Latency Comparison

| Strategy | Simple Query | Complex Query | Multimodal Query |
|----------|-------------|--------------|------------------|
| **Parallel** | ~200ms | ~500ms | ~500ms |
| **Smart Routing** | ~30ms | ~500ms | ~500ms |
| **Fallback** | ~30ms | ~230ms | ~500ms |

### Cost Considerations

- **Parallel**: Searches both KBs every time (higher cost)
- **Smart Routing**: Only searches needed KB (lower cost)
- **Fallback**: Usually just Tavus (lowest cost)

### Recommendation

**Start with Parallel Search** because:
1. Best user experience (most comprehensive)
2. Latency is acceptable (~200-500ms)
3. Can optimize later based on usage patterns
4. Can add smart routing for specific query types later

---

## Migration Path

### Phase 1: Keep Your RAG Only
- Continue using `intelligentSearch` as-is
- No changes needed

### Phase 2: Add Tavus Integration
- Implement `searchTavusKB` function
- Add Tavus API credentials
- Test Tavus search independently

### Phase 3: Implement Hybrid Search
- Create `hybridSearch` wrapper
- Update `dispatchToolCall` to use hybrid search
- Test with real queries

### Phase 4: Optimize
- Add smart routing for common query patterns
- Monitor performance and costs
- Adjust strategy based on data

---

## Summary

**Answer to your question:**

> "How does the system know where to search, or will it search both knowledge bases and then merge the results?"

**Recommended Approach: Search Both and Merge**

1. **Search both knowledge bases in parallel** (Tavus + Your RAG)
2. **Merge results** by relevance score
3. **Deduplicate** similar content
4. **Rank** by score and return top N results
5. **Include linked visuals** from your RAG (images, videos with timestamps)

**Benefits:**
- ✅ Always get the most relevant results
- ✅ No complex routing logic
- ✅ Fast enough (parallel execution)
- ✅ Comprehensive coverage
- ✅ Best user experience

The system doesn't need to "know" where to search - it searches everywhere and returns the best results!

