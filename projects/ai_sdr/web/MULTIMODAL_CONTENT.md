# Multimodal Content System 🎬📸🧠

Your AI SDR now has **complete multimodal understanding** - it can process images and videos to make them searchable!

## 🎯 What This Means

When you upload:
- **Images/Screenshots** → GPT-4 Vision extracts text → Searchable in RAG
- **Videos** → Whisper transcribes + Vision analyzes frames → Fully searchable with timestamps

## ✨ The Complete Flow

```
Upload dashboard.png
    ↓
Stored in /public/uploads/images/
    ↓
MediaAsset created (for display)
    ↓
Background Job: OCR Processing
    ↓
GPT-4 Vision extracts:
  "Dashboard showing revenue at $2.5M,
   growth metrics, pricing module,
   navigation menu with analytics..."
    ↓
Document created with OCR text
    ↓
Chunked + Embedded → RAG
    ↓
User asks: "What's on your dashboard?"
    ↓
RAG finds chunk about dashboard
    ↓
Chunk metadata links to MediaAsset
    ↓
AI responds: "Our dashboard shows... [displays image]"
```

## 🏗️ Architecture

### Dual Storage System:

**MediaAsset Table** (Visual Display):
```
- id, url, title, type
- processingStatus, extractedText
- transcript (for videos)
- frameAnalysis (for videos)
→ Used for: Displaying visuals in chat
```

**Document/Chunk Table** (RAG Search):
```
- id, content, embedding
- mediaAssetId (link to source)
- metadata: {timestamp, sourceType}
→ Used for: Semantic search
```

**They're Linked:**
```
MediaAsset ←→ Document
  (visual)       (searchable text)
```

## 📁 Updated Schema

### Document Model:
```prisma
model Document {
  // ... existing fields ...
  mediaAssetId String?     // NEW: Links to source image/video
  mediaAsset   MediaAsset? // NEW: Relation
}
```

### MediaAsset Model:
```prisma
model MediaAsset {
  // ... existing fields ...
  extractedText    String?   // NEW: OCR/transcript text
  transcript       String?   // NEW: Full video transcript
  frameAnalysis    String?   // NEW: Visual timeline
  processingStatus String?   // NEW: "pending"|"processing"|"completed"|"failed"
  processedAt      DateTime? // NEW: When processing finished
  documents        Document[] // NEW: Linked RAG documents
}
```

### Chunk Model:
```prisma
model Chunk {
  // ... existing fields ...
  metadata String? // NEW: {timestamp, mediaAssetId, sourceType}
}
```

## 🚀 How to Use

### 1. Run Database Migration

```bash
cd /Users/noopurgarg/openai-dev/projects/ai_sdr/web

# Install new dependencies
npm install

# Generate Prisma types
npm run prisma:generate

# Run migration (name it: add_multimodal_fields)
npm run prisma:migrate
```

### 2. Upload Media via Admin

Navigate to:
```
http://localhost:3001/admin/companies/[company-id]/media
```

**Upload Process:**
1. Click "Choose File" → Select image or video
2. Enter title and description
3. Select category
4. Check "Auto-process" ✓
5. Click "Upload & Process"
6. Wait for processing (shows progress)
7. Done! Now searchable in chat!

### 3. Test in Chat Widget

Visit: `http://localhost:3001/widget/hypersonix`

**Try these queries:**
```
"What does the dashboard look like?"
→ RAG finds OCR text → Shows dashboard image

"Tell me about pricing"
→ RAG finds pricing description → Shows pricing chart

"How does the demo work?"
→ RAG finds video transcript → Shows video at relevant timestamp
```

## 🎬 Video Processing Details

### For 5-Minute Video:

**Step 1: Audio Transcription** (OpenAI Whisper)
```
Video → Extract audio → Whisper API
Result: Full transcript with timestamps
"0:00-0:15: Welcome to Hypersonix dashboard...
 0:15-0:45: Here you can see revenue metrics...
 0:45-1:20: The pricing module uses AI..."
```

**Step 2: Frame Extraction** (ffmpeg)
```
Video → Extract frames every 10s → 30 frames
Frames saved temporarily to /uploads/frames/
```

