# Directory Structure – AI SDR Platform

> **Maintenance:** Update this document whenever you add, remove, or rename files or folders. Keep one-line descriptions accurate. Run a quick sanity check after major changes.

---

## Root (`web/`)

| File | Description |
|------|-------------|
| `.gitignore` | Git ignore rules (node_modules, .env, data/leads, data/conversations, etc.) |
| `eslint.config.mjs` | ESLint configuration |
| `next.config.ts` | Next.js config (images, rewrites, etc.) |
| `package.json` | Dependencies and npm scripts |
| `package-lock.json` | Locked dependency versions |
| `postcss.config.mjs` | PostCSS config for Tailwind |
| `tsconfig.json` | TypeScript config |
| `next-env.d.ts` | Next.js TypeScript declarations |
| `README.md` | Project overview, features, quick start |
| `SETUP.md` | Setup and usage guide |
| `IMPLEMENTATION_SUMMARY.md` | What’s built: files, features, API, checklist |
| `QUICK_REFERENCE.md` | Repo path, GitHub URL, common commands |
| `REALTIME_API.md` | OpenAI Realtime API: voice flow, VAD, tools, troubleshooting |
| `TAVUS_INTEGRATION_COMPLETE.md` | Tavus CVI integration guide |
| `TAVUS_INTEGRATION_ANALYSIS.md` | Tavus integration design and options |
| `RAG_IMPLEMENTATION.md` | RAG implementation details |
| `HYBRID_RAG_ARCHITECTURE.md` | Hybrid RAG design (semantic + keyword) |
| `HYBRID_SEARCH_SETUP.md` | Hybrid search setup |
| `MULTIMODAL_QUICKSTART.md` | Multimodal content quick start |
| `MULTIMODAL_CONTENT.md` | Multimodal content ingestion and usage |
| `VISUAL_CONTENT.md` | Visual content: extraction, linking, display |
| `VOICE_FEATURES.md` | Voice features (Realtime, Tavus) |
| `COST_MONITORING.md` | Cost monitoring and usage |

---

## `app/` – Next.js App Router

| File | Description |
|------|-------------|
| `layout.tsx` | Root layout (metadata, fonts, body) |
| `page.tsx` | Landing page |
| `globals.css` | Global Tailwind and custom styles |

### `app/admin/` – Admin UI

| File | Description |
|------|-------------|
| `admin/companies/page.tsx` | Company list, create, manage; website sources; embed code; Tier 1 BYOK config |
| `admin/companies/[id]/media/page.tsx` | Company media management (upload, view, crawl) |

### `app/api/` – API Routes

| File | Description |
|------|-------------|
| `api/chat/[companyId]/route.ts` | Chat completion (tools, visuals); auto-logs each conversation |
| `api/chat/[companyId]/tool/route.ts` | Tool execution for Realtime function calls |
| `api/chat/[companyId]/log-conversation/route.ts` | Client-triggered conversation logging (Realtime) |
| `api/realtime/session/route.ts` | Realtime session: returns API key and model for WebSocket |
| `api/tavus/session/route.ts` | Tavus session creation (CVI persona, room) |
| `api/tavus/callback/route.ts` | Tavus tool-call callback (executes search, demo, meeting, etc.) |
| `api/tavus/tool/route.ts` | Tavus tool execution (alternative endpoint) |
| `api/admin/companies/route.ts` | GET list, POST create companies |
| `api/admin/companies/[id]/route.ts` | GET, PUT, DELETE single company; PUT accepts useTavusVideo, tavusReplicaId, tavusPersonaId, billingTier, openaiApiKey |
| `api/admin/companies/[id]/media/route.ts` | Company media assets |
| `api/admin/companies/[id]/websites/[sourceId]/crawl/route.ts` | Trigger website crawl, get crawl status |
| `api/admin/media/upload/route.ts` | PDF upload; website source creation |
| `api/admin/media/jobs/[jobId]/route.ts` | Job status (processing, PDF, website) |

### `app/widget/` – Embeddable Widgets

| File | Description |
|------|-------------|
| `widget/[companyId]/page.tsx` | Realtime voice widget (embed URL) |
| `widget-text/[companyId]/page.tsx` | Text+visuals chat widget (embed URL) |

---

## `src/` – Source Code

### `src/app/`

| File | Description |
|------|-------------|
| `app/page.tsx` | App home page |
| `app/favicon.ico` | Favicon |

### `src/components/`

| File | Description |
|------|-------------|
| `VideoPlayer.tsx` | Video playback component |
| `WidgetChat.tsx` | Base chat widget (reusable) |
| `WidgetChatText.tsx` | Text chat with visuals, demo, meeting; idle timeout |
| `WidgetChatRealtime.tsx` | Realtime voice chat; idle timeout; log on disconnect |
| `WidgetChatTavus.tsx` | Tavus video avatar chat |
| `WidgetChatUnified.tsx` | Unified widget (mode switcher); Tavus video only when company has useTavusVideo) |

### `src/lib/` – Core Libraries

