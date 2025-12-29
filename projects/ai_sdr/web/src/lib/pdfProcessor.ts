import { prisma } from "./prisma";
import { ingestCompanyDoc } from "./rag";
import { processImageAsset } from "./imageProcessor";
import { addMediaAsset } from "./media";
import type { MediaAsset } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

/**
 * Extract text from PDF file
 */
async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    const pdfParse = await import("pdf-parse").catch(() => null);
    
    if (pdfParse) {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse.default(dataBuffer);
      return data.text;
    }
    
    console.warn("[PDFProcessor] pdf-parse not installed. Install with: npm install pdf-parse");
    throw new Error("PDF parsing library not available. Install pdf-parse: npm install pdf-parse");
  } catch (error) {
    console.error("[PDFProcessor] Error extracting text from PDF:", error);
    throw error;
  }
}

/**
 * Check if a PDF page contains images/charts
 */
async function pageHasImages(filePath: string, pageNumber: number): Promise<boolean> {
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs").catch(() => null);
    
    if (!pdfjsLib) {
      return false; // Can't check without pdfjs-dist
    }

    const dataBuffer = fs.readFileSync(filePath);
    const uint8Array = new Uint8Array(dataBuffer);
    const getDocument = pdfjsLib.getDocument || (pdfjsLib as any).default?.getDocument;
    
    if (!getDocument) {
      return false;
    }

    const pdf = await getDocument({ data: uint8Array }).promise;
    const page = await pdf.getPage(pageNumber);
    
    // Get the operator list which contains all drawing operations
    const operatorList = await page.getOperatorList();
    
    // Check for image painting operations
    // These operations indicate images/charts are being rendered
    const imageOps = [
      pdfjsLib.OPS?.paintImageXObject,
      pdfjsLib.OPS?.paintJpegXObject,
      pdfjsLib.OPS?.paintInlineImageXObject,
    ].filter(Boolean); // Remove undefined values
    
    // Check if any image operations exist in the operator list
    if (imageOps.length > 0 && operatorList?.fnArray) {
      const hasImages = operatorList.fnArray.some((op: number) => 
        imageOps.includes(op)
      );
      return hasImages;
    }
    
    return false;
  } catch (error) {
    console.warn(`[PDFProcessor] Could not check for images on page ${pageNumber}:`, error);
    return false; // Default to false (no images) if check fails
  }
}

/**
 * Extract text from a specific page of a PDF
 */
async function extractTextFromPDFPage(filePath: string, pageNumber: number): Promise<string> {
  try {
    // Use pdfjs-dist to get page text (more accurate than pdf-parse for page-by-page)
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs").catch(() => null);
    
    if (pdfjsLib) {
      const dataBuffer = fs.readFileSync(filePath);
      const uint8Array = new Uint8Array(dataBuffer);
      const getDocument = pdfjsLib.getDocument || (pdfjsLib as any).default?.getDocument;
      
      if (getDocument) {
        const pdf = await getDocument({ data: uint8Array }).promise;
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        
        // Combine all text items from the page
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        
        return pageText;
      }
    }
    
    return "";
  } catch (error) {
    console.warn(`[PDFProcessor] Could not extract text from page ${pageNumber}:`, error);
    return "";
  }
}

/**
 * Extract PDF pages as images (slides)
 * Returns array of image file paths
 */
