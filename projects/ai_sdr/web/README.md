# AI SDR Platform - Multimodal RAG System

A comprehensive multi-tenant AI Sales Development Representative (SDR) platform with multimodal RAG (Retrieval-Augmented Generation) capabilities. The platform supports PDF document ingestion, website crawling, visual content extraction, and intelligent knowledge retrieval.

## 🚀 Features

### Core Capabilities
- **Multi-tenant Architecture**: Isolated knowledge bases per company/tenant
- **Multimodal RAG**: Search across PDF documents and website content simultaneously
- **Visual Content Extraction**: Automatic extraction and linking of images, charts, and slides
- **Intelligent Search**: Semantic similarity with keyword boosting and relevancy ranking
- **Real-time Chat**: Embeddable chat widget with visual content display
- **Admin Dashboard**: Complete management interface for companies and content sources

### Content Sources
- **PDF Documents**: 
  - Text extraction and chunking
  - Page-level slide extraction
  - OCR for image-based PDFs
  - Automatic visual linking
- **Website Crawling**:
  - Recursive page crawling
  - Text and image extraction
  - Automatic chunking and indexing
  - Image collection and linking

### Visual Content
- **Automatic Display**: Relevant images, charts, and slides shown alongside answers
- **Smart Linking**: Visual content automatically linked to relevant text chunks
- **Error Handling**: Automatic detection and removal of failed/blank images
- **Deduplication**: Prevents duplicate visual assets from appearing

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Content Ingestion](#content-ingestion)
- [RAG Search](#rag-search)
- [API Reference](#api-reference)
- [Admin Interface](#admin-interface)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

## 🏃 Quick Start

### Prerequisites
- Node.js 18+ and npm
- SQLite (or PostgreSQL for production)
- OpenAI API key

### Installation

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd web
   npm install
   ```

2. **Configure Environment**
   Create `.env.local`:
   ```bash
   OPENAI_API_KEY=sk-your-key-here
   DATABASE_URL=file:./prisma/dev.db
   ```

3. **Setup Database**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Access Admin Interface**
   Open http://localhost:3000/admin/companies

## 🏗️ Architecture

### System Overview

```
┌─────────────────┐
│   Admin UI      │  ──► Company & Source Management
└────────┬────────┘
         │
┌────────▼────────┐
│  Content        │  ──► PDF Upload / Website Crawl
│  Ingestion      │
└────────┬────────┘
         │
┌────────▼────────┐
│  Processing     │  ──► Chunking / OCR / Image Extraction
│  Pipeline       │
└────────┬────────┘
         │
┌────────▼────────┐
│  RAG Search     │  ──► Semantic Search + Visual Linking
│  Engine         │
└────────┬────────┘
         │
┌────────▼────────┐
│  Chat Widget    │  ──► User Interface
└─────────────────┘
```

### Database Schema

**Core Models:**
- `Company`: Tenant/company configuration
- `Document`: Source documents (PDFs, website pages)
- `Chunk`: Text chunks with embeddings for RAG
- `MediaAsset`: Visual assets (images, slides, videos)
- `Chunk.metadata`: Links chunks to visual assets

**Key Relationships:**
- `Document` → `Chunk` (1:many)
- `Chunk.metadata.mediaAssetId` → `MediaAsset` (many:1)
- `Document.mediaAssetId` → `MediaAsset` (source reference)

### Data Flow

1. **Ingestion**: PDF upload or website crawl creates `Document` and `MediaAsset` records
2. **Processing**: Text extraction → chunking → embedding generation
3. **Linking**: Visual assets linked to chunks via metadata
4. **Retrieval**: Query → semantic search → chunk ranking → visual asset resolution
5. **Display**: Text response + linked visual assets

## 📥 Content Ingestion

### PDF Documents

**Via Admin UI:**
1. Navigate to `/admin/companies`
2. Select a company
3. Upload PDF files
4. System automatically:
   - Extracts text and creates chunks
   - Extracts pages as slides (images)
   - Runs OCR on image-based pages
   - Links slides to relevant chunks

**Via API:**
```bash
POST /api/admin/media/upload
Content-Type: multipart/form-data

companyId: <company-id>
file: <pdf-file>
```

**Processing Pipeline:**
- Text extraction from PDF
- Page-to-image conversion (slides)
- OCR for image-based content
- Chunking with overlap
- Embedding generation
- Visual linking

### Website Crawling

**Via Admin UI:**
1. Navigate to `/admin/companies`
2. Select a company
3. Create website source:
   - Enter website URL
   - Configure crawl options (max pages, depth, include images)
4. Click "Crawl" to start

**Via API:**
```bash
POST /api/admin/companies/:companyId/websites/:sourceId/crawl
Content-Type: application/json

{
  "maxPages": 50,
  "maxDepth": 3,
  "includeImages": true
}
```

**Processing Pipeline:**
- Recursive page crawling
- Text extraction from HTML
- Image collection
- Chunking per page
- Embedding generation
- Image linking to chunks

**Via CLI:**
```bash
npm run create:website -- \
  --companyId=<id> \
  --url=https://example.com \
  --maxPages=50 \
  --maxDepth=3 \
  --includeImages=true
```

## 🔍 RAG Search

### How It Works

The RAG system searches across **all content sources** (PDFs and websites) simultaneously:

1. **Query Processing**: User question → semantic search
2. **Chunk Retrieval**: Finds relevant chunks from all sources
3. **Relevancy Ranking**:
   - Semantic similarity (primary)
   - Keyword matching boost
   - Document title matching
   - Visual keyword boost (for image queries)
4. **Visual Resolution**: Extracts linked `mediaAssetId`s from top chunks
5. **Response**: Text answer + visual assets

### Search Features

- **Unified Search**: PDF and website content searched together
- **Semantic Similarity**: Uses embeddings for meaning-based matching
- **Keyword Boosting**: Exact keyword matches get score boost
- **Visual Detection**: Queries asking for images/charts get visual boost
- **Quarter/Date Matching**: Special handling for time-based queries

### Example Queries

- "Show me Q1 2024 revenue" → Finds relevant PDF slides and website content
- "What features do you offer?" → Searches both PDF docs and website pages
- "Show me pricing charts" → Boosts chunks with linked images

## 🔌 API Reference

### Chat API

**Endpoint:** `POST /api/chat/:companyId`

**Request:**
```json
{
  "sessionId": "optional-session-id",
  "messages": [
    {
      "role": "user",
      "content": "What are your features?"
    }
  ]
}
```

**Response:**
```json
{
  "sessionId": "session-id",
  "reply": {
    "role": "assistant",
    "content": "Answer text..."
  },
  "visualAssets": [
    {
      "type": "image",
      "url": "/uploads/images/...",
      "title": "Feature Overview"
    }
  ]
}
```

### Admin APIs

**List Companies:**
```bash
GET /api/admin/companies
```

**Create Company:**
```bash
POST /api/admin/companies
Content-Type: application/json

{
  "slug": "company-slug",
  "displayName": "Company Name",
  "shortDescription": "Description",
  "config": { ... }
}
```

**Upload Media:**
```bash
POST /api/admin/media/upload
Content-Type: multipart/form-data

companyId: <id>
file: <file>
```

**Crawl Website:**
```bash
POST /api/admin/companies/:companyId/websites/:sourceId/crawl
Content-Type: application/json

{
  "maxPages": 50,
  "maxDepth": 3,
  "includeImages": true
}
```

## 🎨 Admin Interface

### Company Management

Access at `/admin/companies`:

- **Create Companies**: Add new tenants with configuration
- **View Companies**: List all companies with status
- **Manage Sources**: Upload PDFs, create website sources
- **Monitor Processing**: View crawl status, processing jobs

### Website Source Management

- **Create Source**: Add website URL and crawl configuration
- **Trigger Crawl**: Manual crawl trigger with options
- **View Status**: See crawl progress and results
- **Re-crawl**: Update website content

## 🐛 Troubleshooting

### Images Not Showing

1. **Check Console**: Look for `❌ FAILED to load image` messages
2. **Verify URLs**: Ensure image URLs are accessible
3. **Check CORS**: External images may be blocked
4. **Review Logs**: Server logs show image processing status

### Search Not Finding Content

1. **Verify Ingestion**: Check that documents were processed
2. **Check Chunks**: Use scripts to verify chunks exist
3. **Review Embeddings**: Ensure embeddings were generated
4. **Test Query**: Try simpler queries first

### Website Crawl Issues

1. **Check Robots.txt**: Some sites block crawlers
2. **Verify URL**: Ensure URL is accessible
3. **Review Logs**: Check crawl logs for errors
4. **Limit Scope**: Reduce maxPages/maxDepth if timeout

### Common Issues

**Blank Images:**
- System automatically detects and removes blank images
- Check console for periodic check messages
- Verify image URLs are valid

**Slow Search:**
- Reduce chunk limit in search
- Optimize database indexes
- Consider caching

**Processing Failures:**
- Check queue status
- Review error logs
- Verify OpenAI API key

## 🛠️ Development

### Project Structure

```
web/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── admin/             # Admin pages
│   └── widget/            # Widget pages
├── src/
│   ├── components/        # React components
│   ├── lib/               # Core libraries
│   │   ├── rag.ts        # RAG search engine
│   │   ├── pdfProcessor.ts
│   │   ├── websiteCrawler.ts
│   │   └── websiteProcessor.ts
│   └── types/             # TypeScript types
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Database migrations
├── scripts/               # Utility scripts
└── docs/                  # Documentation
```

### Key Libraries

- **RAG (`src/lib/rag.ts`)**: Core search and ranking logic
- **PDF Processor (`src/lib/pdfProcessor.ts`)**: PDF text/slide extraction
- **Website Crawler (`src/lib/websiteCrawler.ts`)**: Website crawling
- **Website Processor (`src/lib/websiteProcessor.ts`)**: Website content processing
- **Tools (`src/lib/tools.ts`)**: AI function tool dispatcher

### Scripts

**Development:**
```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
```

**Utilities:**
```bash
npm run create:website   # Create website source
npm run link:website:images  # Link website images
```

### Testing

See `docs/TESTING_GUIDE.md` for comprehensive testing instructions.

## 📚 Documentation

- [Setup Guide](SETUP.md) - Detailed setup instructions
- [Website Crawling](docs/WEBSITE_CRAWLING_QUICKSTART.md) - Website crawl guide
- [PDF Processing](docs/PDF_SLIDE_EXTRACTION.md) - PDF extraction details
- [RAG Implementation](RAG_IMPLEMENTATION.md) - RAG system details
- [Testing Guide](docs/TESTING_GUIDE.md) - Testing procedures

## 🔐 Security

- **API Authentication**: Add authentication for admin APIs
- **CORS Configuration**: Configure CORS for production
- **Rate Limiting**: Implement rate limiting for APIs
- **Input Validation**: Validate all user inputs

## 📝 License

[Your License Here]

## 🤝 Contributing

[Contributing Guidelines]

---

**Built with:** Next.js, Prisma, OpenAI, TypeScript
