import { prisma } from "./prisma";
import { extractTextFromImage } from "./ocr";
import { ingestCompanyDoc } from "./rag";
import type { MediaAsset } from "@prisma/client";

/**
 * Process an image asset: extract text via OCR and create searchable RAG document
 */
export async function processImageAsset(
  mediaAssetId: string
): Promise<{ documentId: string; extractedText: string }> {
  console.log(`[ImageProcessor] Processing image asset: ${mediaAssetId}`);

  // Get the media asset
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: mediaAssetId },
  });

  if (!asset) {
    throw new Error(`MediaAsset ${mediaAssetId} not found`);
  }

  if (asset.type !== "image" && asset.type !== "chart" && asset.type !== "slide") {
    throw new Error(`Asset ${mediaAssetId} is not an image (type: ${asset.type})`);
  }

  // Update status to processing
  await prisma.mediaAsset.update({
    where: { id: mediaAssetId },
    data: { processingStatus: "processing" },
  });

  try {
    // Extract text using GPT-4 Vision
    const { text, confidence } = await extractTextFromImage(asset.url);

    // Create RAG document from extracted text, linking to media asset
    const document = await ingestCompanyDoc({
      companyId: asset.companyId,
      title: `${asset.title} (OCR)`,
      source: "ocr",
      content: text,
      mediaAssetId: asset.id, // Link chunks to media asset
    });

    // Update media asset with extracted text and status
    await prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: {
        extractedText: text,
        processingStatus: "completed",
        processedAt: new Date(),
        metadata: JSON.stringify({
          ...(asset.metadata ? JSON.parse(asset.metadata) : {}),
          ocrConfidence: confidence,
        }),
      },
    });

    console.log(`[ImageProcessor] Successfully processed image: ${asset.title}`);
    console.log(`[ImageProcessor] Created document: ${document.id}`);

    return {
      documentId: document.id,
      extractedText: text,
    };
  } catch (error) {
    console.error(`[ImageProcessor] Error processing image ${mediaAssetId}:`, error);

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
 * Batch process multiple images
 */
export async function batchProcessImages(
  companyId: string
): Promise<{ processed: number; failed: number }> {
  console.log(`[ImageProcessor] Batch processing images for company: ${companyId}`);

  const unprocessedImages = await prisma.mediaAsset.findMany({
    where: {
      companyId,
      type: { in: ["image", "chart"] },
      OR: [
        { processingStatus: null },
        { processingStatus: "pending" },
        { processingStatus: "failed" },
      ],
    },
  });

  console.log(`[ImageProcessor] Found ${unprocessedImages.length} images to process`);

  let processed = 0;
  let failed = 0;

  for (const asset of unprocessedImages) {
    try {
      await processImageAsset(asset.id);
      processed++;
    } catch (error) {
      console.error(`[ImageProcessor] Failed to process ${asset.id}:`, error);
      failed++;
    }
  }

  console.log(`[ImageProcessor] Batch complete: ${processed} processed, ${failed} failed`);

  return { processed, failed };
}