| File | Description |
|------|-------------|
| `prisma.ts` | Prisma client singleton |
| `openai.ts` | OpenAI client (lazy init) |
| `companies.ts` | Company config and data access |
| `systemPrompt.ts` | AI system prompt builder |
| `rag.ts` | RAG: semantic search, ranking, visual linking |
| `hybridSearch.ts` | Hybrid search (Tavus KB + multimodal RAG) |
| `smartSearch.ts` | Smart search utilities |
| `tools.ts` | Tool definitions and dispatcher (search, demo, meeting, show_visual) |
| `toolDefinitions.ts` | OpenAI function tool definitions (client-safe) |
| `crm.ts` | Conversation logging; AI classification; logLeadToCRM (legacy) |
| `scheduling.ts` | Meeting link generation (Calendly-style) |
| `demoMedia.ts` | Demo clip retrieval by persona/intent |
| `media.ts` | Media asset management (search, CRUD) |
| `pdfProcessor.ts` | PDF text extraction, slide generation, OCR |
| `websiteCrawler.ts` | Recursive website crawl |
| `websiteProcessor.ts` | Website content chunking and processing |
| `imageProcessor.ts` | Image OCR (GPT-4 Vision) |
| `ocr.ts` | OCR abstraction layer |
| `videoProcessor.ts` | Video processing (frames, transcription) |
| `queue.ts` | Async processing queue (PDF, website jobs) |
| `realtime.ts` | RealtimeClient: WebSocket, audio, tools |
| `tavus.ts` | Tavus API client (personas, sessions) |

### `src/types/`

| File | Description |
|------|-------------|
| `chat.ts` | Chat types: ChatMessage, CompanyConfig, ChatRequest, etc. |

---

## `prisma/`

| File | Description |
|------|-------------|
| `schema.prisma` | DB schema (Company, Document, Chunk, MediaAsset, etc.) |
| `dev.db` | SQLite dev database |
| `migrations/migration_lock.toml` | Migration lock file |
| `migrations/20251123175606_init/migration.sql` | Initial schema |
| `migrations/20251126010153_hypersonix/migration.sql` | Hypersonix company |
| `migrations/20251127130749_npm_run_seed_visuals/migration.sql` | Visuals seed |
| `migrations/20251127163808_ocr_an_dvideo/migration.sql` | OCR and video |
| `migrations/20251204231018_add_tavus_fields/migration.sql` | Tavus fields |
| `migrations/20251229081243_add_website_support/migration.sql` | Website support |
| `migrations/20260208030501_add_use_visuals/migration.sql` | useVisuals (images/demos off by default) |

---

## `scripts/` – Utility Scripts

| File | Description |
|------|-------------|
| `listCompanies.ts` | List all companies |
| `createWebsiteSource.ts` | Create website source for a company |
| `linkWebsiteImagesToChunks.ts` | Link website images to chunks |
| `seedHypersonixDocs.ts` | Seed Hypersonix docs |
| `seedHypersonixVisuals.ts` | Seed Hypersonix visuals |
| `seedHypersonixVisualsReal.ts` | Seed Hypersonix visuals (real) |
| `seedQuantivalQDocs.ts` | Seed QuantivalQ docs |
| `seedQuantivalQImages.ts` | Seed QuantivalQ images |
| `createQuantivalQ.ts` | Create QuantivalQ company |
| `uploadAirbnbPDFs.ts` | Upload Airbnb PDFs |
| `uploadQuantivalQText.ts` | Upload QuantivalQ text |
| `reprocessPDFsForPageChunks.ts` | Reprocess PDFs for page chunks |
| `reprocessPDFSlides.ts` | Reprocess PDF slides |
| `reprocessVideo.ts` | Reprocess video |
| `convertToMP4.ts` | Convert video to MP4 |
| `processImage.ts` | Process single image |
| `checkProcessing.ts` | Check processing status |
| `checkProcessingErrors.ts` | Check processing errors |
| `checkRAG.ts` | Check RAG index |
| `checkSlideStatus.ts` | Check slide status |
| `checkReadySlides.ts` | Check ready slides |
| `checkVisuals.ts` | Check visuals |
| `checkVideoLogs.ts` | Check video logs |
| `checkFrameAnalysis.ts` | Check frame analysis |
| `checkQ1ChartSlides.ts` | Check Q1 chart slides |
| `checkQ1Chunks.ts` | Check Q1 chunks |
| `checkQ1Content.ts` | Check Q1 content |
| `checkQ1FinancialResults.ts` | Check Q1 financial results |
| `checkQuantivalQData.ts` | Check QuantivalQ data |
| `checkQuantivalQRAG.ts` | Check QuantivalQ RAG |
| `testQ1Search.ts` | Test Q1 search |
| `testQuantivalQImages.ts` | Test QuantivalQ images |
| `testQuantivalQRAG.ts` | Test QuantivalQ RAG |
| `testLinkedVisuals.ts` | Test linked visuals |
| `testVisualFlow.ts` | Test visual flow |
| `testOCR.ts` | Test OCR |
| `testTavus.ts` | Test Tavus |
| `testTavusIntegration.ts` | Test Tavus integration |
| `testTavusSession.ts` | Test Tavus session |
| `testTavusCVI.ts` | Test Tavus CVI |
| `verifyRealtimeApi.ts` | Verify Realtime API key and access |
| `verifyQuantivalQPDF.ts` | Verify QuantivalQ PDF |
| `viewVideoDetails.ts` | View video details |
| `debugQ1Search.ts` | Debug Q1 search |
| `cleanupAndReset.ts` | Cleanup and reset |
| `clearQuantivalQData.ts` | Clear QuantivalQ data |
| `deleteFailedPDF.ts` | Delete failed PDF |
| `configureTavusReplica.ts` | Configure Tavus replica |
| `getReplicaDetails.ts` | Get Tavus replica details |
| `listTavusReplicas.ts` | List Tavus replicas |

