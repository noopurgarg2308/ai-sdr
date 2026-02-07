# What You’ve Built: AI SDR Platform — Enterprise Value Proposition

**One-line pitch:**  
An **AI Sales Development Representative (SDR) platform** that gives each enterprise its own **voice- and text-capable assistant**, powered by **your company’s docs and website**, with **RAG**, **visuals**, **demos**, **meetings**, and **CRM** — embeddable on your site and usable via **text chat**, **voice (Realtime API)**, or **video avatar (Tavus)**.

---

## What You Have Created

A **multi-tenant, enterprise-ready AI SDR SaaS platform** that:

1. **Ingests** each company’s knowledge (PDFs + website) and turns it into a searchable, visual knowledge base.
2. **Answers** visitor and sales questions in real time using that knowledge (RAG), with citations and visuals.
3. **Converses** over **text**, **voice**, or **video avatar** in one embeddable widget.
4. **Qualifies and converts** by offering demos, meeting links, and CRM lead logging.

So you’re not selling “a chatbot.” You’re selling **company-specific AI SDRs** that know the product, show the right content, and move leads toward meetings and demos.

---

## Core Capabilities (What You Can Do for Enterprises)

### 1. Company-specific knowledge, not generic AI

- **Multi-tenant:** Each customer (company) has an isolated knowledge base and config.
- **RAG (Retrieval-Augmented Generation):** Answers are grounded in **their** PDFs and **their** website — not generic web knowledge.
- **Unified search:** PDFs and website content are searched together (semantic + keyword boosting, relevancy ranking).
- **Always current:** They add/update PDFs and trigger website crawls; the AI uses the latest content.

**Enterprise value:** Compliance-safe, on-brand answers; no hallucinated facts from the open web.

---

### 2. Rich content: not just text — slides, charts, images, demos

- **Automatic extraction:** From PDFs (text, slides, OCR for image-PDFs) and from websites (text + images).
- **Visual linking:** Relevant images, charts, and slides are **automatically** tied to answer chunks and **shown in the widget** next to the answer.
- **Demo clips:** Product demo videos can be stored per company and surfaced when the AI decides the visitor is ready (e.g. by persona/intent).
- **Deduplication and error handling:** Blank/broken images are detected and filtered out.

**Enterprise value:** Product and sales teams see the same decks and assets the AI uses; better trust and consistency.

---

### 3. Multiple conversation modes in one widget

- **Text chat:** Classic chat with streaming, tools, and visuals (good for support and detailed questions).
- **Voice (Realtime API):** Real-time speech-to-speech with low latency; server-side VAD; same RAG and tools (search, demo, meeting, CRM).
- **Video avatar (Tavus):** Conversational video AI (avatar speaks); same knowledge and tools, for a “human-like” experience.

**Enterprise value:** One integration (embed widget), many use cases: self-serve support, pre-sales discovery, and high-touch avatar demos.

---

### 4. Built-in sales actions (qualification and conversion)

- **Search knowledge:** Answer any question from the knowledge base and surface linked visuals.
- **Get demo clip:** Show a relevant product demo based on persona and intent.
- **Create meeting link:** Generate a booking link when the visitor is ready to talk to sales.
- **Log every conversation:** Automatically logged to per-company files; AI classifies as lead or visitor and extracts contact info.

**Enterprise value:** The AI doesn’t just answer — it **qualifies** and **converts** (demos, meetings, CRM), so it acts like an SDR.

---

### 5. Admin and operations

- **Admin UI:** Create companies, upload PDFs, add website sources, trigger crawls, monitor status.
- **APIs:** Chat, tools, Realtime session, Tavus session, media upload, crawl trigger — so enterprises can automate and integrate.
- **Embeddable widget:** One URL per company (e.g. `/widget/{companyId}`); embeddable on their site.

**Enterprise value:** Centralized control, multi-brand or multi-division support, and easy embedding into existing sites.

---

## How to Explain It to an Enterprise (Talking Points)

**Problem you solve:**  
“Your website visitors and inbound leads get generic chat or slow, human-only follow-up. Sales and support are repeating the same answers and can’t scale.”

**What you offer:**  
“An AI SDR that **knows your content** — your PDFs and your website — and answers in real time over **text**, **voice**, or **video avatar**. It shows the right slides and demos, and when someone is ready, it offers a demo or meeting and can log the lead to your CRM. One widget on your site; you control the knowledge and the prompts.”

**Differentiators:**  
- **Your data only:** RAG over their docs and site, not generic internet.  
- **Visuals included:** Charts, slides, and images appear with answers.  
- **Voice and video:** Not just text — Realtime voice and Tavus avatar in the same platform.  
- **Sales-native:** Demo clips, meeting links, conversation logging (lead/visitor classification) built in.  
- **Multi-tenant:** Separate knowledge and config per brand/division/company.

**Use cases:**  
- Pre-sales: Answer product/pricing/use-case questions 24/7.  
- Support: Deflect FAQs and point to the right docs and visuals.  
- Lead qualification: Collect role, use case, and intent; offer demos/meetings; every conversation logged and classified.  
- High-touch: Video avatar for key accounts or premium flows.

---

## Technical Summary (For Technical Buyers)

| Layer | Capability |
|-------|------------|
| **Content** | PDF upload (text, slides, OCR); recursive website crawl (text + images); chunking and embeddings. |
| **Search** | Semantic + keyword hybrid RAG; relevancy ranking; visual linking; multi-source (PDF + web). |
| **AI** | OpenAI GPT-4; function calling (search_knowledge, get_demo_clip, create_meeting_link, show_visual); auto conversation logging with AI classification. |
| **Channels** | Text chat (streaming); Realtime API (voice); Tavus (video avatar). |
| **Data** | Multi-tenant DB (Company, Document, Chunk, MediaAsset); per-company isolation. |
| **APIs** | REST for chat, tools, admin, media, crawl; WebSocket for Realtime; server-side session/token handling for Tavus. |

---

## What You Can Say You “Do” for Them

- **“We give you an AI SDR that runs on your own content.”**  
  RAG over their PDFs and website; no generic web answers.

- **“It works over text, voice, or video avatar.”**  
  Same knowledge and actions in the widget; they choose the channel.

- **“It shows the right slides and demos, not just text.”**  
  Automatic visual linking and demo clips.

- **“It books meetings and logs every conversation.”**  
  Built-in meeting link; every conversation logged and classified (lead vs visitor).

- **“You stay in control: your docs, your site, your prompts.”**  
  Admin UI and APIs; multi-tenant so each brand/division is isolated.

---

**Bottom line:** You’ve built a **content-powered, multi-channel AI SDR platform** (text + voice + video) with RAG, visuals, demos, meetings, and CRM. For enterprises, you can say: *“We plug your knowledge into an AI that talks to your visitors like an SDR — by text, voice, or video — and moves them to demos and meetings.”*
