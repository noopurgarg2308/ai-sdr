# How to Access the SDR Widget

After a website crawl is completed, you can test the SDR widget to ask questions about the crawled content.

## Quick Access Methods

### Method 1: From Admin Page (Easiest)

1. Go to **http://localhost:3000/admin/companies**
2. Find your company in the "Existing Companies" list
3. Click the **"Open Widget"** button (green button)
4. The widget will open in a new tab

### Method 2: Direct URL (Using Company Slug)

Use the company's **slug** (not the ID) in the URL:

```
http://localhost:3000/widget/{company-slug}
```

**Example:**
- If your company slug is `quantivalq`, go to:
  ```
  http://localhost:3000/widget/quantivalq
  ```

### Method 3: Text-Only Widget

For a simpler text-only interface:

```
http://localhost:3000/widget-text/{company-slug}
```

## Finding Your Company Slug

### Option 1: Admin Page
- Go to http://localhost:3000/admin/companies
- Look at the "Slug" field in the company list
- It's shown as: `Slug: <code>your-slug</code>`

### Option 2: Database Query
```sql
SELECT slug, displayName FROM Company;
```

### Option 3: API
```bash
curl http://localhost:3000/api/admin/companies
```

## Testing Website Content

Once the widget is open, try asking questions about the crawled website:

**Example queries:**
- "What are your main features?"
- "Tell me about your pricing"
- "What products do you offer?"
- "Show me information about [specific topic from the website]"

The SDR will search through:
- ✅ Website content (from the crawl)
- ✅ PDF documents (if any)
- ✅ Images with OCR text (if any)

## Widget Features

The widget includes:
- **Text Mode** (default) - Simple text chat with visual content support
- **Realtime Mode** - Voice interaction
- **TTS Mode** - Text-to-speech
- **Tavus Mode** - Video avatar (if enabled)

## Troubleshooting

**Widget not loading?**
- Check that the dev server is running: `npm run dev`
- Verify the company slug is correct
- Check browser console for errors

**No website content in answers?**
- Verify crawl completed: Check status in admin page
- Check documents exist: `SELECT COUNT(*) FROM Document WHERE source = 'website_page'`
- Verify chunks exist: `SELECT COUNT(*) FROM Chunk c JOIN Document d ON c.documentId = d.id WHERE d.source = 'website_page'`

**Content not appearing?**
- Wait a few seconds after crawl completes (chunks need to be indexed)
- Try refreshing the widget page
- Check server logs for search queries