**Step 3: Visual Analysis** (GPT-4 Vision)
```
Each frame → GPT-4 Vision API
Frame at 0:10: "Dashboard homepage with nav menu, revenue graph"
Frame at 0:30: "Revenue analytics showing $2.5M ARR trend"
Frame at 1:00: "Pricing module with product list and AI recommendations"
```

**Step 4: Combine & Store**
```
Combined text:
"Video Transcript: Welcome to Hypersonix dashboard...

Visual Timeline:
[0:10] Visual: Dashboard homepage... | Audio: "Welcome..."
[0:30] Visual: Revenue analytics... | Audio: "Here you can see..."
[1:00] Visual: Pricing module... | Audio: "The pricing module..."
"
    ↓
Chunk & Embed → RAG
```

**Step 5: Link & Index**
```
MediaAsset.id ←→ Document.mediaAssetId
Chunk.metadata = {timestamp: "1:00", mediaAssetId: "..."}
```

## 📸 Image Processing Details

### For Screenshot:

**Step 1: OCR Extraction** (GPT-4 Vision)
```
Image → GPT-4 Vision API
Prompt: "Describe everything visible..."

Result:
"Hypersonix dashboard interface showing:
- Navigation menu on left (Analytics, Pricing, Forecasting)
- Main revenue chart displaying $2.5M ARR with 15% growth trend
- Top products table with metrics
- Date range selector (Last 30 days)
- Export and filter buttons
- Real-time update indicator showing 'Live'"
```

**Step 2: Store & Index**
```
MediaAsset: {url: "/uploads/dashboard.png", extractedText: "..."}
Document: {content: "...", mediaAssetId: "asset123"}
Chunks: [{embedding: [...], metadata: {mediaAssetId: "asset123"}}]
```

## 🔍 Smart Search in Action

### Query: "Tell me about the revenue dashboard"

**Search Process:**
```
1. Embed query → [0.234, -0.112, ...]
2. Search chunks → Find top 5 matches
3. Top match: "Hypersonix dashboard showing $2.5M ARR..."
   Metadata: {sourceType: "image", mediaAssetId: "dash001"}
4. Fetch linked MediaAsset: dashboard.png
5. Return to AI: {
     text: "Dashboard showing $2.5M ARR...",
     visual: {url: "/uploads/dashboard.png", type: "image"}
   }
6. AI responds: "Our dashboard displays..." [shows image]
```

### Query: "How does pricing optimization work?"

**Search Process:**
```
1. RAG search → Find chunk from video transcript
2. Chunk content: "Pricing module uses AI optimization..."
   Metadata: {timestamp: "1:45", mediaAssetId: "video001"}
3. Fetch MediaAsset (video)
4. Return: {
     text: "Pricing uses AI...",
     visual: {url: "/uploads/video.mp4", type: "video", startTime: 105}
   }
5. AI responds: [Shows video starting at 1:45]
```

## 💰 Processing Costs

### Per Image:
- **GPT-4 Vision**: ~$0.01 (one-time)
- **Embeddings**: ~$0.001
- **Total**: ~$0.01 per image

### Per 5-Minute Video:
- **Whisper**: $0.03 (5 min × $0.006/min)
- **Frame Extraction**: Free (ffmpeg)
- **GPT-4 Vision**: $0.30 (30 frames × $0.01/frame)
- **Embeddings**: ~$0.01
- **Total**: ~$0.34 per 5-min video

### Example Monthly Cost:
- 50 images: $0.50
- 10 videos (5 min avg): $3.40
- **Total**: ~$4/month for content processing

*Note: One-time cost, content stays searchable forever*

## 🛠️ New Files Created

1. **`src/lib/ocr.ts`** - GPT-4 Vision image analysis
2. **`src/lib/imageProcessor.ts`** - Image OCR pipeline
3. **`src/lib/videoProcessor.ts`** - Video transcription + frame analysis
4. **`src/lib/queue.ts`** - Background job processing
5. **`src/lib/smartSearch.ts`** - Combined RAG + Media search
6. **`src/components/VideoPlayer.tsx`** - Video with timestamp support
7. **`app/api/admin/media/upload/route.ts`** - File upload API
8. **`app/api/admin/media/jobs/[jobId]/route.ts`** - Job status API
9. **`app/admin/companies/[id]/media/page.tsx`** - Upload UI

