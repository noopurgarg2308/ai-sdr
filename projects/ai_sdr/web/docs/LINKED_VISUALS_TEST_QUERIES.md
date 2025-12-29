# Linked Visuals Test Queries

Test queries to verify that the metadata-driven linked visuals feature is working correctly. When you search for content, the system should automatically find and display linked slides/images without needing to explicitly call `show_visual`.

---

## 🎯 Core Functionality Tests

### 1. **Automatic Visual Linking (Most Important)**

These queries should automatically display linked slides when the search finds relevant content:

1. **"What were Airbnb's financial results in Q1 2024?"**
   - ✅ Should: Find Q1 2024 text content
   - ✅ Should: Automatically display linked slides from Q1 2024 PDF
   - ✅ Verifies: Metadata linking works end-to-end

2. **"Show me Airbnb's revenue data from Q2 2024"**
   - ✅ Should: Find Q2 2024 revenue text
   - ✅ Should: Automatically display revenue charts/slides
   - ✅ Verifies: Visuals linked to financial content

3. **"What does the Q1 2024 shareholder letter say about growth?"**
   - ✅ Should: Find Q1 2024 growth content
   - ✅ Should: Automatically show relevant slides
   - ✅ Verifies: Document-to-slide linking

---

## 📊 Chart and Graph Tests

4. **"Show me charts about Airbnb's bookings"**
   - ✅ Should: Find booking-related text
   - ✅ Should: Display booking charts/graphs
   - ✅ Verifies: OCR text from charts is searchable and linked

5. **"What do the financial highlights show?"**
   - ✅ Should: Find financial highlights text
   - ✅ Should: Display financial highlight slides
   - ✅ Verifies: Visual content is linked to text chunks

6. **"Show me graphs about free cash flow"**
   - ✅ Should: Find FCF-related content
   - ✅ Should: Display FCF charts
   - ✅ Verifies: Specific metric linking

---

## 🖼️ Slide-Specific Tests

7. **"What's on page 5 of the Q1 2024 presentation?"**
   - ✅ Should: Find page 5 content
   - ✅ Should: Display page 5 slide image
   - ✅ Verifies: Page-level linking works

8. **"Show me slide 10 from the Q2 2024 shareholder letter"**
   - ✅ Should: Find page 10 content
   - ✅ Should: Display page 10 slide
   - ✅ Verifies: Specific page retrieval

9. **"What does the revenue chart on page 3 show?"**
   - ✅ Should: Find page 3 revenue content
   - ✅ Should: Display page 3 slide with chart
   - ✅ Verifies: Page + content type linking

---

## 🔍 Content-Based Visual Retrieval

10. **"Tell me about Airbnb's strategic priorities with visuals"**
    - ✅ Should: Find strategic priorities text
    - ✅ Should: Display relevant strategy slides
    - ✅ Verifies: Semantic search finds linked visuals

11. **"Show me information about market position"**
    - ✅ Should: Find market position content
    - ✅ Should: Display market position slides
    - ✅ Verifies: Topic-based visual linking

12. **"What are the key metrics? Show me the charts"**
    - ✅ Should: Find metrics text
    - ✅ Should: Display metric charts/slides
    - ✅ Verifies: Explicit visual request works

---

## 📈 Comparison Tests

13. **"Compare Q1 and Q2 2024 results with charts"**
    - ✅ Should: Find both quarters' data
    - ✅ Should: Display charts from both quarters
    - ✅ Verifies: Multi-document visual linking

14. **"Show me revenue trends across quarters"**
    - ✅ Should: Find quarterly revenue data
    - ✅ Should: Display multiple revenue charts
    - ✅ Verifies: Cross-document visual aggregation

---

## ✅ Success Indicators

### What You Should See:

1. **Automatic Visual Display**
   - ✅ Slide images appear automatically in the widget
   - ✅ No need to explicitly ask for visuals
   - ✅ Visuals are contextually relevant to the search

2. **Linked Visuals in Response**
   - ✅ `search_knowledge` returns `linkedVisuals` array
   - ✅ Visuals have correct metadata (title, URL, type)
   - ✅ Visuals match the content being discussed

3. **Multiple Visuals**
   - ✅ Can return multiple slides for a single query
   - ✅ Visuals from different pages/documents can appear together

4. **Page-Specific Retrieval**
   - ✅ Can find and display specific pages
   - ✅ Page numbers are correctly linked

---

## 🧪 Test Sequence

### Step 1: Basic Automatic Linking
```
"What were Airbnb's financial results in Q1 2024?"
```
**Expected**: Text answer + Q1 2024 slides automatically displayed

### Step 2: Chart Content
```
"Show me charts about revenue"
```
**Expected**: Revenue text + revenue charts automatically displayed

### Step 3: Specific Page
```
"What's on page 5 of the Q1 2024 presentation?"
```
**Expected**: Page 5 content + page 5 slide automatically displayed

### Step 4: Multi-Document
```
"Compare Q1 and Q2 2024 with visuals"
```
**Expected**: Comparison text + charts from both quarters

---

## 🔍 Debugging Queries

If visuals aren't appearing, try these diagnostic queries:

1. **"What PDFs do you have information about?"**
   - Should list available PDFs

2. **"How many slides are available?"**
   - Should indicate number of processed slides

3. **"Show me any slide from Q1 2024"**
   - Should display at least one Q1 2024 slide

---

## 📝 Expected Behavior

| Query Type | Should Return | Visuals Should |
|------------|---------------|----------------|
| Financial query | Text + numbers | Revenue/financial charts |
| Page-specific | Page content | That specific page slide |
| Chart question | Chart data | The actual chart image |
| Comparison | Multi-quarter data | Charts from all quarters |
| General query | Relevant text | Contextually relevant slides |

---

## 🚀 Quick Test

**Try this first:**
```
"What were Airbnb's financial results in Q1 2024? Show me the relevant charts."
```

**Expected behavior:**
1. ✅ `search_knowledge` finds Q1 2024 financial text
2. ✅ Returns `linkedVisuals` with Q1 2024 slides
3. ✅ AI answers with text AND displays charts automatically
4. ✅ No separate `show_visual` call needed

---

## ⚠️ Common Issues

### If visuals don't appear:

1. **Check chunk metadata**: Chunks should have `mediaAssetId` in metadata
2. **Check document linking**: Documents should have `mediaAssetId` field
3. **Check slide processing**: Slides should be processed and have `extractedText`
4. **Check search results**: `search_knowledge` should return `linkedVisuals` array

### If wrong visuals appear:

1. **Metadata linking**: Verify chunks are linked to correct slides
2. **Page numbers**: Check if page numbers are stored correctly
3. **Document matching**: Ensure correct document is being matched

---

*Last Updated: December 23, 2025*
