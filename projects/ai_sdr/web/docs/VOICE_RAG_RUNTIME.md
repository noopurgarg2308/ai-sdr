# Voice & RAG runtime (operations)

This document records **voice (OpenAI Realtime)** and **`search_knowledge`** behavior as of **March 2026**: fixes for echo, reliable tool results, observability, and how to verify crawled website content in RAG.

---

## Summary

| Area | Issue | What we changed |
|------|--------|-----------------|
| **Voice playback** | Double audio / echo | Deduplicate assistant audio: handle only one of `response.output_audio.delta` **or** `response.audio.delta` per response; reset when the response ends (`response.done`) or on disconnect/error. |
| **Microphone** | Echo / feedback | Prefer **not** routing capture straight to speakers; ScriptProcessor fallback uses **gain 0** into the destination graph; `autoGainControl` enabled where supported. |
| **Voice + KB** | Vague answers (“couldn’t fetch pricing”) | If `search_knowledge` **threw** after hybrid search (e.g. bad `JSON.parse` on asset metadata), Realtime **never** received `function_call_output`, so the model invented failures. **Always** send tool output, including on error. |
| **Tools** | Slug vs DB id, fragile metadata | Resolve **`company.id`** via `resolveCompanyId()` for hybrid search and Prisma `mediaAsset` queries; **safe** metadata parsing for linked visuals; **truncate** snippet text (~6000 chars/hit) to keep Realtime payloads bounded. |
| **Observability** | Hard to debug empty RAG | **`console.warn`** when hybrid search returns **zero** hits—grep server logs (e.g. Railway) for `search_knowledge: zero results`. |

---

## Code map

| Concern | Primary file |
|--------|----------------|
| WebSocket, audio in/out, assistant delta dedupe, **tool output on error** | `src/lib/realtime.ts` |
| `search_knowledge`, Prisma media fetch, truncation, zero-results log | `src/lib/tools.ts` |
| `resolveCompanyId` (slug or id → company primary key) | `src/lib/hybridSearch.ts` (exported) |
| Tool HTTP handler for Realtime | `app/api/chat/[companyId]/tool/route.ts` |

---

## Realtime audio

- **Duplicate deltas:** Some Realtime model/session shapes emit both `response.output_audio.delta` and `response.audio.delta` for the same audio. The client tracks a flag per response so only **one** stream is decoded per turn.
- **Mic graph:** Capture is resampled to 24 kHz PCM16 for the API; local monitoring path must not feed assistant audio back into the mic chain in a way users hear as echo.

See also **`REALTIME_API.md`** for session shape, VAD, and UI flow.

---

## `search_knowledge` and function calling

1. **Hybrid search errors** are caught and return a structured payload (`results: []`, `metadata.strategy: "error"`, plus `error` / `message` when applicable) instead of aborting without a response body shape the model expects.

2. **Post-search failures** (Prisma, malformed `MediaAsset.metadata` JSON) previously could throw **after** a successful search; **`RealtimeClient.handleFunctionCall`** now catches **any** tool error and still sends:

   - `conversation.item.create` with `type: "function_call_output"` and JSON including `error`, `message`, `results: []`, and a short `hint`.

   Then it sends **`response.create`** so the model continues with real tool output instead of hallucinating a “fetch failed” story.

3. **Company ID:** `dispatchToolCall` may receive a slug or id from routing; **`resolveCompanyId`** normalizes to the Prisma **`Company.id`** before `hybridSearch` and `mediaAsset.findMany({ companyId })`.

4. **Payload size:** Each result `content` string is truncated with an ellipsis if over the cap, to reduce risk of oversized tool JSON over the Realtime channel.

---

## Logs: empty RAG / hybrid search

When hybrid search **succeeds** but returns **no merged results**, the server emits:

```text
[Tools] search_knowledge: zero results (companyId=..., query="...", tavus=..., rag=..., strategy=...)
```

**Where to look**

- **Local:** Terminal running `npm run dev` (or your process manager).
- **Railway:** Service → **Logs** (stdout/stderr from the Node/Next server—not the browser console).

Use this to separate **“nothing in the index”** (crawl/embeddings/BYOK) from **“search worked but model wording is off.”**

Crawl/processing logs use **`[WebsiteProcessor]`** prefixes.

---

## Verifying crawled website content is in RAG

Website pages are stored as **`Document`** rows with **`source = 'website_page'`**; searchable text lives in **`Chunk`** rows (with embeddings).

### Admin UI

`/admin/companies` → select company → website source. After a successful job, metadata typically includes **`lastCrawledAt`**, **`pagesProcessed`**, **`documentsCreated`**, and **`processingStatus: "completed"`**.

### Database (e.g. Railway Postgres)

Resolve the company, then count docs/chunks (replace `YOUR_COMPANY_ID` with the **`Company.id`** cuid):

```sql
SELECT COUNT(*) AS website_documents
FROM "Document"
WHERE "companyId" = 'YOUR_COMPANY_ID'
  AND source = 'website_page';

SELECT COUNT(*) AS website_chunks
FROM "Chunk" c
JOIN "Document" d ON d.id = c."documentId"
WHERE d."companyId" = 'YOUR_COMPANY_ID'
  AND d.source = 'website_page';

SELECT url, title, LENGTH(content) AS content_len
FROM "Document"
WHERE "companyId" = 'YOUR_COMPANY_ID'
  AND source = 'website_page'
ORDER BY "createdAt" DESC
LIMIT 15;
```

Non-zero **website_chunks** means crawled text is in the RAG index path used by hybrid search (subject to company keys and merge logic).

---

## Deployment (GitHub → Railway)

If Railway is configured for **deploy on push**, changes only run in production after:

1. **`git commit`**
2. **`git push`** to the connected branch (e.g. `main`)

There is no separate “upload” step for application code beyond what your CI/hosting expects.

---

## Related documentation

- **`REALTIME_API.md`** — Realtime integration, troubleshooting table, transcript/audio notes.
- **`docs/COMPLETE_SYSTEM_DOCUMENTATION.md`** — Full system; website pipeline and troubleshooting.
- **`docs/WEBSITE_CRAWLING_IMPLEMENTATION.md`** — Crawl → document → chunk pipeline.

---

**Last updated:** 2026-03-30
