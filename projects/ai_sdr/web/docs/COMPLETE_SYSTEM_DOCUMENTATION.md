# Complete System Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Content Sources](#content-sources)
4. [Processing Pipelines](#processing-pipelines)
5. [RAG Search System](#rag-search-system)
6. [Visual Content System](#visual-content-system)
7. [API Reference](#api-reference)
8. [Admin Interface](#admin-interface)
9. [Database Schema](#database-schema)
10. [Configuration](#configuration)
11. [Troubleshooting](#troubleshooting)

---

## System Overview

The AI SDR Platform is a multi-tenant system that provides intelligent knowledge retrieval and visual content display for sales and customer support use cases. It combines:

- **PDF Document Processing**: Extract text, create slides, run OCR
- **Website Crawling**: Recursively crawl websites, extract content and images
- **Multimodal RAG**: Search across all content sources simultaneously
- **Visual Content Linking**: Automatically link images/charts to relevant text
- **Intelligent Search**: Semantic similarity with keyword boosting

### Key Features

✅ **Unified Knowledge Base**: PDF and website content searched together  
✅ **Automatic Visual Linking**: Images automatically linked to relevant chunks  
✅ **Smart Error Handling**: Blank/failed images automatically detected and removed  
✅ **Multi-tenant Isolation**: Each company has isolated knowledge base  
✅ **Real-time Processing**: Async queue-based processing pipeline  
✅ **Admin Dashboard**: Complete management interface  

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Admin Interface                         │
│  - Company Management                                        │
│  - PDF Upload                                                │
│  - Website Source Management                                 │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Content Ingestion Layer                    │
│  ┌──────────────┐              ┌──────────────┐            │
│  │ PDF Upload   │              │ Website      │            │
│  │ API          │              │ Crawl API    │            │
│  └──────┬───────┘              └──────┬───────┘            │
│         │                              │                    │
│         ▼                              ▼                    │
│  ┌──────────────────────────────────────────┐              │
│  │         Processing Queue                  │              │
│  └──────────────┬───────────────────────────┘              │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  Processing Pipeline                         │
│  ┌──────────────┐              ┌──────────────┐            │
│  │ PDF          │              │ Website      │            │
│  │ Processor    │              │ Processor    │            │
│  └──────┬───────┘              └──────┬───────┘            │
│         │                              │                    │
│         ▼                              ▼                    │
│  ┌──────────────────────────────────────────┐              │
│  │  - Text Extraction                        │              │
│  │  - Chunking                               │              │
│  │  - Embedding Generation                   │              │
│  │  - Visual Asset Extraction                │              │
│  │  - OCR (where needed)                     │              │
│  │  - Visual Linking                         │              │
│  └──────────────┬───────────────────────────┘              │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Company  │  │ Document │  │  Chunk   │  │ MediaAsset│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    RAG Search Engine                        │
│  ┌──────────────────────────────────────────┐              │
│  │  - Query Processing                       │              │
│  │  - Semantic Search                        │              │
│  │  - Relevancy Ranking                      │              │
│  │  - Visual Asset Resolution                │              │
│  └──────────────┬───────────────────────────┘              │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Chat Interface                            │
│  ┌──────────────┐              ┌──────────────┐            │
│  │ Text Widget  │              │ Visual       │            │
│  │ (Messages)   │              │ Display      │            │
│  └──────────────┘              └──────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### Component Details

#### 1. Admin Interface (`app/admin/companies/page.tsx`)
- Company CRUD operations
- PDF upload interface
- Website source management
- Crawl status monitoring

#### 2. Content Ingestion APIs
- **PDF Upload**: `POST /api/admin/media/upload`
- **Website Crawl**: `POST /api/admin/companies/:id/websites/:sourceId/crawl`

#### 3. Processing Queue (`src/lib/queue.ts`)
- In-memory queue for async processing
- Job types: `process-pdf`, `process-website`, `process-image`, `process-video`
- Sequential processing with error handling

#### 4. Processors
- **PDF Processor** (`src/lib/pdfProcessor.ts`): Text extraction, slide generation, OCR
- **Website Processor** (`src/lib/websiteProcessor.ts`): Page crawling, content extraction
- **Website Crawler** (`src/lib/websiteCrawler.ts`): HTML parsing, link following

#### 5. RAG Engine (`src/lib/rag.ts`)
- Semantic search using embeddings
- Relevancy ranking with multiple factors
- Visual asset resolution

#### 6. Chat API (`app/api/chat/:companyId/route.ts`)
- OpenAI integration
- Function calling (tools)
- Visual asset inclusion

---

## Content Sources

### PDF Documents

**Source Type**: `pdf_extract` (main document), `pdf_page_extract` (page-level slides)

**Processing Flow:**
1. Upload PDF via admin UI or API
2. Create `MediaAsset` record (type: "pdf")
3. Queue processing job
4. Extract text from all pages
5. Convert each page to image (slide)
6. Create main `Document` with extracted text
7. Create page-level `Document` records for each slide
8. Run OCR on image-based pages if needed
9. Chunk text and generate embeddings
10. Link slides to chunks via metadata

**Key Features:**
- Automatic slide extraction (page-to-image conversion)
- OCR for scanned/image-based PDFs
- Page-level chunking for better granularity
- Visual linking: slides linked to relevant text chunks

**Document Structure:**
- **Main Document**: `source: "pdf_extract"` - Contains full PDF text
- **Page Documents**: `source: "pdf_page_extract"` - Individual page slides
- **OCR Documents**: `source: "ocr"` - OCR text from image pages

### Website Content

**Source Type**: `website_page`

**Processing Flow:**
1. Create website source via admin UI or API
2. Create `MediaAsset` record (type: "website")
3. Queue crawl job
4. Recursively crawl pages (respecting maxPages, maxDepth)
5. For each page:
   - Extract text content
   - Collect images
   - Create `Document` with `source: "website_page"`
   - Store URL and headings path
   - Chunk text and generate embeddings
   - Link images to chunks
6. Store images as `MediaAsset` records (type: "image")

**Key Features:**
- Recursive crawling with depth control
- Image collection and storage
- URL and navigation path tracking
- Automatic chunking per page
- Image linking to content chunks

**Crawl Configuration:**
- `maxPages`: Maximum pages to crawl (default: 50)
- `maxDepth`: Maximum crawl depth (default: 3)
- `includeImages`: Whether to collect images (default: true)
- `forceReindex`: Re-crawl existing pages (default: false)

---

## Processing Pipelines

### PDF Processing Pipeline

**File**: `src/lib/pdfProcessor.ts`

**Steps:**

1. **Text Extraction**
   ```typescript
   const text = await extractTextFromPDF(pdfPath);
   ```

2. **Page-to-Image Conversion**
   ```typescript
   const slidePath = await convertPageToImage(pdfPath, pageNumber);
   ```

3. **OCR (if needed)**
   ```typescript
   if (isImageBased) {
     const ocrText = await extractTextFromImage(slidePath);
   }
   ```

4. **Document Creation**
   ```typescript
   const mainDoc = await ingestCompanyDoc({
     source: "pdf_extract",
     content: text,
     ...
   });
   ```

5. **Slide Document Creation**
   ```typescript
   const slideDoc = await ingestCompanyDoc({
     source: "pdf_page_extract",
     content: pageText,
     ...
   });
   ```

6. **Chunking & Embedding**
   ```typescript
   const chunks = chunkText(content);
   for (const chunk of chunks) {
     const embedding = await generateEmbedding(chunk);
     await createChunk({ content: chunk, embedding, ... });
   }
   ```

7. **Visual Linking**
   ```typescript
   chunk.metadata = {
     mediaAssetId: slideAssetId,
     pageNumber: pageNumber,
     ...
   };
   ```

### Website Processing Pipeline

**File**: `src/lib/websiteProcessor.ts`

**Steps:**

1. **Crawl Website**
   ```typescript
   const pages = await crawlWebsite(baseUrl, options);
   ```

2. **For Each Page:**
   - Extract text
   - Collect images
   - Create document
   - Chunk content
   - Link images

3. **Image Processing**
   ```typescript
   for (const image of page.images) {
     const imageAsset = await addMediaAsset({
       type: "image",
       url: image.url,
       ...
     });
     pageImageAssetIds.push(imageAsset.id);
   }
   ```

4. **Chunk Linking**
   ```typescript
   chunk.metadata = {
     mediaAssetId: primaryImageId,
     imageAssetIds: allImageIds,
     sourceType: "website",
     ...
   };
   ```

---

## RAG Search System

### Overview

The RAG (Retrieval-Augmented Generation) system searches across **all content sources** (PDFs and websites) simultaneously using semantic similarity.

**File**: `src/lib/rag.ts`

### Search Process

1. **Query Processing**
   - Extract keywords
   - Generate query embedding
   - Identify query intent (visual, time-based, etc.)

2. **Chunk Retrieval**
   ```typescript
   // Get chunks from all sources
   const chunks = await prisma.chunk.findMany({
     where: { companyId },
     include: { document: true }
   });
   ```

3. **Semantic Similarity**
   ```typescript
   const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
   ```

4. **Relevancy Ranking**

   **Factors:**
   - **Semantic Similarity** (primary): Cosine similarity of embeddings
   - **Keyword Boost**: +0.3 for exact keyword matches
   - **Document Title Match**: +0.2 for title matches
   - **Visual Keyword Boost**: +0.15 for visual queries with linked images
   - **Quarter Penalty**: -0.2 for irrelevant quarters

   **Formula:**
   ```typescript
   score = semanticSimilarity 
         + keywordBoost 
         + titleMatchBoost 
         + visualBoost 
         - quarterPenalty
   ```

5. **Visual Asset Resolution**
   ```typescript
   // Extract mediaAssetIds from top chunks
   const mediaAssetIds = topChunks
     .map(c => c.metadata?.mediaAssetId)
     .filter(Boolean);
   ```

6. **Result Formatting**
   - Top N chunks by score
   - Associated visual assets
   - Source information

### Search Features

#### Unified Search
- Searches PDF and website content together
- No source filtering - all chunks considered
- Semantic similarity determines relevance

#### Keyword Boosting
- Exact keyword matches get +0.3 boost
- Helps surface specific information

#### Visual Detection
- Detects visual keywords: "show", "chart", "image", "diagram"
- Boosts chunks with linked images by +0.15
- Only applies when query asks for visuals

#### Time-based Queries
- Special handling for quarter/year queries
- Boosts matching time periods
- Penalizes irrelevant time periods

### Example Search Flow

**Query**: "Show me Q1 2024 revenue charts"

1. Extract keywords: ["Q1", "2024", "revenue", "charts"]
2. Detect visual intent: "charts" → visual boost enabled
3. Search all chunks for company
4. Calculate scores:
   - Semantic similarity to query
   - +0.3 for "Q1 2024" keyword match
   - +0.2 for document title containing "Q1 2024"
   - +0.15 for chunks with linked images (visual boost)
   - -0.2 for chunks mentioning other quarters
5. Rank by score
6. Extract visual assets from top chunks
7. Return: Top chunks + linked images

---

## Visual Content System

### Visual Asset Types

- **image**: Regular images
- **chart**: Charts and graphs
- **slide**: PDF page slides
- **video**: Video content
- **website**: Website source reference

### Visual Linking

**How It Works:**

1. **During Processing:**
   - PDF: Slides linked to page-level chunks
   - Website: Images linked to page chunks

2. **Metadata Storage:**
   ```typescript
   chunk.metadata = {
     mediaAssetId: "primary-image-id",
     imageAssetIds: ["id1", "id2", ...],
     pageNumber: 5,  // For PDF slides
     sourceType: "website" | "pdf"
   };
   ```

3. **During Search:**
   - Top chunks examined for `mediaAssetId`
   - Visual assets fetched from database
   - Returned with search results

### Visual Display

**Frontend Component**: `src/components/WidgetChatText.tsx`

**Features:**
- Automatic display of linked visuals
- Deduplication (by URL and asset ID)
- Error handling for failed images
- Periodic checks for blank images
- Immediate removal of failed images

**Error Handling:**
- Detects failed image loads
- Removes blank images automatically
- Periodic checks every 1 second
- Timeout detection (2 seconds)

---

## API Reference

### Chat API

**Endpoint**: `POST /api/chat/:companyId`

**Request:**
```typescript
{
  sessionId?: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}
```

**Response:**
```typescript
{
  sessionId: string;
  reply: {
    role: "assistant";
    content: string;
  };
  visualAssets?: Array<{
    type: string;
    url: string;
    title: string;
    description?: string;
  }>;
  demoClipUrl?: string;
  meetingLink?: string;
}
```

### Admin APIs

#### List Companies
```bash
GET /api/admin/companies
```

#### Create Company
```bash
POST /api/admin/companies
Content-Type: application/json

{
  "slug": "company-slug",
  "displayName": "Company Name",
  "shortDescription": "Description",
  "websiteUrl": "https://example.com",
  "config": {
    "productSummary": "...",
    "personas": ["vp_ecommerce", "pricing_manager"],
    ...
  }
}
```

#### Upload Media
```bash
POST /api/admin/media/upload
Content-Type: multipart/form-data

companyId: <company-id>
file: <file>
title?: <optional-title>
description?: <optional-description>
```

#### Create Website Source
```bash
POST /api/admin/media/upload
Content-Type: application/json

{
  "companyId": "<company-id>",
  "type": "website",
  "url": "https://example.com",
  "title": "Website Title",
  "description": "Description"
}
```

#### Trigger Website Crawl
```bash
POST /api/admin/companies/:companyId/websites/:sourceId/crawl
Content-Type: application/json

{
  "maxPages": 50,
  "maxDepth": 3,
  "includeImages": true,
  "forceReindex": false
}
```

**Response:**
```json
{
  "jobId": "job-id",
  "status": "queued"
}
```

#### Get Website Source Status
```bash
GET /api/admin/companies/:companyId/websites/:sourceId/crawl
```

**Response:**
```json
{
  "status": "completed",
  "stats": {
    "pagesProcessed": 25,
    "imagesCollected": 45,
    "documentsCreated": 25
  },
  "lastCrawled": "2024-01-01T00:00:00Z"
}
```

---

## Admin Interface

### Company Management Page

**URL**: `/admin/companies`

**Features:**
- List all companies
- Create new companies
- View company details
- Manage content sources

### Website Source Management

**Features:**
- Create website source
- Configure crawl options
- Trigger manual crawls
- View crawl status
- Re-crawl websites

**UI Components:**
- Website source form
- Crawl status display
- Action buttons (Crawl, Re-crawl, Chat)

---

## Database Schema

### Core Models

#### Company
```prisma
model Company {
  id               String       @id @default(cuid())
  slug             String       @unique
  displayName      String
  shortDescription String
  websiteUrl       String?
  config           Json
  documents        Document[]
  chunks           Chunk[]
  mediaAssets      MediaAsset[]
}
```

#### Document
```prisma
model Document {
  id          String   @id @default(cuid())
  companyId   String
  title       String
  source      String   // "pdf_extract", "pdf_page_extract", "website_page", "ocr"
  content     String?
  url         String?  // For website pages
  headingsPath String? // For website pages
  mediaAssetId String? // Source reference
  chunks      Chunk[]
}
```

#### Chunk
```prisma
model Chunk {
  id          String   @id @default(cuid())
  documentId  String
  companyId   String
  content     String
  embedding   String? // JSON array of embeddings
  metadata    String? // JSON with mediaAssetId, pageNumber, etc.
  document    Document @relation(...)
}
```

#### MediaAsset
```prisma
model MediaAsset {
  id          String   @id @default(cuid())
  companyId   String
  type        String   // "image", "video", "pdf", "slide", "chart", "website"
  url         String
  title       String
  description String?
  metadata    String? // JSON
}
```

### Key Relationships

- `Company` → `Document` (1:many)
- `Document` → `Chunk` (1:many)
- `Chunk.metadata.mediaAssetId` → `MediaAsset` (many:1, via metadata)
- `Document.mediaAssetId` → `MediaAsset` (many:1, source reference)

---

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...
DATABASE_URL=file:./prisma/dev.db  # or PostgreSQL URL

# Optional
MEETING_BASE_URL=https://calendly.com/...
NODE_ENV=development
```

### Company Configuration

```typescript
{
  "productSummary": "Detailed product description...",
  "personas": ["vp_ecommerce", "pricing_manager", "cfo"],
  "toneGuidelines": "Professional and friendly",
  "ragIndexName": "rag_company-slug",
  "demoNamespace": "company-slug",
  "features": {
    "canBookMeetings": true,
    "canShowDemoClips": true,
    "canLogLeads": true
  }
}
```

---

## Troubleshooting

### Common Issues

#### Images Not Showing

**Symptoms**: Blank slots or missing images

**Solutions:**
1. Check browser console for errors
2. Verify image URLs are accessible
3. Check CORS settings for external images
4. Review server logs for processing errors
5. System automatically removes blank images after detection

#### Search Not Finding Content

**Symptoms**: AI says "I don't have that information"

**Solutions:**
1. Verify documents were processed (check database)
2. Check chunks exist: `SELECT COUNT(*) FROM Chunk WHERE companyId = ?`
3. Verify embeddings were generated
4. Test with simpler queries first
5. Check RAG logs for search results

#### Website Crawl Failing

**Symptoms**: Crawl stuck or no pages processed

**Solutions:**
1. Check robots.txt restrictions
2. Verify URL is accessible
3. Reduce maxPages/maxDepth
4. Check crawl logs for errors
5. Verify network connectivity

#### Processing Queue Stuck

**Symptoms**: Jobs not processing

**Solutions:**
1. Check queue status in logs
2. Verify OpenAI API key is valid
3. Check for rate limiting
4. Review error logs
5. Restart server if needed

### Debug Scripts

**Check Company Data:**
```bash
npx tsx scripts/listCompanies.ts
```

**Check RAG Results:**
```bash
npx tsx scripts/checkRAG.ts --companyId=<id> --query="test"
```

**Link Website Images:**
```bash
npx tsx scripts/linkWebsiteImagesToChunks.ts --companyId=<id>
```

---

## Best Practices

### Content Ingestion

1. **PDFs**: Upload complete documents, system handles chunking
2. **Websites**: Start with homepage, let system crawl
3. **Images**: System automatically collects and links
4. **Re-crawling**: Use sparingly, only when content changes

### Search Optimization

1. **Query Clarity**: Use specific queries for better results
2. **Visual Queries**: Include visual keywords for image results
3. **Time Queries**: Be specific about quarters/years

### Performance

1. **Chunk Limits**: Adjust chunk limits based on content volume
2. **Embedding Cache**: Consider caching embeddings
3. **Database Indexes**: Ensure proper indexes on companyId, documentId

---

## Future Enhancements

- [ ] Vector database integration (Pinecone, Weaviate)
- [ ] Scheduled website crawls
- [ ] Advanced image processing (thumbnails, optimization)
- [ ] Multi-language support
- [ ] Analytics and reporting
- [ ] Authentication/authorization
- [ ] Rate limiting
- [ ] Caching layer

---

**Last Updated**: 2024-12-29  
**Version**: 1.0.0
