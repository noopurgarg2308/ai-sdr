# Tier 1: Bring Your Own Key (BYOK) — Client Requirements

This document describes what you need to provide to use the AI SDR platform under **Tier 1 (BYOK)**. You supply your own API keys; we do not charge for AI usage.

---

## Overview

Under Tier 1, you provide your own **OpenAI API key**. The AI SDR will not function until a valid key is configured for your account. All AI usage (chat, voice, embeddings, etc.) is billed directly to your OpenAI account.

---

## Required: OpenAI API Key

### What You Need

A single **OpenAI API key** that has access to the models used by the AI SDR.

### Where to Get It

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign in or create an account
3. Add a payment method (required for API access)
4. Go to **API keys** → **Create new secret key**
5. Copy the key (`sk-...`) and add it to your AI SDR account settings

### Account Requirements

Your OpenAI account must have:

- **Paid billing** — A payment method on file. Free/trial keys often lack access to required models.
- **Model access** — Your account must support the following models:

| Purpose | Model | Used For |
|---------|-------|----------|
| Text chat | `gpt-4-turbo-preview` or `gpt-4o` | Typed conversations |
| Realtime voice | `gpt-realtime-1.5` | Voice conversations |
| Conversation classification | `gpt-4o-mini` | Lead/visitor classification |
| Knowledge search | `text-embedding-3-small` | RAG embeddings for PDFs and websites |
| Image OCR | `gpt-4o` | PDFs with images, uploaded images |
| Video transcription | `whisper-1` | Video audio (if you upload videos) |
| Video frame analysis | `gpt-4o` | Video processing (if you upload videos) |

Most paid OpenAI accounts include access to these models. If you’re unsure, create a key and try it — the AI SDR will report any access issues.

---

## Optional: Tavus API Key (Video Avatar Only)

If you use the **video avatar** mode (Tavus), you may optionally provide your own Tavus API key. Otherwise, Tavus is not used.

---

## Security & Privacy

- **Your key, your data** — Your API key is stored securely and used only for your company’s traffic.
- **No usage on our bill** — All OpenAI usage is billed to your account.
- **No fallback** — The platform never uses its own API key for Tier 1 clients. If your key is missing or invalid, the AI SDR will not work until a valid key is configured.
- **Revocation** — You can revoke or rotate your key anytime in the OpenAI dashboard.

---

## Summary Checklist

- [ ] OpenAI account with payment method
- [ ] API key created at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- [ ] Key added to your AI SDR account settings
- [ ] (Optional) Tavus key if using video avatar mode

---

## Support

If you see errors such as "invalid API key" or "model not found", check:

1. Key is correct and not revoked
2. Account has a payment method
3. Account has access to the models listed above

For model access issues, see [OpenAI’s model documentation](https://platform.openai.com/docs/models).
