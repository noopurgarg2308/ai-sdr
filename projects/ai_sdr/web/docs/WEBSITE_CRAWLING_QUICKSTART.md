# Website Crawling - Quick Start Guide

## Installation

1. **Install dependencies:**
   ```bash
   npm install cheerio
   npm install --save-dev @types/cheerio
   ```

2. **Run migration:**
   ```bash
   npx prisma migrate dev
   ```

3. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

## Quick Example

### Step 1: Create Website Source

```bash
npx tsx scripts/createWebsiteSource.ts \
  --companyId=cmj52tf810000w3lw1rvkkieh \
  --url=https://example.com \
  --maxPages=10 \
  --maxDepth=2
```

This will:
- Create a `MediaAsset` with `type: "website"`
- Queue a crawl job
- Return the job ID

### Step 2: Check Status

```bash
curl http://localhost:3000/api/admin/companies/cmj52tf810000w3lw1rvkkieh/websites/<sourceId>/crawl
```

### Step 3: Search for Content

Website content automatically appears in search results:

```typescript
import { searchKnowledge } from "@/lib/rag";

const results = await searchKnowledge({
  companyId: "cmj52tf810000w3lw1rvkkieh",
  query: "What are your features?",
});

// Results include both PDF and website chunks!
```

## Using the Admin API

### Create Website Source

```bash
POST /api/admin/companies/{companyId}/media/upload
Content-Type: application/json

{
  "type": "website",
  "url": "https://example.com",
  "title": "Example Website"
}
```

### Trigger Crawl

```bash
POST /api/admin/companies/{companyId}/websites/{sourceId}/crawl
Content-Type: application/json

{
  "maxPages": 50,
  "maxDepth": 3,
  "includeImages": true,
  "forceReindex": false
}
```

## What Gets Created

1. **Website Source** - `MediaAsset` with `type: "website"`
2. **Page Documents** - `Document` with `source: "website_page"` (one per crawled page)
3. **Chunks** - Text chunks with embeddings (same as PDF chunks)
4. **Images** - `MediaAsset` with `type: "image"` (if `includeImages: true`)

## Verification

Check that website content appears in search:

```sql
-- Count website documents
SELECT COUNT(*) FROM Document WHERE source = 'website_page';

-- Count website chunks
SELECT COUNT(*) FROM Chunk c
JOIN Document d ON c.documentId = d.id
WHERE d.source = 'website_page';
```

## Troubleshooting

**Crawl not starting?**
- Check queue: `GET /api/admin/media/jobs/{jobId}`
- Verify website source `type === "website"`
- Check server logs

**No results in search?**
- Verify crawl completed (check status endpoint)
- Check documents exist: `SELECT * FROM Document WHERE source = 'website_page'`
- Verify chunks exist and have embeddings

**Images not collected?**
- Ensure `includeImages: true` in crawl options
- Check images are publicly accessible
- Verify `MediaAsset` table for `type: "image"`
