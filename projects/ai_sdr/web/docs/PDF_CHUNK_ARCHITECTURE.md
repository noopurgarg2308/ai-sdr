# PDF Chunk Architecture & Search Strategy

## Overview

This document explains how PDFs are processed, chunked, and searched in the multimodal RAG system, and how slides are linked to search results.

## PDF Processing Pipeline

When a PDF is uploaded, it goes through two parallel processing paths:

### 1. Main PDF Document Chunks

**Process:**
1. Extract ALL text from entire PDF (all pages combined)
2. Create ONE document: `"Airbnb Q1 2024 Shareholder Letter (PDF)"` with `source: "pdf_extract"`
3. Chunk the entire text into multiple chunks (800 words each, 200 word overlap)
4. Each chunk links to the PDF `mediaAssetId` (not individual slides)
5. Chunks have NO `pageNumber` in metadata

**Characteristics:**
- ✅ Better for queries spanning multiple pages
- ✅ Preserves cross-page context
- ❌ Cannot link to specific slides (no `pageNumber`)
- ❌ Less granular (one chunk might cover multiple pages)

**Example:**
- PDF with 31 pages → 14 chunks covering entire document
- Chunk 1 might contain text from pages 1-3
- Chunk 2 might contain text from pages 2-4 (overlap)

---

### 2. Page-Level Chunks

**Process:**
1. Extract each PDF page as an image (slide)
2. For each page:
   - If page has images/charts → Run OCR on slide image
   - If page has text (>50 chars) and no images → Extract text directly
   - If page has little text (<50 chars) → Run OCR (might be scanned)
3. Create separate document for each page: `"Airbnb Q1 2024 Shareholder Letter - Page 5 (Text)"` with `source: "pdf_page_extract"` or `"ocr"`
4. Chunk each page's text (usually 1 chunk per page since pages are shorter)
5. Each chunk links to the specific slide `mediaAssetId` AND has `pageNumber` in metadata

**Characteristics:**
- ✅ Links to specific slides (has `pageNumber`)
- ✅ More granular (one chunk = one page)
- ✅ Better for showing specific visual content
- ❌ Loses cross-page context
- ❌ More chunks to search through

**Example:**
- PDF with 31 pages → 31 separate documents → ~31 chunks (one per page)
- Page 5 chunk links to slide image of page 5
- Page 7 chunk (with chart) links to slide image of page 7

---

## Search Strategy

### Current Approach: Option 2 Variant (Keep Both, Semantic Ranking)

**Philosophy:** Keep both chunk types, let semantic similarity determine which are most relevant. No artificial boosting.

**Implementation:**

1. **Fetch Both Types:**
   - Main document chunks from matching documents (e.g., "Q1 2024" → Q1 2024 PDF documents)
   - Page-level chunks from matching page-level documents
   - Both combined into candidate set

2. **Ranking (Pure Semantic):**
   - Cosine similarity of embeddings (primary)
   - Keyword matching boosts (+0.3 for exact phrase matches like "Q1 2024")
   - Document title matching (+0.4 if document title matches query)
   - Quarter-specific penalties (-0.1 for wrong quarter)
   - **NO artificial boost for page-level chunks** (removed to maintain organic relevancy)

3. **Slide Resolution:**
   - If top-ranked chunk has `pageNumber` → resolve PDF `mediaAssetId` + `pageNumber` to specific slide `mediaAssetId`
   - If top-ranked chunk has no `pageNumber` → no slide can be shown (chunk is from main PDF document)

**Result:**
- Most semantically relevant chunks rank highest
- If page-level chunk is more relevant → its slide is shown
- If main document chunk is more relevant → it ranks higher but can't show slide

---

## RAG Search vs Direct Media Search

### RAG Search (Primary Method)

**What:** Semantic search on text chunks using embeddings

**How:**
- Converts query to embedding vector
- Compares with chunk embeddings (cosine similarity)
- Ranks by semantic similarity + keyword boosts
- Returns text chunks with `mediaAssetId` and `pageNumber` if available

**Returns:**
- `textResults`: Array of relevant text chunks
- `linkedVisuals`: Visuals linked to chunks (via `mediaAssetId` in chunk metadata)

**Advantages:**
- Understands semantic meaning
- Finds relevant content even if exact keywords don't match
- Automatically links to slides when chunks have `pageNumber`

