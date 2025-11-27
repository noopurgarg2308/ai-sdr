# Visual Content System 🎨

Your AI SDR can now show **images, videos, charts, slides, and more** to make conversations more engaging and informative!

## 🎯 What's New

Your AI assistant can now **show visual content** alongside voice/text responses:

- 📸 **Images** - Product screenshots, feature illustrations
- 📊 **Charts** - Pricing tables, comparison matrices, ROI graphs
- 🎥 **Videos** - Product demos, tutorials
- 📄 **PDFs** - Whitepapers, case studies, technical docs
- 📊 **Slides** - Pitch decks, presentations
- 🎬 **GIFs** - Animated demos, UI walkthroughs
- 🏗️ **Diagrams** - Architecture, workflows, integrations

## ✨ How It Works

```
User: "Show me the dashboard"
    ↓
AI calls show_visual tool
    ↓
Searches media database for "dashboard"
    ↓
Returns relevant images
    ↓
Displays in chat UI alongside response
```

## 📁 Files Added/Modified

### New Files:
1. **`src/lib/media.ts`** - Media asset management
   - searchMediaAssets()
   - addMediaAsset()
   - getMediaByCategory()
   - getMediaByType()

2. **`scripts/seedHypersonixVisuals.ts`** - Seed sample visuals
   - 12 sample assets (dashboards, charts, diagrams)

### Modified Files:
1. **`prisma/schema.prisma`** - Added MediaAsset model
2. **`src/lib/tools.ts`** - Added show_visual tool
3. **`src/components/WidgetChatRealtime.tsx`** - Display visual content
4. **`src/lib/systemPrompt.ts`** - AI knows about visuals
5. **`package.json`** - Added seed:visuals script

## 🗄️ Database Schema

### MediaAsset Model:
```prisma
model MediaAsset {
  id          String   @id @default(cuid())
  companyId   String
  type        String   // "image", "video", "pdf", "slide", "chart", "gif"
  url         String
  title       String
  description String?
  category    String?  // "product", "pricing", "comparison", "demo", etc.
  tags        String?  // JSON array of keywords
  thumbnail   String?  // For videos/PDFs
  metadata    String?  // JSON: {width, height, duration, etc}
  createdAt   DateTime @default(now())
}
```

## 🚀 Setup Instructions

### 1. Run Database Migration

```bash
cd /Users/noopurgarg/openai-dev/projects/ai_sdr/web
npm run prisma:generate
npm run prisma:migrate  # Name it: add_media_assets
```

### 2. Seed Sample Visuals

```bash
npm run seed:visuals
```

This adds 12 sample visual assets for Hypersonix:
- Dashboard screenshots
- Pricing charts
- Feature illustrations
- Architecture diagrams
- Integration flows
- Use case examples

### 3. Restart Dev Server

```bash
npm run dev
```

### 4. Test It!

Visit: `http://localhost:3001/widget/hypersonix`

Try asking:
```
"Show me the dashboard"
"Can you show pricing information?"
"Display the architecture diagram"
"Show me Shopify integration"
"What does the analytics module look like?"
```

## 🎤 Example Conversations

### Example 1: Product Overview
```
User: "What does Hypersonix look like?"

AI: [Calls show_visual("dashboard", type="image")]
    "Here's our main dashboard! [shows image]
     It displays real-time revenue analytics..."
```

### Example 2: Pricing Question
```
User: "How much does it cost?"

AI: [Calls show_visual("pricing", category="pricing")]
    "Let me show you our pricing plans! [shows chart]
     We have three tiers..."
```

### Example 3: Technical Details
```
User: "How does your architecture work?"

AI: [Calls show_visual("architecture", type="image")]
    "Great question! Here's our system architecture. [shows diagram]
     We use a cloud-native approach..."
```

## 📊 Supported Media Types

### 1. Images (`.png`, `.jpg`, `.webp`)
- Product screenshots
- Feature illustrations
- UI mockups
- Infographics

**Display**: Full-width image with title/description

### 2. Videos (`.mp4`, `.webm`)
- Product demos
- Tutorial walkthroughs
- Feature showcases
- Customer testimonials

**Display**: Embedded video player with controls

### 3. Charts (`.png`, `.svg`)
- Pricing tables
- Feature comparisons
- ROI calculators
- Performance graphs

**Display**: Image with blue background highlight

