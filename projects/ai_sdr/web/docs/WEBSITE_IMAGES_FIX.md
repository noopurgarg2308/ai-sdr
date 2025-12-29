# Website Images Not Showing - Fix Applied

## Problem

Website images were being collected during crawl but not linked to chunks, so they weren't appearing in search results.

## Fix Applied

**Updated:** `src/lib/websiteProcessor.ts`

**Changes:**
1. Images are now linked to chunks from the same page
2. First image from each page is set as `mediaAssetId` in chunk metadata
3. All image IDs are stored in `imageAssetIds` array in chunk metadata
4. Website chunks with images get a boost (+0.15) for visual queries

## For Existing Crawls

If you crawled a website **before** this fix, you need to either:

### Option 1: Re-crawl (Recommended)

1. Go to admin page: http://localhost:3000/admin/companies
2. Find your website source
3. Click **"Re-crawl"** button
4. This will re-process and link images to chunks

### Option 2: Retroactively Link Images

Run the script to link existing images to chunks:

```bash
npx tsx scripts/linkWebsiteImagesToChunks.ts --companyId=<your-company-id>
# or
npm run link:website:images -- --companyId=<your-company-id>
```

This will:
- Find all website documents
- Find images from the same pages
- Link them to chunks retroactively

## Testing

After re-crawling or running the link script, test with:

**Query:** "can you show some relevant image?"

**Expected:**
- ✅ Search finds website chunks with image links
- ✅ Images appear in the "Visual Content" section
- ✅ Images load and display correctly

## Debugging

If images still don't show:

1. **Check server logs** for:
   ```
   [RAG] Website chunk with image mediaAssetId: <id>
   [Tools] Fetched X media assets from database
   ```

2. **Check browser console** for:
   ```
   [WidgetText] Rendering visual asset 0: {type: "image", url: "..."}
   [WidgetText] Successfully loaded image: <url>
   ```

3. **Verify in database:**
   ```sql
   -- Check if chunks have image links
   SELECT c.id, c.metadata 
   FROM Chunk c
   JOIN Document d ON c.documentId = d.id
   WHERE d.source = 'website_page'
   AND c.metadata LIKE '%mediaAssetId%';
   
   -- Check if images exist
   SELECT * FROM MediaAsset 
   WHERE type = 'image' 
   AND metadata LIKE '%websiteSourceId%';
   ```

## CORS Issues

If images are external URLs (http://example.com/image.jpg), they might be blocked by CORS. The widget will show an error in the browser console if this happens.

**Solution:** Images need to be served from the same domain or have proper CORS headers, OR download and store them locally during crawl.