async function extractPDFPagesAsImages(
  pdfPath: string,
  outputDir: string
): Promise<Array<{ pageNumber: number; imagePath: string; width: number; height: number }>> {
  try {
    // Try to use pdfjs-dist with canvas
    // Note: pdfjs-dist requires special setup for Node.js
    let pdfjsLib: any = null;
    let createCanvas: any = null;
    let Image: any = null;

    try {
      // Import canvas first and make Image available globally
      // Use @napi-rs/canvas which is compatible with pdfjs-dist 4.9.155+
      const canvasModule = await import("@napi-rs/canvas").catch(() => null);
      if (canvasModule) {
        createCanvas = canvasModule.createCanvas;
        Image = canvasModule.Image;
        
        // Make Image available globally BEFORE importing pdfjs-dist
        // pdfjs-dist needs Image to be available when it loads
        if (typeof global !== 'undefined' && Image) {
          (global as any).Image = Image;
          (global as any).Canvas = createCanvas;
        }
      }
      
      // Use legacy build for Node.js compatibility
      pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs").catch(() => null);
    } catch (importError) {
      console.warn("[PDFProcessor] Could not import pdfjs-dist or canvas:", importError);
    }
    
    if (!pdfjsLib || !createCanvas) {
      console.warn("[PDFProcessor] pdfjs-dist or canvas not available. Skipping slide extraction.");
      console.warn("[PDFProcessor] Install with: npm install pdfjs-dist canvas");
      console.warn("[PDFProcessor] Note: Canvas requires system dependencies (Cairo, Pango, etc.)");
      return [];
    }

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const dataBuffer = fs.readFileSync(pdfPath);
    
    // Convert Buffer to Uint8Array (pdfjs-dist requires Uint8Array)
    const uint8Array = new Uint8Array(dataBuffer);
    
    // Get document - use legacy build's getDocument
    const getDocument = pdfjsLib.getDocument || (pdfjsLib as any).default?.getDocument;
    if (!getDocument) {
      throw new Error("Could not find getDocument in pdfjs-dist");
    }
    
    // Create a custom canvas factory for Node.js
    class NodeCanvasFactory {
      create(width: number, height: number) {
        const canvas = createCanvas(width, height);
        const context = canvas.getContext("2d");
        return {
          canvas,
          context,
        };
      }

      reset(canvasAndContext: any, width: number, height: number) {
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
      }

      destroy(canvasAndContext: any) {
        canvasAndContext.canvas = null;
        canvasAndContext.context = null;
      }
    }

    // Set up canvas factory for pdfjs-dist
    const canvasFactory = new NodeCanvasFactory();
    
    // Load PDF
    const pdf = await getDocument({
      data: uint8Array,
      canvasFactory: canvasFactory,
      // Disable worker to avoid worker-related issues in Node.js
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;
    
    const numPages = pdf.numPages;

    console.log(`[PDFProcessor] Extracting ${numPages} pages as images from PDF`);

    const extractedPages: Array<{ pageNumber: number; imagePath: string; width: number; height: number }> = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for better quality

      // Create canvas using factory
      const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);
      const canvas = canvasAndContext.canvas;
      const context = canvasAndContext.context;

      // Render PDF page to canvas
      // Image should already be available globally from import
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      
      await page.render(renderContext).promise;

      // Save as PNG
      const imagePath = path.join(outputDir, `page-${pageNum}.png`);
      const buffer = canvas.toBuffer("image/png");
      fs.writeFileSync(imagePath, buffer);

      // Clean up
      canvasFactory.destroy(canvasAndContext);

      extractedPages.push({
        pageNumber: pageNum,
        imagePath: imagePath,
        width: viewport.width,
        height: viewport.height,
      });

      console.log(`[PDFProcessor] Extracted page ${pageNum}/${numPages}`);
    }

    console.log(`[PDFProcessor] Successfully extracted ${extractedPages.length} pages as images`);
    return extractedPages;
  } catch (error) {
    console.error("[PDFProcessor] Error extracting PDF pages as images:", error);
    // Don't throw - slide extraction is optional, PDF text extraction can still work
    return [];
  }
}

/**
 * Process a PDF asset: extract text and create searchable RAG document
 */
