# Documentation Index

This folder and the project root contain all documentation for the AI SDR platform. Below: where docs live and what each file covers.

---

## 📁 Where the docs are

- **`docs/`** – Most feature guides, architecture, testing, and session notes.
- **Project root** (`web/`) – Top-level docs: README, setup, integrations (Realtime, Tavus, RAG, etc.), and quick reference.

---

## 📂 Root-level docs (`web/*.md`)

| File | Type | What it covers |
|------|------|----------------|
| **README.md** | Project overview | High-level description, features, content sources, visual content, quick start, development commands. |
| **QUICK_REFERENCE.md** | Reference | Repo path, GitHub URL, “where am I” checks, common commands. |
| **SETUP.md** | Setup | Environment, database, and getting the app running. |
| **IMPLEMENTATION_SUMMARY.md** | Implementation | What’s built: files created/updated, core libs, API routes, admin UI, checklist. |
| **REALTIME_API.md** | Integration guide | OpenAI Realtime API: voice flow, audio format, WebSocket, VAD, tools, costs, troubleshooting, **current status and fixes**. |
| **TAVUS_INTEGRATION_COMPLETE.md** | Integration guide | Tavus CVI (Conversational Video Interface): persona, session, callback, tools, status. |
| **TAVUS_INTEGRATION_ANALYSIS.md** | Analysis | Tavus integration design and options. |
| **RAG_IMPLEMENTATION.md** | Technical | RAG implementation details (search, chunks, ranking). |
| **HYBRID_RAG_ARCHITECTURE.md** | Architecture | Hybrid RAG design (semantic + keyword). |
| **HYBRID_SEARCH_SETUP.md** | Setup | How to set up and use hybrid search. |
| **MULTIMODAL_QUICKSTART.md** | Quick start | Multimodal (PDF + website + visuals) quick start. |
| **MULTIMODAL_CONTENT.md** | Feature guide | Multimodal content ingestion and usage. |
| **VISUAL_CONTENT.md** | Feature guide | Visual content: extraction, linking, display. |
| **VOICE_FEATURES.md** | Feature guide | Voice features (Realtime, Tavus, etc.). |
| **COST_MONITORING.md** | Operations | Cost monitoring and usage. |

---

## 📂 Docs in `docs/`

### System & architecture

| File | Type | What it covers |
|------|------|----------------|
| **DIRECTORY_STRUCTURE.md** | Reference | Full directory structure with one-line description per file; **keep updated as the project evolves**. |
| **COMPLETE_SYSTEM_DOCUMENTATION.md** | System doc | Full system: overview, architecture, content sources, pipelines, RAG, visuals, API, admin, DB schema, config, troubleshooting. |
| **PDF_CHUNK_ARCHITECTURE.md** | Architecture | How PDFs are chunked and stored. |
| **PDF_SLIDE_EXTRACTION.md** | Feature | Slide extraction from PDFs. |
| **WEBSITE_CRAWLING_DESIGN.md** | Design | Website crawling design. |
| **WEBSITE_CRAWLING_IMPLEMENTATION.md** | Technical | Website crawling implementation. |

### Access & usage

| File | Type | What it covers |
|------|------|----------------|
| **ACCESS_SDR_WIDGET.md** | How-to | How to access and use the SDR widget. |
| **ACCESS_MEDIA_PAGE.md** | How-to | How to access the media/admin page. |
| **WEBSITE_CRAWLING_QUICKSTART.md** | Quick start | Website crawling quick start. |
| **WEBSITE_CRAWLING_USAGE.md** | How-to | Using the website crawling feature. |
| **DOWNLOAD_INSTRUCTIONS.md** | How-to | Download instructions (e.g. docs/assets). |

### Testing & debugging

