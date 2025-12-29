# Debugging: No Images Returned for Chart Queries

## Issue
Query: "Show me the revenue growth chart from Q1 2024"
Result: ✅ Works (correct answer) but ❌ No images/slides returned

## Why This Happens

### Expected Behavior
- Query asks for a **chart** → Should return slides/images
- Q1 2024 query → Should find Q1 2024 page-level chunks with slides

### Possible Causes

1. **Main document chunks ranking higher than page-level chunks**
   - Main PDF chunks (no `pageNumber`) rank higher
   - They get `mediaAssetId = undefined` (can't show slides)
   - Page-level chunks (with `pageNumber`) rank lower but have slides

2. **Page-level chunks don't have `mediaAssetId`**
   - Chunks exist but aren't linked to slides
   - Need to reprocess PDFs

3. **Q1 2024 PDFs not processed for page-level chunks**
   - Only main document chunks exist
   - No page-level documents/chunks created

## How to Debug

### Step 1: Check Server Logs

Look for `[RAG]` section in server logs:

```
[RAG] ========== SEARCH RESULTS DEBUG ==========
[RAG] Top 5 results:
[RAG]   1. Score: 0.850, mediaAssetId: none, pageNumber: none
[RAG]   2. Score: 0.820, mediaAssetId: xxx, pageNumber: 5
```

**What to check:**
- ✅ Do top 2 results have `pageNumber`? → Should show slides
- ❌ Do top 2 results have `mediaAssetId: none`? → Can't show slides
- ❌ Do top results have `pageNumber: none`? → Main document chunks (can't show slides)

### Step 2: Check if Page-Level Chunks Exist

Run diagnostic script:
```bash
npx tsx scripts/checkQ1ChartSlides.ts
```

**What to check:**
- ✅ Are there page-level documents for Q1 2024?
- ✅ Do page-level chunks have `mediaAssetId`?
- ✅ Do page-level chunks have `pageNumber`?
- ✅ Are there Q1 2024 slides in the database?

### Step 3: Check Search Ranking

If main document chunks are ranking higher:
- They might be more semantically similar to the query
- But they can't show slides (no `pageNumber`)

**Solution options:**
1. **Accept it** - Main chunks are more relevant, so no slides (current behavior)
2. **Boost page-level chunks slightly** - Add small boost (+0.1) for chunks with `pageNumber` when query asks for visual content
3. **Reprocess PDFs** - Ensure all pages have page-level chunks with slides

## Quick Fix: Boost Page-Level Chunks for Visual Queries

If the query contains visual keywords ("chart", "graph", "image", "slide", "visual"), we could slightly boost page-level chunks:

```typescript
// In rag.ts, after calculating semantic score:
const hasVisualKeywords = /chart|graph|image|slide|visual|picture|diagram/i.test(query);
if (hasVisualKeywords && pageNumber) {
  score += 0.1; // Small boost for page-level chunks when query asks for visuals
}
```

This would help page-level chunks (with slides) rank higher when the query explicitly asks for visual content.

## Current Behavior (By Design)

The system uses **pure semantic ranking** - no artificial boosts. This means:
- If main document chunks are more semantically similar → They rank higher (but can't show slides)
- If page-level chunks are more semantically similar → They rank higher (and can show slides)

For queries like "Show me the revenue growth chart", the system might find the text description in main chunks more relevant than the page-level chunk with the actual chart image.

## Recommendation

1. **Check server logs** to see what's ranking highest
2. **Run diagnostic script** to verify page-level chunks exist
3. **If page-level chunks exist but rank lower** → Consider adding visual keyword boost
4. **If page-level chunks don't exist** → Reprocess Q1 2024 PDFs