**Example:**
- Query: "revenue growth chart Q1 2024"
- Finds: Chunks semantically similar to revenue growth in Q1 2024
- Returns: Text content + linked slide (if chunk has `pageNumber`)

---

### Direct Media Search (Currently Disabled)

**What:** Keyword search on `MediaAsset` table by title/description/tags

**How:**
- Fetches all media assets for company
- Filters by matching ANY query word in title/description/tags
- Orders by `createdAt` (most recent first)
- Returns top N assets

**Returns:**
- `visualResults`: Array of media assets

**Why Disabled:**
- Returns generic results that don't match query semantically
- Example: Query "Q1 2024 revenue" might return Q4 2024 slides because they contain "2024" in title
- Not semantically relevant

**Current Status:** Disabled as fallback (line 145-149 in `smartSearch.ts`) to avoid irrelevant results

---

## Slide Linking Flow

### How Slides Are Linked to Chunks

1. **During PDF Processing:**
   - Each page extracted as slide image → `MediaAsset` with `type: "slide"`
   - Slide metadata stores: `{ parentPdfId, pageNumber }`
   - Page-level document created with `mediaAssetId: slideAsset.id` and `pageNumber: page.pageNumber`
   - Chunk metadata stores: `{ mediaAssetId: slideAsset.id, pageNumber: page.pageNumber }`

2. **During Search:**
   - If chunk has `pageNumber` → `rag.ts` resolves PDF `mediaAssetId` + `pageNumber` to slide `mediaAssetId` using cache
   - If chunk has no `pageNumber` → `mediaAssetId` set to `undefined` (can't show slide)

3. **In Tools:**
   - `tools.ts` fetches `MediaAsset` records by `mediaAssetId` from search results
   - Filters out PDFs (only shows slides/images)
   - Returns top 2 most relevant slides

---

## Key Design Decisions

### Why Keep Both Chunk Types?

**Main Document Chunks:**
- Better for queries that span multiple pages
- Preserves context across pages
- More efficient for general semantic search

**Page-Level Chunks:**
- Required for linking to specific slides
- More granular for precise queries
- Better for visual content retrieval

**Trade-off:** Redundancy in data, but flexibility in search

---

### Why No Artificial Boost for Page-Level Chunks?

**Principle:** Relevancy should be determined by semantic similarity, not by whether chunks have slides.

**Approach:**
- Let semantic similarity determine ranking
- If page-level chunk is more relevant → it naturally ranks higher → slide is shown
- If main document chunk is more relevant → it ranks higher (but can't show slide)

**Result:** Organic relevancy - slides appear when content is relevant, not because of artificial boosting.

---

## Current Limitations

1. **Main document chunks can't show slides** - They don't have `pageNumber`, so can't determine which slide to show
2. **Redundancy** - Same text exists in both main document chunks and page-level chunks
3. **Search might prefer main chunks** - If main document chunks are more semantically similar, they rank higher but can't show slides

---

## Future Improvements

1. **Option 1:** Only use page-level chunks (delete main document chunks)
   - Simpler architecture
   - All chunks can link to slides
   - Loses cross-page context

2. **Option 3:** Use main document chunks for search, then find specific page
   - Preserves context
   - More complex (need to map chunk text to page number)
   - Requires text-to-page mapping logic

3. **Hybrid:** Use main chunks for search, but when showing slides, find the page that contains the matched text
   - Best of both worlds
   - Most complex to implement

---

## Files Involved

- `src/lib/pdfProcessor.ts` - PDF processing and chunk creation
- `src/lib/rag.ts` - RAG search and chunk ranking
- `src/lib/smartSearch.ts` - Combines RAG search with media search
- `src/lib/media.ts` - Direct media asset search
- `src/lib/tools.ts` - Tool dispatch and slide resolution
- `src/lib/hybridSearch.ts` - Combines Tavus KB + RAG search

---

## Testing

To test the system:

1. **Query for specific content:** "Show me the revenue growth chart from Q1 2024"
   - Should find relevant Q1 2024 chunks
   - Should show specific slide(s) if page-level chunks rank high

2. **Query for general content:** "What were Airbnb's financial results in Q1 2024?"
   - Should find relevant chunks (might be main document or page-level)
   - Slides shown only if page-level chunks are in top results

3. **Check logs:**
   - `[RAG] ========== SEARCH RESULTS DEBUG ==========` - Shows which chunks are returned
   - `[Tools] ========== SLIDE FILTERING DEBUG ==========` - Shows which slides are selected
