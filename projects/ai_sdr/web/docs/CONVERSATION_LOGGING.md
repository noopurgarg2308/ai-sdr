# Conversation Logging & Session Management

This document describes how the AI SDR platform logs conversations and manages session lifecycle.

---

## Overview

Every conversation (text chat and Realtime voice) is automatically logged to a per-company file. Each entry is classified by AI as **lead** or **visitor**, with extracted contact info (name, email, company, role, etc.). Fields can be blank if not mentioned.

---

## What Gets Logged

### Log Location

- **Path**: `data/conversations/{companyId}.jsonl`
- **Format**: JSONL (one JSON object per line)
- **Gitignored**: Yes (`/data/conversations/` in `.gitignore`)

### Entry Schema

Each line is a JSON object:

```json
{
  "sessionId": "session_123_abc",
  "companyId": "hypersonix",
  "isLead": true,
  "name": "Jane Doe",
  "email": "jane@acme.com",
  "company": "Acme Corp",
  "role": "VP of E-commerce",
  "icp_fit": "high",
  "use_cases": ["pricing_optimization", "competitor_intelligence"],
  "summary": "Visitor interested in pricing and integrations. Asked about Q1 results.",
  "messageCount": 6,
  "loggedAt": "2025-12-04T21:30:00.000Z"
}
```

All contact fields (`name`, `email`, `company`, `role`, `icp_fit`, `use_cases`) can be `null` or empty if not mentioned. Only `sessionId`, `companyId`, `isLead`, `summary`, `messageCount`, and `loggedAt` are guaranteed.

---

## When Logging Happens

### Text Chat

- **Trigger**: After each AI response
- **Flow**: Chat API returns response → fire-and-forget call to `classifyAndLogConversation`
- **Source**: Messages from the request + assistant reply

### Realtime Voice

- **Trigger**: When the user disconnects or when the session ends due to idle timeout
- **Flow**: Client sends `POST /api/chat/[companyId]/log-conversation` with sessionId and messages
- **Source**: Transcripts accumulated in the widget state

### Idle Timeout (Session Termination)

Both text and Realtime sessions end automatically after **1 minute** of no user input:

- **Text**: No user message for 1 min → show "Session ended due to inactivity" → log conversation → reset session
- **Realtime**: No user speech for 1 min → show "Session ended due to inactivity" → disconnect → log conversation

Activity resets the timer:

- **Text**: Every user message
- **Realtime**: User speech (transcript) or clicking "Start Speaking"

---

## Classification

An AI model (GPT-4o-mini) classifies each conversation:

- **isLead**: `true` if the visitor shows buying intent, discusses use cases, asks about pricing/demos, or shares contact info
- **summary**: Brief 1–2 sentence summary
- **Contact extraction**: Pulls name, email, company, role, use_cases from the conversation

---

## API Reference

### POST /api/chat/[companyId]/log-conversation

Client-triggered logging (used by Realtime widget).

**Request:**
```json
{
  "sessionId": "realtime_123_abc",
  "messages": [
    { "role": "user", "content": "Hi, I'm interested in pricing." },
    { "role": "assistant", "content": "Great! Let me show you..." }
  ]
}
```

**Response:**
```json
{ "success": true }
```

**Errors:**
- `400`: Missing `sessionId` or empty `messages`
- `500`: Classification or file write failed

---

## Files

| File | Purpose |
|------|---------|
| `src/lib/crm.ts` | `classifyAndLogConversation`, `classifyConversation`, `logLeadToCRM` (legacy) |
| `app/api/chat/[companyId]/route.ts` | Auto-logs after each text chat response |
| `app/api/chat/[companyId]/log-conversation/route.ts` | Client-triggered logging endpoint |
| `src/components/WidgetChatText.tsx` | Idle timeout, log on session end |
| `src/components/WidgetChatRealtime.tsx` | Idle timeout, log on disconnect/unmount |

---

## Legacy: Leads File

The older `data/leads/{companyId}.jsonl` format and `logLeadToCRM` are still present for backward compatibility. The new flow uses `data/conversations/` and logs every conversation with classification.