---

## `public/` – Static Assets

| File | Description |
|------|-------------|
| `realtime-audio-worklet.js` | AudioWorklet for Realtime mic capture (resample to 24kHz, PCM16) |
| `globe.svg` | Globe icon |
| `next.svg` | Next.js logo |
| `vercel.svg` | Vercel logo |
| `window.svg` | Window icon |

### `public/uploads/` – User-Uploaded & Generated Content

| Path | Description |
|------|-------------|
| `uploads/pdfs/` | Uploaded PDFs |
| `uploads/slides/` | Generated PDF slides (PNG) |
| `uploads/images/` | Uploaded/generated images |
| `uploads/videos/` | Uploaded videos |
| `uploads/frames/` | Video frame snapshots |

---

## `docs/` – Documentation

| File | Description |
|------|-------------|
| `README.md` | Doc index: where docs live, what each covers |
| `DIRECTORY_STRUCTURE.md` | This file: full directory structure and file descriptions |
| `COMPLETE_SYSTEM_DOCUMENTATION.md` | Full system: architecture, API, DB, config |
| `CONVERSATION_LOGGING.md` | Conversation logging, AI classification, idle timeout |
| `ENTERPRISE_VALUE_PROPOSITION.md` | Enterprise sales pitch and talking points |
| `ACCESS_SDR_WIDGET.md` | How to access the SDR widget |
| `ACCESS_MEDIA_PAGE.md` | How to access the media/admin page |
| `PDF_CHUNK_ARCHITECTURE.md` | How PDFs are chunked and stored |
| `PDF_SLIDE_EXTRACTION.md` | Slide extraction from PDFs |
| `PDF_TEST_QUERIES.md` | Test queries for PDF RAG |
| `SLIDE_EXTRACTION_TEST_QUERIES.md` | Test queries for slide extraction |
| `LINKED_VISUALS_TEST_QUERIES.md` | Test queries for linked visuals |
| `WEBSITE_CRAWLING_DESIGN.md` | Website crawling design |
| `WEBSITE_CRAWLING_IMPLEMENTATION.md` | Website crawling implementation |
| `WEBSITE_CRAWLING_QUICKSTART.md` | Website crawling quick start |
| `WEBSITE_CRAWLING_USAGE.md` | Website crawling usage |
| `WEBSITE_IMAGES_FIX.md` | Fixes for website image issues |
| `TESTING_GUIDE.md` | Testing procedures |
| `DEBUG_NO_IMAGES.md` | Debugging when images don’t show |
| `TAVUS_STATUS_CHECK.md` | How to check Tavus integration status |
| `TIER1_CLIENT_REQUIREMENTS.md` | Tier 1 BYOK: what clients must provide |
| `TIER1_BYOK_CLIENT_REQUIREMENTS.md` | Tier 1 BYOK: client requirements (alternative) |
| `TIER1_CLIENT_IMPLEMENTATION_GUIDE_INTERNAL.md` | Tier 1 BYOK: internal onboarding steps |
| `COMPANIES_WITH_PUBLIC_PDFS.md` | Companies with public PDFs |
| `AIRBNB_RESOURCES.md` | Airbnb-related resources |
| `DOWNLOAD_INSTRUCTIONS.md` | Download instructions |
| `HOW_TO_CONTINUE_SESSION.md` | How to resume a dev session |
| `SESSION_SUMMARY_2024-12-29.md` | Session notes (Dec 29, 2024) |
| `2025-12-13-session-summary.md` | Session summary (Dec 13, 2025) |
| `2025-12-23-session-summary.md` | Session summary (Dec 23, 2025) |

---

## `downloads/` – Downloaded Assets

| Path | Description |
|------|-------------|
| `airbnb-docs/README.md` | Notes for Airbnb downloaded docs |
| `airbnb-presentations/` | Airbnb investor PDFs (manually placed) |

---

## `data/` – Runtime Data (gitignored)

| Path | Description |
|------|-------------|
| `data/leads/` | Legacy lead logs (one JSONL file per company) |
| `data/conversations/` | Conversation logs (one JSONL file per company, AI-classified) |

---

## Maintenance Checklist

When evolving the project:

- [ ] Add new files/folders to this document with one-line descriptions
- [ ] Remove or update entries for deleted/renamed files
- [ ] Adjust descriptions if behavior changes
- [ ] Keep `docs/README.md` in sync if docs move or are added
