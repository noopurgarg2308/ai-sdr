# Website Crawling Implementation Summary

## ✅ Completed Implementation

### 1. Schema Changes (Additive, Backwards Compatible)

**Migration:** `20251229081243_add_website_support`

**Document Model:**
- Added `url` field (nullable) - stores webpage URL
- Added `headingsPath` field (nullable JSON) - stores breadcrumb path
- Added index on `url` for faster lookups

**MediaAsset Model:**
- `type` field already supports "website" (String, no enum constraint)
- Metadata JSON can store crawl config

**No Breaking Changes:**
- All new fields are nullable
- Existing PDF processing unchanged
- Existing retrieval unchanged

### 2. Website Crawler (`src/lib/websiteCrawler.ts`)

**Features:**
- Crawls websites starting from base URL
- Respects `maxPages` and `maxDepth` limits
- Extracts text content from HTML
- Collects images with alt text
- Extracts internal links for further crawling
- Builds breadcrumb paths from headings
- Respects domain restrictions

**Dependencies:**
- `cheerio` - HTML parsing (server-side)

### 3. Website Processor (`src/lib/websiteProcessor.ts`)

**Features:**
- Processes crawled pages into RAG documents
- Creates `Document` with `source: "website_page"`
- Chunks text using existing `ingestCompanyDoc()`
- Updates chunk metadata with website info
- Collects images as `MediaAsset` with `type: "image"`
- Supports `forceReindex` to delete and re-crawl
- Supports `dryRun` for testing

**Integration:**
- Reuses `ingestCompanyDoc()` for chunking/embedding
- Reuses `addMediaAsset()` for image collection
- Can reuse `processImageAsset()` for OCR (optional)

### 4. Queue Integration (`src/lib/queue.ts`)

**Changes:**
- Added `"process-website"` job type
- Updated `queueMediaProcessing()` to accept website type
- Added `options` parameter for crawl configuration
- Queue processes website jobs asynchronously

### 5. Admin API Endpoint

**Route:** `POST /api/admin/companies/:id/websites/:sourceId/crawl`

**Features:**
- Validates company and website source
- Accepts optional crawl options (maxPages, maxDepth, etc.)
- Enqueues crawl job (non-blocking, async)
- Returns job ID and status

**Route:** `GET /api/admin/companies/:id/websites/:sourceId/crawl`

**Features:**
- Returns crawl status and metadata
- Shows pages processed, images collected, etc.

### 6. CLI Helper Script

**Script:** `scripts/createWebsiteSource.ts`

**Usage:**
```bash
npx tsx scripts/createWebsiteSource.ts \
  --companyId=<id> \
  --url=<website-url> \
  --maxPages=50 \
  --maxDepth=3 \
  --includeImages=true
```

**Features:**
- Creates website source
- Automatically queues crawl job
- Provides status endpoint URL

### 7. Documentation

- `docs/WEBSITE_CRAWLING_DESIGN.md` - Architecture design
- `docs/WEBSITE_CRAWLING_USAGE.md` - Usage guide
- `docs/WEBSITE_CRAWLING_IMPLEMENTATION.md` - This file

## 🔄 How It Works

### Flow Diagram

```
1. Create Website Source
   └─> MediaAsset (type: "website", url: "https://example.com")

2. Trigger Crawl (Admin API or CLI)
   └─> Queue Job (type: "process-website")

3. Website Processor
   ├─> Crawl Pages (websiteCrawler.ts)
   │   ├─> Extract text, images, links
   │   └─> Build breadcrumb paths
   │
   ├─> For Each Page:
   │   ├─> Create Document (source: "website_page", url, headingsPath)
   │   ├─> Chunk text (ingestCompanyDoc)
   │   ├─> Update chunk metadata (url, headingsPath)
   │   └─> Collect images (addMediaAsset, type: "image")
   │
   └─> Update MediaAsset status

4. Retrieval (Automatic)
   └─> searchKnowledge() includes website chunks
       └─> Website chunks appear alongside PDF chunks
```

### Data Model

**Website Source:**
```typescript
MediaAsset {
  type: "website",
  url: "https://example.com",
  metadata: { maxPages: 50, maxDepth: 3, ... }
}
```

**Website Page:**
```typescript
Document {
  source: "website_page",
  url: "https://example.com/pricing",
  headingsPath: '["Home", "Products", "Pricing"]',
  mediaAssetId: "website-source-id"
}
```

**Website Chunk:**
```typescript
Chunk {
  metadata: {
    sourceType: "website",
    url: "https://example.com/pricing",
    headingsPath: ["Home", "Products", "Pricing"],
    mediaAssetId: "website-source-id"
  }
}
```

## 🧪 Testing

### Manual Test

1. **Create website source:**
   ```bash
   npx tsx scripts/createWebsiteSource.ts \
     --companyId=<your-company-id> \
     --url=https://example.com \
     --maxPages=5 \
     --maxDepth=2
   ```

2. **Check crawl status:**
   ```bash
   curl http://localhost:3000/api/admin/companies/<id>/websites/<sourceId>/crawl
   ```

3. **Search for content:**
   ```typescript
   const results = await searchKnowledge({
     companyId: "<id>",
     query: "pricing plans",
   });
   // Should include website chunks
   ```

### Verify in Database

```sql
-- Check website documents
SELECT * FROM Document WHERE source = 'website_page';

-- Check website chunks
SELECT * FROM Chunk 
WHERE documentId IN (
  SELECT id FROM Document WHERE source = 'website_page'
);

-- Check website images
SELECT * FROM MediaAsset 
WHERE type = 'image' 
AND metadata LIKE '%websiteSourceId%';
```

## 📝 Next Steps (Future Enhancements)

1. **Scheduled Crawling** - Add cron jobs for periodic re-crawling
2. **Incremental Updates** - Only crawl changed pages
3. **Image OCR Automation** - Automatically OCR website images
4. **Robots.txt Support** - Respect robots.txt rules
5. **Authentication** - Support crawling behind auth
6. **Sitemap Support** - Use sitemap.xml for better crawling

## ⚠️ Important Notes

1. **Backwards Compatibility:** All changes are additive. PDF processing is unchanged.

2. **Dependencies:** Requires `cheerio` package:
   ```bash
   npm install cheerio
   npm install --save-dev @types/cheerio
   ```

3. **Migration:** Run migration before using:
   ```bash
   npx prisma migrate dev
   ```

4. **Queue Processing:** Website crawling is async. Check job status via API.

5. **Rate Limiting:** Crawler includes 500ms delay between pages. Adjust if needed.