### 4. PDFs (`.pdf`)
- Whitepapers
- Case studies
- Technical documentation
- Product brochures

**Display**: PDF icon + "View PDF" button (opens in new tab)

### 5. Slides (`.pptx`, `.key` exports)
- Pitch decks
- Product presentations
- Sales decks
- Training materials

**Display**: Thumbnail + "View Slides" button

### 6. GIFs (`.gif`)
- Animated demos
- UI walkthroughs
- Loading states
- Feature highlights

**Display**: Auto-playing animation with title/description

## 🎨 Adding Your Own Visuals

### Method 1: Via Code

```typescript
import { addMediaAsset } from "@/lib/media";

await addMediaAsset({
  companyId: "your-company-id",
  type: "image",
  url: "https://your-cdn.com/screenshot.png",
  title: "Feature Screenshot",
  description: "Advanced analytics dashboard showing real-time data",
  category: "feature",
  tags: ["analytics", "dashboard", "realtime"],
  metadata: {
    width: 1920,
    height: 1080,
  },
});
```

### Method 2: Via Database

```sql
INSERT INTO MediaAsset (
  id, companyId, type, url, title, 
  description, category, tags, createdAt
) VALUES (
  'unique-id',
  'your-company-id',
  'image',
  'https://example.com/image.png',
  'Product Screenshot',
  'Main dashboard view',
  'product',
  '["dashboard","analytics"]',
  CURRENT_TIMESTAMP
);
```

### Method 3: Create Admin UI (Future)

Build an admin interface for:
- Upload images directly
- Generate thumbnails automatically
- Tag and categorize
- Preview before publishing

## 🏷️ Categories

Organize visuals by category:

| Category | Use For |
|----------|---------|
| **product** | Core product screenshots, UI |
| **pricing** | Pricing tables, plans, ROI |
| **comparison** | vs competitors, feature matrices |
| **demo** | Demos, walkthroughs, tutorials |
| **case-study** | Customer success stories, results |
| **feature** | Specific feature deep-dives |
| **architecture** | Technical diagrams, system design |

## 🔍 Search & Matching

The AI searches visuals by:

1. **Title Match** - "pricing" finds "Pricing Plans Comparison"
2. **Description Match** - "shopify" finds assets mentioning Shopify
3. **Tag Match** - "analytics" finds all assets tagged with it
4. **Category Filter** - type="pricing" shows only pricing assets
5. **Type Filter** - category="chart" shows only charts

### Search Priority:
```
1. Exact title match
2. Description keyword match
3. Tag match
4. Category match
5. Recent first (if tied)
```

## 💡 Best Practices

### For AI Responses:
1. **Show, don't just tell** - Use visuals liberally
2. **Context matters** - Show relevant visuals for the question
3. **Explain visuals** - Brief description with each visual
4. **Multiple visuals OK** - Can show 2-3 if helpful

### For Content Creators:
1. **High quality** - Use clear, professional images
2. **Descriptive titles** - Help AI find the right content
3. **Good tags** - More tags = better discoverability
4. **Thumbnails** - Especially for videos/PDFs
5. **Optimize size** - Compress images for fast loading

### For Developers:
1. **CDN hosting** - Use CDN for fast delivery
2. **Lazy loading** - Load images as needed
3. **Responsive** - Images work on mobile
4. **Alt text** - Accessibility via titles/descriptions
5. **Cache headers** - Browser caching for performance

## 🎭 UI Display Examples

### Images & Charts:
```
┌────────────────────────────┐
│                            │
│   [Full Image Display]     │
│                            │
├────────────────────────────┤
│ Dashboard Overview         │
│ Main analytics view...     │
└────────────────────────────┘
```

### Videos:
```
┌────────────────────────────┐
│  ▶️  [Video Player]        │
│  [Progress bar] 🔊 ⚙️      │
├────────────────────────────┤
│ Product Demo Video         │
│ 3-minute walkthrough...    │
└────────────────────────────┘
```

### PDFs:
```
┌────────────────────────────┐
│  📄  Whitepaper Document   │
│                            │
│  Download our guide to...  │
│                            │
│  [📄 View PDF]  button     │
└────────────────────────────┘
```

## 📈 Analytics & Tracking

Track visual content usage:

