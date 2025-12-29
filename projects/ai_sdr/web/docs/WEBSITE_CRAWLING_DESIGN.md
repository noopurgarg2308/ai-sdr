# Website Crawling Design - Architecture Extension

## Current Architecture Summary

### Database Models

**Document Model:**
- Represents a source document (PDF, OCR'd image, etc.)
- Fields: `id`, `companyId`, `title`, `source` (enum: "manual", "ocr", "whisper", "pdf_extract", "pdf_page_extract"), `content`, `mediaAssetId`
- Links to `MediaAsset` if document came from media processing

**Chunk Model:**
- Text chunks with embeddings for RAG
- Fields: `id`, `documentId`, `companyId`, `index`, `content`, `embedding`, `metadata` (JSON)
- Metadata stores: `sourceType`, `mediaAssetId`, `pageNumber` (for PDFs)

**MediaAsset Model:**
- Represents images, videos, PDFs, slides
- Fields: `id`, `companyId`, `type` (enum: "image", "video", "pdf", "slide", "chart", "gif"), `url`, `title`, `description`, `metadata` (JSON)
- Processing fields: `extractedText`, `transcript`, `processingStatus`

### Current PDF Processing Flow

1. **PDF Upload** → Creates `MediaAsset` with `type: "pdf"`
2. **Queue Processing** → `processPDFAsset()` called
3. **Text Extraction** → Extracts full PDF text
4. **Main Document** → Creates `Document` with `source: "pdf_extract"`, links to PDF `mediaAssetId`
5. **Slide Extraction** → Extracts each page as image, creates `MediaAsset` with `type: "slide"`
6. **Page-Level Documents** → For each page:
   - If page has images → OCR slide image → `Document` with `source: "ocr"`
   - If page has text → Direct extract → `Document` with `source: "pdf_page_extract"`
   - Links to slide `mediaAssetId` with `pageNumber` in chunk metadata
7. **Chunking** → `ingestCompanyDoc()` chunks text, creates embeddings, stores chunks
8. **Retrieval** → `searchKnowledge()` searches chunks, resolves PDF+pageNumber to slide IDs

### OCR Flow

- `extractTextFromImage()` uses GPT-4 Vision to extract text from images
- `processImageAsset()` calls OCR, creates `Document` with `source: "ocr"`, links to image `mediaAssetId`
- OCR text stored in `MediaAsset.extractedText` and in `Document.content`

## Website Extension Design

### Core Principle: Treat Website as Another Source Type

Websites will reuse existing abstractions:
- **Website Source** → `MediaAsset` with `type: "website"` (or new type)
- **Website Pages** → `Document` with `source: "website_page"` or `"website_crawl"`
- **Website Images** → `MediaAsset` with `type: "image"` (reuse existing)
- **Website Chunks** → Same `Chunk` model, with website-specific metadata

### Schema Changes (Additive Only)

**MediaAsset Model:**
- Add `type: "website"` to existing enum (no breaking change)
- Add optional `crawlConfig` JSON field for website-specific settings

**Document Model:**
- Add `source: "website_page"` to existing source enum
- Add optional `url` field (nullable) for website page URL
- Add optional `headingsPath` JSON field for breadcrumb/navigation path

**Chunk Model:**
- No changes needed - `metadata` JSON already flexible
- Website chunks will store: `{ sourceType: "website", url, headingsPath, mediaAssetId }`

### Website Crawling Flow

1. **Create Website Source** → `MediaAsset` with `type: "website"`, `url` = base URL
2. **Manual Crawl Trigger** → Admin API endpoint triggers crawl
3. **Crawl Pages** → Extract text, collect images, follow links (respecting maxDepth, maxPages)
4. **For Each Page:**
   - Create `Document` with `source: "website_page"`, `url`, `headingsPath`
   - Extract text → chunk → embed → store chunks
   - Collect images → create `MediaAsset` with `type: "image"` → optionally OCR
5. **Image OCR** → Reuse existing `processImageAsset()` for website images
6. **Retrieval** → Website chunks appear alongside PDF chunks in search results

### Integration Points

**Queue System:**
- Add `"process-website"` job type to `SimpleQueue`
- Reuse existing queue infrastructure

**OCR Reuse:**
- Website images → `MediaAsset` with `type: "image"` → existing `processImageAsset()` handles OCR
- OCR text → `Document` with `source: "ocr"` → same as PDF slides

**RAG Integration:**
- Website chunks use same `ingestCompanyDoc()` function
- Same chunking, embedding, storage
- Retrieval automatically includes website chunks (no changes needed)

## Implementation Plan

1. ✅ Schema migration (additive fields only)
2. ✅ Website crawler library (`src/lib/websiteCrawler.ts`)
3. ✅ Website processor (`src/lib/websiteProcessor.ts`) - similar to `pdfProcessor.ts`
4. ✅ Queue integration (add website job type)
5. ✅ Admin API endpoint (`POST /api/admin/companies/:id/websites/:sourceId/crawl`)
6. ✅ Optional CLI helper (if easy)
7. ✅ Documentation and examples
