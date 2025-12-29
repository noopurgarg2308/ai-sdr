# How to Access the Media Upload Page

## Issue: Connection Failed

If you're getting "connection failed" when trying to access the media page, it's likely because:

1. **The dev server isn't running** ⚠️ (Most common)
2. The URL path might be incorrect

## ✅ Solution

### Step 1: Start the Dev Server

```bash
cd /Users/noopurgarg/openai-dev/projects/ai_sdr/web
npm run dev
```

Wait for it to say: `✓ Ready on http://localhost:3000`

### Step 2: Access the Media Page

**Option A: Via Admin Companies Page (Easiest)**
1. Go to: http://localhost:3000/admin/companies
2. Find "QuantivalQ" in the list
3. Click the **"📁 Media"** button (I just added this!)

**Option B: Direct URL**
Use the company ID (not slug):
```
http://localhost:3000/admin/companies/cmj52tf810000w3lw1rvkkieh/media
```

**Note:** The route uses the company **ID**, not the slug. The QuantivalQ company ID is: `cmj52tf810000w3lw1rvkkieh`

## 📝 Quick Reference

| What | URL |
|------|-----|
| Admin Companies List | http://localhost:3000/admin/companies |
| QuantivalQ Media Upload | http://localhost:3000/admin/companies/cmj52tf810000w3lw1rvkkieh/media |
| QuantivalQ Widget | http://localhost:3000/widget/quantivalq |

## 🔍 Troubleshooting

### "Connection Failed" or "This site can't be reached"
- ✅ Make sure dev server is running: `npm run dev`
- ✅ Check the terminal for errors
- ✅ Try: http://localhost:3000 (should show homepage)

### "404 Not Found"
- ✅ Check the company ID is correct: `cmj52tf810000w3lw1rvkkieh`
- ✅ Use the ID, not the slug in the URL
- ✅ Go via admin page: http://localhost:3000/admin/companies

### Port Already in Use
If port 3000 is busy:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```

## 🎯 After Accessing the Page

Once you can access the media page, you can:
1. Upload PDF files (they'll be auto-processed)
2. Upload images (with OCR)
3. Upload videos (with transcription)

All uploaded content will be automatically indexed for RAG search!