## 📦 Dependencies Added

```json
{
  "@ffmpeg-installer/ffmpeg": "^1.1.0",  // Auto-installs ffmpeg
  "fluent-ffmpeg": "^2.1.3",              // Video processing
  "bullmq": "^5.14.0",                    // Job queue
  "ioredis": "^5.4.1"                     // Redis for queue
}
```

*Note: Uses simple in-memory queue for now (no Redis required for development)*

## 🎓 Usage Examples

### Upload & Process Image:

```typescript
// Via admin UI or programmatically:
const formData = new FormData();
formData.append("file", imageFile);
formData.append("companyId", "xxx");
formData.append("title", "Dashboard Screenshot");
formData.append("autoProcess", "true");

const response = await fetch("/api/admin/media/upload", {
  method: "POST",
  body: formData,
});

// Processing happens in background
// Image becomes searchable in ~10 seconds
```

### Upload & Process Video:

```typescript
formData.append("file", videoFile); // .mp4
formData.append("title", "Product Demo");
formData.append("autoProcess", "true");

// Processing takes longer (~30-60s per minute of video)
// Video becomes searchable with timestamps
```

### Search Will Find It:

```typescript
User: "Show me the dashboard"
AI searches RAG → Finds OCR text → Displays linked image

User: "How does pricing work?"
AI searches RAG → Finds transcript → Shows video at 1:45
```

## 🔧 Configuration

### Adjust Frame Extraction Interval:

In `videoProcessor.ts`:
```typescript
const framePaths = await extractKeyframes(videoPath, 15); // Every 15s instead of 10s
```

Less frames = faster + cheaper, but less visual detail

### Adjust OCR Detail Level:

In `ocr.ts`:
```typescript
detail: "low"  // Faster, cheaper
detail: "high" // More accurate, expensive
```

### Disable Auto-Processing:

In upload UI, uncheck "Auto-process" to upload without OCR/transcription.

## 📊 Processing Status

Track job status via API:

```typescript
GET /api/admin/media/jobs/{jobId}

Response:
{
  "id": "job_xxx",
  "type": "process-video",
  "status": "processing",
  "progress": 45,
  "createdAt": "..."
}
```

## 🎯 Best Practices

### For Images:
1. **High resolution** for better OCR
2. **Clear text** in screenshots
3. **Good contrast** for text extraction
4. **Descriptive titles** help with search

### For Videos:
1. **Clear audio** for better transcription
2. **Good lighting** for frame analysis
3. **Slower pace** helps AI understand
4. **Add chapters** manually if very long

### For All Media:
1. **Categorize properly** (product, pricing, feature)
2. **Add good descriptions** (helps search)
3. **Use auto-process** for RAG integration
4. **Monitor processing status** for errors

## 🐛 Troubleshooting

### "Processing failed" for images:
- Check image URL is accessible
- Verify OpenAI API key has Vision access
- Check image format (jpg, png, webp supported)

### "Processing failed" for videos:
- Ensure video has audio track (for Whisper)
- Check video format (mp4, webm supported)
- Verify file isn't corrupted
- Check ffmpeg is installed (`@ffmpeg-installer` should auto-install)

### OCR text quality poor:
- Use higher resolution images
- Ensure good contrast
- Try `detail: "high"` in ocr.ts

### Video processing slow:
- Reduce frame interval (15s or 20s instead of 10s)
- Skip frame analysis, just do transcript
- Process shorter videos

## 🚀 Future Enhancements

### Phase 2:
- [ ] Batch upload (multiple files at once)
- [ ] Progress bar in UI (real-time)
- [ ] Video chapters/bookmarks
- [ ] Image annotation tools
- [ ] Custom OCR prompts per category

### Phase 3:
- [ ] Auto-generate thumbnails
- [ ] Video editing (trim, clip)
- [ ] Image optimization/compression
- [ ] PDF text extraction
- [ ] PowerPoint extraction

