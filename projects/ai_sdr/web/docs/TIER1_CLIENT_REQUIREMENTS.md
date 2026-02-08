# Tier 1 Client Requirements

This document describes what you need to provide to use the AI SDR platform under **Tier 1 (Bring Your Own Key)**. You supply your own API keys; we do not charge for AI usage.

---

## Overview

Under Tier 1, you provide your own **OpenAI API key**. The AI SDR will not function until a valid key is configured for your account. All AI usage (chat, voice, embeddings, vision, etc.) is billed directly to your OpenAI account.

---

## Required: OpenAI API Key

### When Required

Your OpenAI API key is **required** for all Tier 1 clients. Without it, the AI SDR will not work.

### What You Need

A single **OpenAI API key** that has access to the models used by the AI SDR.

### Where to Get It

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign in or create an account
3. Add a payment method (required for API access)
4. Go to **API keys** → **Create new secret key**
5. Copy the key (`sk-...`) and provide it to your onboarding contact

### Account Requirements

Your OpenAI account must have:

- **Paid billing** — A payment method on file. Free/trial keys often lack access to required models.
- **Model access** — Your account must support the following models:

| Purpose | Model | When Required |
|---------|-------|---------------|
| Text chat | `gpt-4-turbo-preview` or `gpt-4o` | Always |
| Realtime voice | `gpt-4o-realtime-preview-2024-12-17` | When using voice mode |
| Conversation classification | `gpt-4o-mini` | Always |
| Knowledge search | `text-embedding-3-small` | When using PDFs, websites, or knowledge base |
| Image OCR | `gpt-4o` | When uploading PDFs with images or standalone images |
| Video transcription | `whisper-1` | Only when you upload videos |
| Video frame analysis | `gpt-4o` | Only when you upload videos |

**Summary:** If you only use text chat and voice (no PDFs, no uploaded images, no videos), you need: `gpt-4-turbo-preview` or `gpt-4o`, `gpt-4o-realtime-preview-2024-12-17`, and `gpt-4o-mini`.

If you upload PDFs or websites, add `text-embedding-3-small`. If your PDFs contain images or you upload images, add `gpt-4o`. If you upload videos, add `whisper-1` and `gpt-4o`.

---

## Optional: Tavus API Key

### When Required

**Only** if you use the **video avatar** mode (Tavus). If you use text chat or voice-only mode, this is not required.

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
- [ ] Key provided to your onboarding contact
- [ ] (Optional) Tavus key if using video avatar mode

---

## Support

If you see errors such as "invalid API key" or "model not found", check:

1. Key is correct and not revoked
2. Account has a payment method
3. Account has access to the models listed above

For model access issues, see [OpenAI’s model documentation](https://platform.openai.com/docs/models).
