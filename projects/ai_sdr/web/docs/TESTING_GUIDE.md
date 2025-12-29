# Testing Guide: Multimodal RAG with Slide Retrieval

## Quick Start

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open the widget:**
   - Navigate to: `http://localhost:3000/widget/quantivalq`
   - Or use the company slug you've been testing with

3. **Open browser console** (to see frontend logs):
   - Safari: `Cmd + Option + C`
   - Chrome: `Cmd + Option + J`

4. **Watch server logs** (in terminal where `npm run dev` is running):
   - Look for `[RAG]` logs showing search results
   - Look for `[Tools]` logs showing slide filtering

---

## Test Queries

### Test 1: Specific Visual Content (Q1 2024)
**Query:** `"Show me the revenue growth chart from Q1 2024"`

**Expected Behavior:**
- ✅ Finds Q1 2024 chunks (not Q4)
- ✅ Shows 1-2 specific slides from Q1 2024
- ✅ Slides are relevant to revenue growth

**What to Check:**
- Server logs: `[RAG]` should show Q1 2024 chunks with high scores
- Server logs: `[Tools]` should show slide IDs being filtered
- Browser: Visual content section should show Q1 2024 slides (not Q4)

---

### Test 2: General Financial Query
**Query:** `"What were Airbnb's financial results in Q1 2024?"`

**Expected Behavior:**
- ✅ Finds relevant Q1 2024 chunks
- ✅ May or may not show slides (depends on ranking)
- ✅ If slides shown, they should be from Q1 2024

**What to Check:**
- Server logs: Check if main document chunks or page-level chunks rank higher
- Browser: If slides shown, verify they're Q1 2024 (not Q4)

---

### Test 3: Quarter-Specific Query
**Query:** `"Show me Q1 2024 revenue numbers"`

**Expected Behavior:**
- ✅ Strongly prioritizes Q1 2024 content
- ✅ Penalizes Q4 2024 mentions
- ✅ Shows Q1 2024 slides if page-level chunks rank high

**What to Check:**
- Server logs: `[RAG]` should show keyword boost for "Q1 2024"
- Server logs: Should show penalty for Q4 2024 chunks
- Browser: Only Q1 2024 slides should appear

---

### Test 4: Different Quarter (Q2 2024)
**Query:** `"What was the revenue in Q2 2024?"`

**Expected Behavior:**
- ✅ Finds Q2 2024 chunks
- ✅ Shows Q2 2024 slides (not Q1 or Q4)

**What to Check:**
- Server logs: Verify Q2 2024 chunks are returned
- Browser: Verify Q2 2024 slides are shown

---

## What to Look For in Logs

### Server Logs (`[RAG]` section)

Look for:
```
[RAG] ========== SEARCH RESULTS DEBUG ==========
[RAG] Top result: score=0.85, doc="Airbnb Q1 2024 Shareholder Letter - Page 5 (Text)", mediaAssetId=xxx, pageNumber=5
```

**Good signs:**
- ✅ High scores (0.7+) for relevant chunks
- ✅ Correct quarter in document titles
- ✅ `pageNumber` present for page-level chunks
- ✅ `mediaAssetId` resolved to slide IDs (not PDF IDs)

**Bad signs:**
- ❌ Low scores (<0.5) for relevant content
- ❌ Wrong quarter in top results
- ❌ `mediaAssetId: none` or `pageNumber: none` for all results
- ❌ PDF IDs instead of slide IDs

---

### Server Logs (`[Tools]` section)

Look for:
```
[Tools] ========== SLIDE FILTERING DEBUG ==========
[Tools] Extracted mediaAssetIds from top 2 results: [xxx, yyy]
[Tools] Fetched 2 linked media assets
```

**Good signs:**
- ✅ Slide IDs extracted from top 2 results
- ✅ Assets fetched successfully
- ✅ Filtered out PDFs (only slides/images)

**Bad signs:**
- ❌ No mediaAssetIds extracted
- ❌ PDFs in the final list
- ❌ More than 2 slides (should be limited to 2)

---

### Browser Console Logs

Look for:
```
[WidgetChatText] Received visual assets: 2
[WidgetChatText] Visual asset 0: type=slide, url=/uploads/slides/...
```

**Good signs:**
- ✅ Visual assets received
- ✅ Type is `slide` (not `pdf`)
- ✅ URLs are valid

**Bad signs:**
- ❌ No visual assets received
- ❌ Type is `pdf` instead of `slide`
- ❌ Empty array

---

## Common Issues & Fixes

### Issue 1: Same 3 slides always showing
**Symptom:** Regardless of query, same 3 Q4 2024 slides appear

**Check:**
- Server logs: Are RAG results returning `mediaAssetId: none`?
- Server logs: Is direct media search being used as fallback?
- Fix: Ensure `smartSearch.ts` doesn't fallback to direct media search

---

### Issue 2: No slides showing
**Symptom:** Visual content section is empty

**Check:**
- Server logs: Are chunks returning with `pageNumber`?
- Server logs: Are slide IDs being resolved correctly?
- Browser console: Are visual assets being received?
- Fix: Verify `WidgetChatText.tsx` renders `type: "slide"`

---

### Issue 3: Wrong quarter slides
**Symptom:** Query for Q1 2024 shows Q4 2024 slides

**Check:**
- Server logs: Are Q1 2024 chunks ranking high?
- Server logs: Is keyword boosting working?
- Fix: Verify `rag.ts` quarter matching logic

---

### Issue 4: Entire PDF showing
**Symptom:** All slides from a PDF appear, not just relevant ones

**Check:**
- Server logs: Are main document chunks (no `pageNumber`) being returned?
- Server logs: Is `tools.ts` limiting to top 2 results?
- Fix: Ensure only `mediaAssetId`s from top 2 results are used

---

## Debugging Commands

### Check what chunks exist for a company:
```bash
npx tsx scripts/checkQ1Content.ts
```

### Check RAG search results:
```bash
# Modify the script to test specific queries
npx tsx scripts/testQ1Search.ts
```

### Reprocess PDFs to ensure page-level chunks:
```bash
npx tsx scripts/reprocessPDFsForPageChunks.ts
```

---

## Success Criteria

✅ **Query-specific slides:** Different queries show different slides  
✅ **Correct quarter:** Q1 queries show Q1 slides, Q2 shows Q2, etc.  
✅ **Relevant content:** Slides match the query semantically  
✅ **Limited results:** Maximum 2 slides per query  
✅ **No irrelevant fallbacks:** No generic slides from direct media search  

---

## Next Steps After Testing

If tests pass:
- ✅ System is working correctly with organic semantic ranking
- ✅ Both main PDF chunks and page-level chunks are being used
- ✅ Slides are linked correctly to relevant content

If tests fail:
- Check server logs for specific error patterns
- Verify PDFs have been processed with page-level chunks
- Check database for correct `mediaAssetId` and `pageNumber` in chunk metadata
