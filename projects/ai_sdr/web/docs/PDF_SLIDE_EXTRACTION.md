# PDF Slide Extraction Feature

## Overview

The PDF processor now automatically extracts individual pages/slides from PowerPoint presentations (PDFs) as images, processes them with OCR, and stores them as separate media assets while maintaining connections to the original PDF and its text content.

## How It Works

### 1. **PDF Text Extraction** (Existing)
- Extracts all text from the PDF using `pdf-parse`
- Creates RAG documents from extracted text
- Links document to the original PDF media asset

### 2. **Slide Extraction** (New)
- Converts each PDF page to a high-quality PNG image (2x scale)
- Saves slides to `public/uploads/slides/[pdf-name]/page-N.png`
- Uses `pdfjs-dist` and `canvas` libraries

### 3. **Slide Processing** (New)
- Creates a separate `MediaAsset` for each slide (type: "slide")
- Processes each slide image with OCR using GPT-4 Vision
- Creates RAG documents from OCR text for each slide
- Links slides back to the original PDF via metadata

### 4. **Connection Maintenance**
- **PDF → Slides**: PDF metadata stores `slideAssetIds` array
- **Slides → PDF**: Each slide's metadata contains `parentPdfId` and `parentPdfTitle`
- **Text → Images**: Both PDF text chunks and slide OCR text are searchable in RAG
- **Visual Search**: Slides can be found via `show_visual` tool

## Data Flow

```
PDF Upload
    ↓
[processPDFAsset]
    ↓
┌─────────────────┬──────────────────┐
│                 │                  │
Extract Text    Extract Pages    Create Slides
│                 │                  │
│                 │                  │
Create RAG Doc   Convert to PNG   Create Media Assets
│                 │                  │
│                 │                  │
Link to PDF      Save Images      Process with OCR
│                 │                  │
│                 │                  │
Store in KB      Link to PDF      Create RAG Docs
│                 │                  │
│                 │                  │
└─────────────────┴──────────────────┘
                    ↓
            All Connected & Searchable
```

## Database Relationships

### MediaAsset (PDF)
```json
{
  "id": "pdf-123",
  "type": "pdf",
  "title": "Airbnb Investor Presentation",
  "metadata": {
    "slideAssetIds": ["slide-1", "slide-2", ...],
    "numPages": 45,
    "textLength": 15000
  }
}
```

### MediaAsset (Slide)
```json
{
  "id": "slide-1",
  "type": "slide",
  "title": "Airbnb Investor Presentation - Page 1",
  "metadata": {
    "parentPdfId": "pdf-123",
    "parentPdfTitle": "Airbnb Investor Presentation",
    "pageNumber": 1,
    "width": 1654,
    "height": 2339
  }
}
```

### Document (RAG)
- PDF text document: `mediaAssetId` → PDF asset
- Slide OCR documents: `mediaAssetId` → Slide asset
- Both searchable via `search_knowledge` tool

## Usage

### Automatic Processing
When you upload a PDF through the media upload API, it automatically:
1. Extracts text and creates RAG documents
2. Extracts all pages as images
3. Creates slide media assets
4. Processes slides with OCR
5. Links everything together

### Manual Processing
```typescript
import { processPDFAsset } from "@/lib/pdfProcessor";

// Process a PDF (extracts text + slides)
await processPDFAsset("media-asset-id");
```

## Dependencies

### Required
- `pdf-parse`: Text extraction from PDFs
- `pdfjs-dist`: PDF rendering and page extraction
- `canvas`: Image rendering (Node.js canvas implementation)

### Installation
```bash
npm install pdf-parse pdfjs-dist canvas
npm install --save-dev @types/pdf-parse @types/canvas
```

### System Dependencies (for canvas)
**macOS:**
```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

**Ubuntu/Debian:**
```bash
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

**Note**: If canvas installation fails, slide extraction will be skipped but PDF text extraction will still work.

## File Structure

```
public/
  uploads/
    pdfs/
      airbnb-presentation.pdf
    slides/
      airbnb-presentation/
        page-1.png
        page-2.png
        ...
```

## Benefits

1. **Visual Search**: Users can search for and view specific slides
2. **OCR on Slides**: Image-based slides are now searchable via OCR
3. **Rich Context**: Both text and visual content available in RAG
4. **Maintained Connections**: Easy to navigate from PDF to slides and vice versa
5. **Flexible**: Works with any PDF (presentations, reports, etc.)

## Limitations

1. **Canvas Dependencies**: Requires system libraries (Cairo, Pango, etc.)
2. **Large PDFs**: Processing many pages can be slow
3. **Memory**: Large PDFs may consume significant memory during extraction
4. **Optional Feature**: If canvas/pdfjs-dist fail, text extraction still works

## Troubleshooting

### Slides Not Extracting
1. Check if `canvas` and `pdfjs-dist` are installed
2. Verify system dependencies are installed (see above)
3. Check server logs for import errors
4. Text extraction should still work even if slides fail

### Path Issues
- Ensure `public/uploads/slides/` directory is writable
- Check that paths are relative to `public/` directory

### OCR Failures
- Individual slide OCR failures won't stop PDF processing
- Check OpenAI API key and rate limits
- Review logs for specific slide errors

## Future Enhancements

- [ ] Batch processing optimization
- [ ] Slide thumbnail generation
- [ ] Slide deduplication (skip similar slides)
- [ ] Smart slide categorization
- [ ] Slide-to-text chunk linking (which chunks came from which slide)

---

*Last Updated: December 23, 2025*