export async function processPDFAsset(
  mediaAssetId: string
): Promise<{ documentId: string; extractedText: string }> {
  console.log(`[PDFProcessor] Processing PDF asset: ${mediaAssetId}`);

  // Get the media asset
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: mediaAssetId },
  });

  if (!asset) {
    throw new Error(`MediaAsset ${mediaAssetId} not found`);
  }

  if (asset.type !== "pdf") {
    throw new Error(`Asset ${mediaAssetId} is not a PDF (type: ${asset.type})`);
  }

  // Update status to processing
  await prisma.mediaAsset.update({
    where: { id: mediaAssetId },
    data: { processingStatus: "processing" },
  });

  try {
    // Get the full file path
    const filePath = path.join(process.cwd(), "public", asset.url);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`PDF file not found at: ${filePath}`);
    }

    // Extract text from PDF
    const text = await extractTextFromPDF(filePath);

    if (!text || text.trim().length === 0) {
      throw new Error("No text extracted from PDF. The PDF might be image-based or corrupted.");
    }

    // Create RAG document from extracted text, linking to PDF media asset
    const document = await ingestCompanyDoc({
      companyId: asset.companyId,
      title: `${asset.title} (PDF)`,
      source: "pdf_extract",
      content: text,
      mediaAssetId: asset.id, // Link chunks to PDF media asset
    });

    // Extract PDF pages as images (slides)
    // Store slides in public/uploads/slides/[pdf-name]/
    const publicDir = path.join(process.cwd(), "public");
    const pdfBaseName = path.basename(filePath, path.extname(filePath));
    const slidesDir = path.join(publicDir, "uploads", "slides", pdfBaseName);
    
    const extractedPages = await extractPDFPagesAsImages(filePath, slidesDir);
    const slideAssetIds: string[] = [];

    // Create media assets for each slide and process them
    if (extractedPages.length > 0) {
      console.log(`[PDFProcessor] Creating ${extractedPages.length} slide media assets`);
      
      for (const page of extractedPages) {
        // Convert absolute path to relative path for URL (relative to public/)
        const relativeImagePath = path.relative(publicDir, page.imagePath).replace(/\\/g, "/");
        const imageUrl = `/${relativeImagePath}`;

        // Create media asset for this slide
        const slideAsset = await addMediaAsset({
          companyId: asset.companyId,
          type: "slide",
          url: imageUrl,
          title: `${asset.title} - Page ${page.pageNumber}`,
          description: `Slide ${page.pageNumber} extracted from ${asset.title}`,
          category: asset.category || undefined,
          tags: asset.tags ? JSON.parse(asset.tags) : undefined,
          metadata: {
            parentPdfId: mediaAssetId,
            parentPdfTitle: asset.title,
            pageNumber: page.pageNumber,
            width: page.width,
            height: page.height,
            extractedAt: new Date().toISOString(),
          },
        });

        slideAssetIds.push(slideAsset.id);

        // Smart decision: Check if page has images, then decide on OCR
        // This is much more accurate than using text length as a proxy
        try {
          // First, check if the page actually contains images/charts
          const hasImages = await pageHasImages(filePath, page.pageNumber);
          
          // Also extract text to see how much text content there is
          const pageText = await extractTextFromPDFPage(filePath, page.pageNumber);
          const textLength = pageText.trim().length;
          
          // Decision logic (prioritized):
          // 1. If page has images/charts → Always do OCR (to capture visual content)
          // 2. If page has substantial text (>50 chars) AND no images → Skip OCR (text is sufficient)
          // 3. If page has little text (<50 chars) AND no images → Do OCR (might be scanned/image-based)
          
          const MIN_TEXT_THRESHOLD = 50;
          
          if (hasImages) {
            // Page has images/charts - always do OCR to capture visual content
            console.log(`[PDFProcessor] Page ${page.pageNumber} contains images/charts - processing with OCR`);
            await processImageAsset(slideAsset.id);
            console.log(`[PDFProcessor] Processed slide ${page.pageNumber} with OCR`);
          } else if (textLength >= MIN_TEXT_THRESHOLD) {
            // Page has good text and no images - skip OCR (much faster)
            console.log(`[PDFProcessor] Page ${page.pageNumber} has ${textLength} chars of text, no images - skipping OCR (text extraction sufficient)`);
            
            // Create a document from the page text, linking to the slide media asset
            try {
              await ingestCompanyDoc({
                companyId: asset.companyId,
                title: `${asset.title} - Page ${page.pageNumber} (Text)`,
                source: "pdf_page_extract",
                content: pageText,
                mediaAssetId: slideAsset.id, // Link chunks to the slide
                pageNumber: page.pageNumber,
              });
              console.log(`[PDFProcessor] Created text document for page ${page.pageNumber} (linked to slide)`);
            } catch (docError) {
              console.warn(`[PDFProcessor] Could not create document for page ${page.pageNumber}:`, docError);
            }
          } else {
            // Little text and no images - might be scanned or image-based, do OCR
            console.log(`[PDFProcessor] Page ${page.pageNumber} has only ${textLength} chars, no images - processing with OCR (might be scanned)`);
            await processImageAsset(slideAsset.id);
            console.log(`[PDFProcessor] Processed slide ${page.pageNumber} with OCR`);
          }
        } catch (error) {
          console.error(`[PDFProcessor] Error processing slide ${page.pageNumber}:`, error);
          // Continue processing other slides even if one fails
        }
      }

      console.log(`[PDFProcessor] Created ${slideAssetIds.length} slide media assets`);
    }

    // Update media asset with extracted text, slides info, and status
    await prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: {
        extractedText: text.substring(0, 10000), // Store first 10k chars in asset
        processingStatus: "completed",
        processedAt: new Date(),
        metadata: JSON.stringify({
          ...(asset.metadata ? JSON.parse(asset.metadata) : {}),
          textLength: text.length,
          extractedAt: new Date().toISOString(),
          numPages: extractedPages.length,
          slideAssetIds: slideAssetIds,
        }),
      },
    });

    console.log(`[PDFProcessor] Successfully processed PDF: ${asset.title}`);
    console.log(`[PDFProcessor] Created document: ${document.id}`);
    console.log(`[PDFProcessor] Extracted ${text.length} characters`);
    console.log(`[PDFProcessor] Extracted ${extractedPages.length} slides`);

    return {
      documentId: document.id,
      extractedText: text,
    };
  } catch (error) {
    console.error(`[PDFProcessor] Error processing PDF ${mediaAssetId}:`, error);

    // Update status to failed
    await prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: {
        processingStatus: "failed",
        metadata: JSON.stringify({
          ...(asset.metadata ? JSON.parse(asset.metadata) : {}),
          error: error instanceof Error ? error.message : "Processing failed",
        }),
      },
    });

    throw error;
  }
}

/**
 * Batch process multiple PDFs
 */
export async function batchProcessPDFs(
  companyId: string
): Promise<{ processed: number; failed: number }> {
  console.log(`[PDFProcessor] Batch processing PDFs for company: ${companyId}`);

  const unprocessedPDFs = await prisma.mediaAsset.findMany({
    where: {
      companyId,
      type: "pdf",
      OR: [
        { processingStatus: null },
        { processingStatus: "pending" },
        { processingStatus: "failed" },
      ],
    },
  });

  console.log(`[PDFProcessor] Found ${unprocessedPDFs.length} PDFs to process`);

  let processed = 0;
  let failed = 0;

  for (const asset of unprocessedPDFs) {
    try {
      await processPDFAsset(asset.id);
      processed++;
    } catch (error) {
      console.error(`[PDFProcessor] Failed to process ${asset.id}:`, error);
      failed++;
    }
  }

  console.log(`[PDFProcessor] Batch complete: ${processed} processed, ${failed} failed`);

  return { processed, failed };
}
