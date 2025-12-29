# Slide Extraction Test Queries

Use these queries in your widget to verify that slide extraction and OCR are working correctly.

## 🎯 Visual Content Queries (Proves OCR from Slides)

These queries test if the AI can find content from images/charts that were extracted from PDF slides:

1. **"Show me charts or graphs about Airbnb's revenue growth"**
   - Should find revenue charts from investor presentations
   - Proves: OCR extracted text from charts/graphs in slides

2. **"What does the market opportunity slide show?"**
   - Should reference specific slide content
   - Proves: Slide content is searchable

3. **"Show me the slide about Airbnb's strategic priorities"**
   - Should find and display relevant slides
   - Proves: Slides are linked and can be shown

4. **"What are the key metrics shown in the financial highlights?"**
   - Should find metrics from charts/tables in slides
   - Proves: OCR extracted numbers and data from visual content

## 📊 Specific Slide Content Queries

5. **"What does page 5 of the Q2 2024 shareholder letter show?"**
   - Should reference specific page content
   - Proves: Individual slides are indexed and searchable

6. **"Show me slides about guest favorites or listing quality"**
   - Should find relevant slides from Q2 2024 (mentions Guest Favorites)
   - Proves: Slide OCR text is in knowledge base

7. **"What visual content is there about Airbnb Icons?"**
   - Should find slides mentioning Icons (from Q2 2024)
   - Proves: Visual content is searchable

## 🔍 Comparison Queries (Text vs Visual)

8. **"Compare Q1 and Q2 2024 financial results"**
   - Should find both text and visual content
   - Proves: Both PDF text and slide OCR are working

9. **"Show me the revenue chart from Q2 2024"**
   - Should specifically find visual charts
   - Proves: Visual search is working

## ✅ Success Indicators

When slide extraction is working, you should see:

1. **AI finds visual content**: Responses mention charts, graphs, slides
2. **`show_visual` tool is called**: AI uses the tool to display slides
3. **Slide images appear**: Actual slide images are shown in the widget
4. **OCR text is searchable**: AI can answer questions about chart data, slide content
5. **Specific page references**: AI can reference specific pages/slides

## 🧪 Test Sequence

1. **Start simple**: "Show me a slide from Airbnb's Q2 2024 presentation"
2. **Test OCR**: "What does the revenue chart show?"
3. **Test specific content**: "Show me page 10 of the Q1 2024 shareholder letter"
4. **Test visual search**: "Find charts about free cash flow"

## 📝 Expected Behavior

### ✅ Working Correctly:
- AI responds with slide-specific content
- `show_visual` tool is called
- Slide images are displayed
- AI can reference specific pages
- OCR text from charts is searchable

### ❌ Not Working:
- AI only finds text content, no visual references
- No `show_visual` tool calls
- No slide images displayed
- Can't find content that's only in charts/images

---

## 🎯 Quick Test Query

**Try this first:**
```
"Show me a chart or graph from Airbnb's Q2 2024 shareholder letter"
```

If slide extraction worked, the AI should:
1. Find the relevant slide
2. Call `show_visual` tool
3. Display the slide image
4. Describe what the chart shows (from OCR)

---

*Last Updated: December 23, 2025*