### Phase 4:
- [ ] AI-generated summaries
- [ ] Automatic tagging
- [ ] Duplicate detection
- [ ] Content moderation
- [ ] Multi-language OCR

## 📈 Benefits

### For Users:
✅ Ask natural questions, get visual answers  
✅ Search video content by what was said OR shown  
✅ Find exact moments in videos  
✅ Visual proof alongside explanations  

### For You:
✅ Upload once, searchable forever  
✅ No manual tagging needed (AI understands content)  
✅ Automatic indexing  
✅ Unified search across all content types  

### For Sales:
✅ Show, don't just tell  
✅ Jump to relevant product demo moments  
✅ Visual sales collateral always accessible  
✅ Better engagement and conversion  

## ✅ Testing Checklist

Before going live:

- [ ] Upload test image, verify OCR works
- [ ] Upload test video, verify transcription works
- [ ] Check processing status updates correctly
- [ ] Search for content in image/video, verify it's found
- [ ] Check linked visuals appear in chat
- [ ] Test timestamp deep links in videos
- [ ] Verify frame extraction works
- [ ] Test with different file formats
- [ ] Monitor processing costs
- [ ] Test error handling (corrupt files)
- [ ] Verify cleanup (temp files deleted)
- [ ] Test on mobile devices

## 🎬 Example Scenarios

### Scenario 1: Dashboard Screenshot

```
1. Upload: dashboard.png
2. Processing: GPT-4 Vision extracts all UI text and layout
3. Stored: "Revenue dashboard showing $2.5M ARR, 15% growth..."
4. User asks: "What metrics do you track?"
5. AI: "We track revenue, growth, and more. Here's our dashboard:"
   [Shows dashboard.png]
```

### Scenario 2: Product Demo Video

```
1. Upload: demo.mp4 (5 minutes)
2. Processing:
   - Whisper: Transcribes narration
   - ffmpeg: Extracts 30 keyframes
   - Vision: Describes each frame
3. Stored: Timestamped transcript + visual timeline
4. User asks: "How do I use pricing optimization?"
5. AI: "Let me show you. At 2:30 in our demo..."
   [Shows video starting at 2:30]
```

### Scenario 3: Architecture Diagram

```
1. Upload: architecture.png
2. Processing: Extracts "Cloud-native, microservices, Kubernetes..."
3. User asks: "What's your technical stack?"
4. AI: "We use a cloud-native architecture..."
   [Shows architecture diagram]
```

## 💡 Pro Tips

### Optimize Video Costs:
- Only process key videos (not all)
- Reduce frame interval for longer videos
- Use transcript-only mode for talking-head videos

### Improve OCR Accuracy:
- Clean up screenshots (remove clutter)
- Use high-resolution captures
- Ensure good text contrast

### Better Search Results:
- Add manual tags in addition to AI extraction
- Use descriptive titles
- Add context in descriptions

## 📝 API Reference

### Upload Media:
```typescript
POST /api/admin/media/upload
FormData:
  - file: File (image or video)
  - companyId: string
  - title: string
  - description?: string
  - category?: string
  - autoProcess: "true" | "false"

Response:
{
  "success": true,
  "asset": {...},
  "jobId": "job_xxx" // if autoProcess=true
}
```

### Check Processing Status:
```typescript
GET /api/admin/media/jobs/{jobId}

Response:
{
  "id": "job_xxx",
  "type": "process-video",
  "status": "completed",
  "progress": 100
}
```

### Programmatic Processing:
```typescript
import { processImageAsset } from "@/lib/imageProcessor";
import { processVideoAsset } from "@/lib/videoProcessor";

// Process image
await processImageAsset(mediaAssetId);

// Process video
await processVideoAsset(mediaAssetId);
```

---

## 🎉 Status: COMPLETE!

Your AI SDR can now:
- ✅ Understand images via OCR
- ✅ Understand videos via transcription + frame analysis
- ✅ Search across all content types
- ✅ Display visuals with context
- ✅ Deep link to video timestamps
- ✅ Process uploads automatically

**You have a truly multimodal AI assistant!** 🧠🎨🎬