| File | Type | What it covers |
|------|------|----------------|
| **TESTING_GUIDE.md** | Testing | How to test the platform. |
| **PDF_TEST_QUERIES.md** | Testing | Example/test queries for PDF RAG. |
| **SLIDE_EXTRACTION_TEST_QUERIES.md** | Testing | Test queries for slide extraction. |
| **LINKED_VISUALS_TEST_QUERIES.md** | Testing | Test queries for linked visuals. |
| **DEBUG_NO_IMAGES.md** | Debugging | Debugging when images don’t show. |
| **WEBSITE_IMAGES_FIX.md** | Debugging | Fixes for website image issues. |

### Integrations & status

| File | Type | What it covers |
|------|------|----------------|
| **CONVERSATION_LOGGING.md** | Feature guide | Conversation logging, AI classification, idle timeout, session lifecycle. |
| **TAVUS_STATUS_CHECK.md** | Operations | How to check Tavus integration status. |
| **TIER1_CLIENT_REQUIREMENTS.md** | Client-facing | Tier 1 BYOK: what clients must provide. |
| **TIER1_BYOK_CLIENT_REQUIREMENTS.md** | Client-facing | Tier 1 BYOK: alternative client requirements doc. |
| **TIER1_CLIENT_IMPLEMENTATION_GUIDE_INTERNAL.md** | Internal | Tier 1 BYOK: steps to onboard a client; no fallback to platform key. |

### Resources & reference

| File | Type | What it covers |
|------|------|----------------|
| **COMPANIES_WITH_PUBLIC_PDFS.md** | Reference | Companies that have public PDFs. |
| **AIRBNB_RESOURCES.md** | Reference | Airbnb-related resources. |
| **HOW_TO_CONTINUE_SESSION.md** | Reference | How to resume or continue a session (for developers). |

### Session summaries

| File | Type | What it covers |
|------|------|----------------|
| **SESSION_SUMMARY_2024-12-29.md** | Session notes | Summary of a dev session (Dec 29, 2024). |
| **2025-12-13-session-summary.md** | Session notes | Session summary (Dec 13, 2025). |
| **2025-12-23-session-summary.md** | Session notes | Session summary (Dec 23, 2025). |

---

## 📂 Other

| Location | File | Type | What it covers |
|----------|------|------|----------------|
| **downloads/airbnb-docs/** | README.md | Reference | Notes for Airbnb-related downloaded docs. |

---

## Quick map by topic

- **Getting started:** README.md, SETUP.md, QUICK_REFERENCE.md  
- **Directory structure:** docs/DIRECTORY_STRUCTURE.md (update when adding/removing files)  
- **Conversation logging & session:** docs/CONVERSATION_LOGGING.md  
- **Realtime voice:** REALTIME_API.md, VOICE_FEATURES.md  
- **Tavus (video avatar):** TAVUS_INTEGRATION_COMPLETE.md, TAVUS_INTEGRATION_ANALYSIS.md, docs/TAVUS_STATUS_CHECK.md  
- **RAG & search:** RAG_IMPLEMENTATION.md, HYBRID_RAG_ARCHITECTURE.md, HYBRID_SEARCH_SETUP.md  
- **Multimodal & visuals:** MULTIMODAL_QUICKSTART.md, MULTIMODAL_CONTENT.md, VISUAL_CONTENT.md, docs/PDF_*.md, docs/WEBSITE_*.md  
- **Full system:** docs/COMPLETE_SYSTEM_DOCUMENTATION.md, IMPLEMENTATION_SUMMARY.md  
- **Tier 1 BYOK:** docs/TIER1_CLIENT_REQUIREMENTS.md, docs/TIER1_CLIENT_IMPLEMENTATION_GUIDE_INTERNAL.md  
- **Testing/debug:** docs/TESTING_GUIDE.md, docs/*_TEST_QUERIES.md, docs/DEBUG_*.md, docs/WEBSITE_IMAGES_FIX.md  
- **Costs & ops:** COST_MONITORING.md, docs/TAVUS_STATUS_CHECK.md  
