# PDF Processing Test Queries

Test queries to verify that PDF text extraction, slide extraction, OCR, and linked visual retrieval are all working correctly.

## 📋 Uploaded PDFs
- **Airbnb Q1 2024 Shareholder Letter** - Financial results, metrics, strategic updates
- **Airbnb Q2 2024 Shareholder Letter** - Financial results, metrics, strategic updates

---

## 🎯 Test Categories

### 1. **Text Extraction Tests** (Verifies PDF text is in knowledge base)

These queries should find content from the extracted PDF text:

1. **"What were Airbnb's financial results in Q1 2024?"**
   - Should find: Revenue, bookings, free cash flow numbers
   - Verifies: PDF text extraction worked

2. **"What were Airbnb's financial results in Q2 2024?"**
   - Should find: Q2-specific metrics
   - Verifies: Multiple PDFs are indexed

3. **"What is Airbnb's mission or vision?"**
   - Should find: Mission statement from shareholder letters
   - Verifies: Text content is searchable

4. **"What are Airbnb's strategic priorities?"**
   - Should find: Strategic initiatives mentioned in letters
   - Verifies: Content understanding

5. **"Compare Q1 and Q2 2024 results"**
   - Should find: Both quarters' data
   - Verifies: Cross-document search

---

### 2. **Slide Extraction Tests** (Verifies slides were extracted as images)

These queries should find and display actual slide images:

6. **"Show me slides from the Q1 2024 shareholder letter"**
   - Should: Display slide images from Q1 PDF
   - Verifies: Slide extraction worked

7. **"Show me slides from the Q2 2024 shareholder letter"**
   - Should: Display slide images from Q2 PDF
   - Verifies: Multiple PDFs processed

8. **"Show me page 5 of the Q1 2024 presentation"**
   - Should: Display specific page/slide
   - Verifies: Individual slides are accessible

9. **"Show me page 10 of the Q2 2024 presentation"**
   - Should: Display specific page/slide
   - Verifies: Page-specific retrieval

---

### 3. **OCR Tests** (Verifies text from images/charts is searchable)

These queries test if OCR extracted text from charts, graphs, and image-heavy slides:

10. **"What does the revenue chart show in Q1 2024?"**
    - Should: Find revenue data from charts
    - Verifies: OCR extracted text from visual charts

11. **"Show me charts about bookings or revenue"**
    - Should: Display charts and describe their content
    - Verifies: OCR text is searchable

12. **"What metrics are shown in the financial highlights?"**
    - Should: Find specific numbers from charts/tables
    - Verifies: OCR extracted numbers from visuals

13. **"Show me graphs about free cash flow"**
    - Should: Display financial graphs
    - Verifies: Visual content is linked and searchable

---

### 4. **Linked Visual Tests** (Verifies metadata-driven linking)

These queries test that search results automatically include linked visuals:

14. **"What was Airbnb's revenue in Q2 2024?"**
    - Should: Find text answer AND automatically show relevant slides
    - Verifies: `search_knowledge` returns `linkedVisuals` automatically

15. **"Tell me about Airbnb's growth metrics"**
    - Should: Answer with text AND show related charts/slides
    - Verifies: Metadata linking works end-to-end

16. **"What are the key highlights from Q1 2024?"**
    - Should: Text response + linked slides automatically displayed
    - Verifies: No need for separate `show_visual` call

17. **"Show me information about Airbnb's market position"**
    - Should: Find relevant text AND show market position slides
    - Verifies: Contextual visual linking

---

### 5. **Combined Tests** (Text + Visual together)

18. **"Show me the Q2 2024 financial results with charts"**
    - Should: Text summary + visual charts
    - Verifies: Both text and visual retrieval

19. **"Compare Q1 and Q2 2024 with visual charts"**
    - Should: Comparison text + charts from both quarters
    - Verifies: Multi-document visual retrieval

20. **"What does the Q1 2024 shareholder letter say about future outlook?"**
    - Should: Text answer + relevant outlook slides
    - Verifies: Semantic search finds relevant visuals

---

## ✅ Success Indicators

### For Text Extraction:
- ✅ AI finds specific numbers, metrics, facts from PDFs
- ✅ Can answer questions about content in shareholder letters
- ✅ Can compare data across multiple PDFs

### For Slide Extraction:
- ✅ `search_knowledge` returns `linkedVisuals` array
- ✅ Slide images are displayed in the widget
- ✅ Can reference specific pages (e.g., "page 5")

### For OCR:
- ✅ AI can answer questions about chart data
- ✅ Can find content that's only in images/charts
- ✅ Numbers and metrics from visuals are searchable

### For Linked Visuals:
- ✅ No need to explicitly call `show_visual` - visuals appear automatically
- ✅ Visuals are contextually relevant to the search query
- ✅ Multiple slides can be returned for a single query

---

## 🧪 Recommended Test Sequence

### Step 1: Basic Text Search
```
"What were Airbnb's financial results in Q1 2024?"
```
**Expected**: Text answer with specific numbers

### Step 2: Visual Retrieval
```
"Show me slides from the Q1 2024 shareholder letter"
```
**Expected**: Slide images displayed

### Step 3: OCR Content
```
"What does the revenue chart show in Q1 2024?"
```
**Expected**: Answer based on OCR text from charts

### Step 4: Automatic Linking
```
"What was Airbnb's revenue in Q2 2024?"
```
**Expected**: Text answer + relevant slides automatically shown

### Step 5: Specific Page
```
"Show me page 5 of the Q2 2024 presentation"
```
**Expected**: Specific slide displayed

---

## 🔍 Debugging Queries

If something isn't working, try these diagnostic queries:

1. **"What PDFs do you have information about?"**
   - Should list: Q1 2024, Q2 2024 shareholder letters

2. **"How many slides are available?"**
   - Should indicate: Number of processed slides

3. **"What content is available about Airbnb?"**
   - Should show: Overview of indexed content

---

## 📊 Expected Results Summary

| Query Type | Should Return | Verifies |
|------------|---------------|----------|
| Text query | Text answer | PDF text extraction |
| "Show me slides" | Slide images | Slide extraction |
| Chart question | Chart data | OCR from images |
| Financial query | Text + visuals | Automatic linking |
| Page-specific | Specific slide | Page-level indexing |

---

## 🚀 Quick Start Test

**Try this first:**
```
"What were Airbnb's financial results in Q2 2024? Show me the relevant charts."
```

**Expected behavior:**
1. ✅ `search_knowledge` finds Q2 2024 financial text
2. ✅ Returns `linkedVisuals` with relevant slides
3. ✅ AI answers with text AND displays charts automatically
4. ✅ No separate `show_visual` call needed

---

*Last Updated: December 23, 2025*
