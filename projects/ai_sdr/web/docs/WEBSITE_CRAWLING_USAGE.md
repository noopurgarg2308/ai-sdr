# Website Crawling Usage Guide

## Overview

Website crawling extends the existing PDF ingestion pipeline to support crawling websites and ingesting their content into the RAG system. Websites are treated as another source type, reusing existing abstractions (Document, Chunk, MediaAsset).

## Architecture

- **Website Source** → `MediaAsset` with `type: "website"`
- **Website Pages** → `Document` with `source: "website_page"`
- **Website Images** → `MediaAsset` with `type: "image"` (reuses OCR pipeline)
- **Website Chunks** → Same `Chunk` model with website metadata

## Creating a Website Source

### Option 1: Using the Admin API

```bash
# Create a website source
POST /api/admin/companies/{companyId}/media/upload
Content-Type: application/json

{
  "type": "website",
  "url": "https://example.com",
  "title": "Example Website",
  "description": "Main website for Example Corp"
}
```

### Option 2: Using the CLI Script

```bash
npx tsx scripts/createWebsiteSource.ts \
  --companyId=cmj52tf810000w3lw1rvkkieh \
  --url=https://example.com \
  --maxPages=50 \
  --maxDepth=3 \
  --includeImages=true
```

## Triggering a Manual Crawl

### Admin API Endpoint

```bash
POST /api/admin/companies/{companyId}/websites/{sourceId}/crawl
Content-Type: application/json

{
  "maxPages": 50,        // Optional: max pages to crawl (default: 50)
  "maxDepth": 3,          // Optional: max crawl depth (default: 3)
  "forceReindex": false,  // Optional: delete existing docs and re-crawl (default: false)
  "includeImages": true,  // Optional: collect images (default: true)
  "dryRun": false        // Optional: preview without crawling (default: false)
}
```

**Response:**
```json
{
  "jobId": "job_1234567890_abc",
  "status": "queued",
  "message": "Website crawl job queued successfully",
  "options": {
    "maxPages": 50,
    "maxDepth": 3,
    "includeImages": true
  }
}
```

### Check Crawl Status

```bash
GET /api/admin/companies/{companyId}/websites/{sourceId}/crawl
```

**Response:**
```json
{
  "processingStatus": "completed",
  "processedAt": "2024-12-29T08:12:43.000Z",
  "metadata": {
    "pagesProcessed": 25,
    "imagesCollected": 12,
    "documentsCreated": 25,
    "lastCrawledAt": "2024-12-29T08:12:43.000Z"
  }
}
```

## Example: Complete Workflow

### 1. Create Website Source

```typescript
import { addMediaAsset } from "@/lib/media";

const websiteSource = await addMediaAsset({
  companyId: "cmj52tf810000w3lw1rvkkieh",
  type: "website",
  url: "https://example.com",
  title: "Example Website",
  description: "Main website",
});
```

### 2. Trigger Crawl

```typescript
import { queueMediaProcessing } from "@/lib/queue";

const jobId = await queueMediaProcessing(
  websiteSource.id,
  companyId,
  "website",
  {
    maxPages: 50,
    maxDepth: 3,
    includeImages: true,
  }
);
```

### 3. Verify Results

After crawling completes, website content will appear in search results:

```typescript
import { searchKnowledge } from "@/lib/rag";

const results = await searchKnowledge({
  companyId: "cmj52tf810000w3lw1rvkkieh",
  query: "What are your pricing plans?",
  limit: 10,
});

// Results will include chunks from:
// - PDF documents (source: "pdf_extract", "pdf_page_extract", "ocr")
// - Website pages (source: "website_page") ← NEW!
```

## How Website Content Appears in Search

Website chunks are automatically included in RAG search results. They have:

- **Same chunking/embedding** as PDF chunks
- **Website-specific metadata** in chunk.metadata:
  ```json
  {
    "sourceType": "website",
    "url": "https://example.com/pricing",
    "headingsPath": ["Home", "Products", "Pricing"],
    "mediaAssetId": "website-source-id"
  }
  ```

## Image Processing

Website images are collected as `MediaAsset` with `type: "image"`. They can be OCR'd using the existing image processing pipeline:

```typescript
import { processImageAsset } from "@/lib/imageProcessor";

// OCR a website image
await processImageAsset(imageAssetId);
```

## Backwards Compatibility

✅ **All changes are additive:**
- New nullable fields in `Document` (`url`, `headingsPath`)
- New `type: "website"` in `MediaAsset.type` (String enum, no migration needed)
- New `source: "website_page"` in `Document.source` (String enum, no migration needed)
- Existing PDF processing unchanged
- Existing retrieval unchanged (website chunks appear automatically)

## Troubleshooting

### Crawl Not Starting

1. Check queue status: `GET /api/admin/media/jobs/{jobId}`
2. Verify website source exists and `type === "website"`
3. Check server logs for errors

### No Results in Search

1. Verify crawl completed: `GET /api/admin/companies/{id}/websites/{sourceId}/crawl`
2. Check documents created: Query `Document` table with `source: "website_page"`
3. Verify chunks exist: Query `Chunk` table linked to website documents

### Images Not Collected

1. Check `includeImages: true` in crawl options
2. Verify images are accessible (not behind auth)
3. Check `MediaAsset` table for `type: "image"` with `websiteSourceId` in metadata
