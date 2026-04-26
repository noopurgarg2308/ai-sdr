# Quick Reference - Where Am I?

## 📍 Your Location

**Repository**: `ai-sdr`  
**GitHub**: `https://github.com/noopurgarg2308/ai-sdr.git`  
**Working Directory**: `/Users/noopurgarg/openai-dev/projects/ai_sdr/web`

## 🌐 Deployed app (Railway) — URL patterns

Use these when testing **production**, not your local machine. Replace `<company-slug>` with a real slug from Admin (e.g. the marketing demo uses `premcompany`).

**Base URL:** `https://ai-sdr-production-59e6.up.railway.app`

| What to test | URL |
|--------------|-----|
| Marketing page (hero “Ask me anything”, floating widget) | `https://ai-sdr-production-59e6.up.railway.app/` |
| Admin (companies, API keys, sources) | `https://ai-sdr-production-59e6.up.railway.app/admin/companies` |
| Widget only (embed or direct open) | `https://ai-sdr-production-59e6.up.railway.app/widget/<company-slug>` |

**After deploy issues:** Ensure Railway has the same env vars as local (`OPENAI_API_KEY`, `DATABASE_URL`, etc.). Mic and permissions apply to the **deployed origin** (this domain), not `localhost`.

**Hostname changes:** If Railway assigns a new `*.up.railway.app` name or a custom domain, update the base URL everywhere in this section.

## 💻 Local dev — URL patterns

| What to test | URL |
|--------------|-----|
| Marketing site | `http://localhost:3000` |
| Admin | `http://localhost:3000/admin/companies` |
| Widget only | `http://localhost:3000/widget/<company-slug>` |

## ✅ Verify You're in the Right Place

Run these commands:

```bash
# 1. Check current directory
pwd
# Should output: /Users/noopurgarg/openai-dev/projects/ai_sdr/web

# 2. Check repository
git remote -v
# Should show: origin https://github.com/noopurgarg2308/ai-sdr.git

# 3. Check you're in the right folder
ls
# Should see: app/, src/, prisma/, package.json, README.md, etc.
```

## 🔄 How to Get Here (After Restart)

```bash
cd /Users/noopurgarg/openai-dev/projects/ai_sdr/web
```

Or in Cursor:
- **File → Open Folder →** `/Users/noopurgarg/openai-dev/projects/ai_sdr/web`

## 📚 Key Documents

- **Session Summary**: `docs/SESSION_SUMMARY_2024-12-29.md` - What we did today
- **System Docs**: `docs/COMPLETE_SYSTEM_DOCUMENTATION.md` - Full system documentation
- **README**: `README.md` - Quick start guide

## 🎯 Current Session

**To continue this session after restart:**
1. Open Cursor
2. Go to **Agents** tab
3. Click on **"Progress and next steps"** (or whichever shows the most recent timestamp)
4. Continue the conversation!

**Or** start a new agent and say: "Continue from session about image handling and Tavus fixes"