```typescript
// Log when visuals are shown
await logMediaView({
  assetId: asset.id,
  companyId,
  sessionId,
  timestamp: new Date(),
});

// Analytics queries:
// - Most viewed visuals
// - Conversion impact
// - Popular categories
// - A/B test different visuals
```

## 🔧 Customization

### Change Display Grid:
```tsx
// In WidgetChatRealtime.tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {/* 3 columns instead of 2 */}
</div>
```

### Add Lightbox:
```tsx
// Click to enlarge images
<img 
  onClick={() => openLightbox(asset.url)}
  className="cursor-pointer hover:opacity-80"
/>
```

### Custom Styling:
```tsx
// Different colors per category
{asset.category === "pricing" && (
  <div className="border-4 border-green-500">...</div>
)}
```

## 🚨 Troubleshooting

### "No visuals found"
- Run `npm run seed:visuals` first
- Check database: `npx prisma studio`
- Verify MediaAsset table has rows

### Images not loading
- Check URL is accessible
- Check CORS if external hosting
- Verify URL format (https://)

### AI not showing visuals
- Check system prompt includes visual instructions
- Verify show_visual tool is in toolDefinitions
- Check console for tool call logs

### Visual display issues
- Check browser console for errors
- Verify image URLs are valid
- Test different media types

## 🎯 Future Enhancements

### Phase 2:
- [ ] Admin UI for uploading visuals
- [ ] Automatic thumbnail generation
- [ ] Image optimization/resizing
- [ ] Bulk upload via CSV
- [ ] Visual A/B testing

### Phase 3:
- [ ] AI-generated charts (from data)
- [ ] Real-time screenshot capture
- [ ] Video transcription/indexing
- [ ] Interactive diagrams
- [ ] Presentation mode

### Phase 4:
- [ ] AR/VR product visualization
- [ ] 3D model viewer
- [ ] Live screen sharing
- [ ] Collaborative whiteboard
- [ ] Video conferencing integration

## 📚 API Reference

### searchMediaAssets()
```typescript
const visuals = await searchMediaAssets({
  companyId: "xxx",
  query: "pricing",           // Optional: search term
  type: "chart",              // Optional: filter by type
  category: "pricing",        // Optional: filter by category
  tags: ["comparison"],       // Optional: filter by tags
  limit: 5,                   // Optional: max results (default: 5)
});
```

### addMediaAsset()
```typescript
const asset = await addMediaAsset({
  companyId: "xxx",           // Required
  type: "image",              // Required
  url: "https://...",         // Required
  title: "Screenshot",        // Required
  description: "...",         // Optional
  category: "product",        // Optional
  tags: ["tag1", "tag2"],     // Optional
  thumbnail: "https://...",   // Optional
  metadata: { width: 800 },   // Optional
});
```

## ✅ Testing Checklist

Before going live:

- [ ] Run migrations successfully
- [ ] Seed sample visuals
- [ ] Test image display
- [ ] Test video playback
- [ ] Test PDF links
- [ ] Test chart display
- [ ] Test on mobile
- [ ] Verify AI shows visuals when asked
- [ ] Check loading performance
- [ ] Verify CDN/hosting works
- [ ] Test with real product images
- [ ] Get content team approval

## 🎓 Training Your AI

Update system prompt to encourage visual use:

```typescript
"When answering questions:
- Show dashboard screenshots for overview questions
- Display pricing charts when discussing costs
- Share architecture diagrams for technical queries
- Use comparison charts vs competitors
- Show feature screenshots for capability questions
- Display case study visuals for proof points"
```

## 🌟 Example Use Cases

### Sales Conversation:
```
Prospect: "How does this compare to [competitor]?"
AI: Shows comparison chart + explains differences
Result: Visual makes value prop clearer
```

### Product Demo:
```
Prospect: "What features do you have?"
AI: Shows feature screenshots one by one
Result: More engaging than text list
```

### Technical Discussion:
```
Developer: "How does the integration work?"
AI: Shows architecture diagram + integration flow
Result: Technical clarity, builds confidence
```

### Pricing Discussion:
```
CFO: "What's the ROI?"
AI: Shows ROI calculator chart + case study results
Result: Data-driven decision making
```

---

**Status**: ✅ Visual Content System Complete  
**Media Types**: Images, Videos, PDFs, Charts, Slides, GIFs  
**Ready to Use**: Run migrations + seed + test!

🎨 **Your AI SDR is now multimodal!** 🎨

