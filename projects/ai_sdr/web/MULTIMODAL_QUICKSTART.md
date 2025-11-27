# Multimodal AI SDR - Quick Start 🚀

## What You Just Got

Your AI SDR now **understands images and videos**! Upload any screenshot or demo video, and it automatically:
- Extracts text (OCR for images, Whisper for videos)
- Analyzes visuals (GPT-4 Vision)
- Makes it searchable in chat
- Shows visuals when answering questions

## 🏃 Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
cd /Users/noopurgarg/openai-dev/projects/ai_sdr/web
npm install
```

### 2. Run Database Migration
```bash
npm run prisma:generate
npm run prisma:migrate
# Name it: add_multimodal_fields
```

### 3. Done! Ready to Use

## 📸 Upload Your First Image

### Via Admin UI:
```
1. Go to: http://localhost:3001/admin/companies/[your-company-id]/media
2. Click "Choose File" → Select a screenshot
3. Title: "My Dashboard"
4. Check ✓ "Auto-process"
5. Click "Upload & Process"
6. Wait 10 seconds for OCR
7. Done!
```

### Test It:
```
Visit: http://localhost:3001/widget/hypersonix
Ask: "What does the dashboard look like?"
→ AI will find OCR text and show your screenshot!
```

## 🎥 Upload Your First Video

### Via Admin UI:
```
1. Go to: http://localhost:3001/admin/companies/[your-company-id]/media
2. Upload a demo video (.mp4)
3. Processing takes ~30-60 seconds per minute of video
4. Done!
```

### Test It:
```
Ask: "Show me a product demo"
→ AI will show the video and can reference specific moments!
```

## 💡 What Gets Extracted

### From Images:
- All visible text (UI labels, data, numbers)
- Layout and structure
- Charts and graphs
- UI components

### From Videos (Every 10 seconds):
- Full audio transcript (Whisper)
- What's visible on screen (Vision)
- Combined timeline with timestamps

## 🔍 How Search Works

```
You upload: pricing-dashboard.png

OCR extracts: 
"Pricing dashboard showing dynamic price 
 recommendations, competitor analysis, 
 margin optimization..."

User asks: "How does your pricing work?"

RAG finds the OCR text (high similarity)
  ↓
Returns text + linked image
  ↓
AI responds with explanation + shows image!
```

## 📋 Supported File Types

| Type | Upload | OCR/Process | Display | Search |
|------|--------|-------------|---------|--------|
| **Images** (.jpg, .png) | ✅ | ✅ GPT-4 Vision | ✅ Inline | ✅ Via RAG |
| **Videos** (.mp4, .webm) | ✅ | ✅ Whisper + Vision | ✅ Player | ✅ Via RAG |
| **Charts** (images) | ✅ | ✅ GPT-4 Vision | ✅ Inline | ✅ Via RAG |
| **PDFs** | ✅ | 🔧 Future | ⚠️ Link | 🔧 Future |
| **PowerPoint** | ✅ | 🔧 Future | ⚠️ Link | 🔧 Future |

## 💰 Cost Per Upload

- **Image**: ~$0.01 (one-time)
- **Video** (5 min): ~$0.34 (one-time)
- **Search**: Free (uses existing embeddings)

## 🎯 Next Steps

1. **Upload your real screenshots** (replace placeholder images)
2. **Upload product demo videos**
3. **Test search** in chat widget
4. **Monitor processing** in admin
5. **Add more content** over time

## 🆘 Need Help?

- Check `MULTIMODAL_CONTENT.md` for full documentation
- See `VISUAL_CONTENT.md` for visual system details
- See `RAG_IMPLEMENTATION.md` for search details

---

**Your AI SDR is now truly multimodal!** 🎨🧠🎬

