/**
 * Website Processor - Processes crawled website data into RAG documents
 * 
 * Similar to pdfProcessor.ts, this module:
 * 1. Takes crawled website pages
 * 2. Creates Documents with source: "website_page"
 * 3. Chunks text and creates embeddings
 * 4. Collects images and creates MediaAssets
 * 5. Optionally OCRs images (reuses existing imageProcessor)
 */

import { prisma } from "./prisma";
import { ingestCompanyDoc } from "./rag";
import { addMediaAsset } from "./media";
import { processImageAsset } from "./imageProcessor";
import { crawlWebsite, type CrawledPage, type CrawlOptions } from "./websiteCrawler";
import type { MediaAsset } from "@prisma/client";

/**
 * Process a website asset: crawl pages, extract text, collect images, create RAG documents
 */
export async function processWebsiteAsset(
  mediaAssetId: string,
  options: {
    maxPages?: number;
    maxDepth?: number;
    includeImages?: boolean;
    forceReindex?: boolean;
    dryRun?: boolean;
  } = {}
): Promise<{
  pagesProcessed: number;
  imagesCollected: number;
  documentsCreated: number;
}> {
  console.log(`[WebsiteProcessor] Processing website asset: ${mediaAssetId}`);

  // Get the media asset
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: mediaAssetId },
  });

  if (!asset) {
    throw new Error(`MediaAsset ${mediaAssetId} not found`);
  }

  if (asset.type !== "website") {
    throw new Error(`Asset ${mediaAssetId} is not a website (type: ${asset.type})`);
  }

  // Update status to processing
  await prisma.mediaAsset.update({
    where: { id: mediaAssetId },
    data: { processingStatus: "processing" },
  });

  try {
    const baseUrl = asset.url;
    
    // Parse crawl config from metadata if available
    const metadata = asset.metadata ? JSON.parse(asset.metadata) : {};
    const crawlConfig: CrawlOptions = {
      maxPages: options.maxPages ?? metadata.maxPages ?? 50,
      maxDepth: options.maxDepth ?? metadata.maxDepth ?? 3,
      includeImages: options.includeImages ?? metadata.includeImages ?? true,
      allowedDomains: metadata.allowedDomains || [],
    };

    if (options.dryRun) {
      console.log(`[WebsiteProcessor] DRY RUN: Would crawl ${baseUrl} with config:`, crawlConfig);
      return {
        pagesProcessed: 0,
        imagesCollected: 0,
        documentsCreated: 0,
      };
    }

    // Check if we should force reindex (delete existing documents)
    if (options.forceReindex) {
      console.log(`[WebsiteProcessor] Force reindex: deleting existing website documents`);
      const existingDocs = await prisma.document.findMany({
        where: {
          companyId: asset.companyId,
          source: "website_page",
          mediaAssetId: mediaAssetId,
        },
      });

      if (existingDocs.length > 0) {
        // Delete chunks first (cascade should handle this, but explicit is safer)
        await prisma.chunk.deleteMany({
          where: {
            documentId: { in: existingDocs.map(d => d.id) },
          },
        });

        // Delete documents
        await prisma.document.deleteMany({
          where: {
            id: { in: existingDocs.map(d => d.id) },
          },
        });

        console.log(`[WebsiteProcessor] Deleted ${existingDocs.length} existing documents`);
      }
    }

    // Crawl website
    console.log(`[WebsiteProcessor] Starting crawl of ${baseUrl}`);
    const crawledPages = await crawlWebsite(baseUrl, crawlConfig);

    let pagesProcessed = 0;
    let imagesCollected = 0;
    let documentsCreated = 0;

    // Process each crawled page
    for (const page of crawledPages) {
      try {
        // Create document for this page
        const document = await ingestCompanyDoc({
          companyId: asset.companyId,
          title: page.title || `Page: ${page.url}`,
          source: "website_page",
          content: page.text,
          mediaAssetId: asset.id, // Link to website source
        });

        // Update document with URL and headings path
        await prisma.document.update({
          where: { id: document.id },
          data: {
            url: page.url,
            headingsPath: JSON.stringify(page.headingsPath),
          },
        });

        documentsCreated++;
        pagesProcessed++;

        // Collect images FIRST (before updating chunks) so we can link them
        const pageImageAssetIds: string[] = [];
        
        if (crawlConfig.includeImages && page.images.length > 0) {
          for (const image of page.images) {
            try {
              // Check if image already exists (by URL)
              const existingImage = await prisma.mediaAsset.findFirst({
                where: {
                  companyId: asset.companyId,
                  url: image.url,
                  type: "image",
                },
              });

              if (existingImage) {
                // Link existing image to website source
                if (!existingImage.metadata) {
                  await prisma.mediaAsset.update({
                    where: { id: existingImage.id },
                    data: {
                      metadata: JSON.stringify({
                        websiteSourceId: mediaAssetId,
                        websiteUrl: page.url,
                      }),
                    },
                  });
                }
                // Add existing image to page's image list so it gets linked to chunks
                pageImageAssetIds.push(existingImage.id);
                imagesCollected++; // Count it as collected
                continue;
              }

              // Create media asset for image
              const imageAsset = await addMediaAsset({
                companyId: asset.companyId,
                type: "image",
                url: image.url,
                title: image.alt || image.title || `Image from ${page.url}`,
                description: `Image from website page: ${page.title}`,
                metadata: {
                  websiteSourceId: mediaAssetId,
                  websiteUrl: page.url,
                  alt: image.alt,
                  title: image.title,
                },
              });

              pageImageAssetIds.push(imageAsset.id);
              imagesCollected++;

              // Optionally OCR the image (reuse existing pipeline)
              // Queue it for processing (will use existing imageProcessor)
              if (image.url.startsWith("http")) {
                // Only OCR if it's a remote URL (can't OCR local files here)
                // The image will be downloaded and processed by imageProcessor
                // For now, we'll queue it for OCR processing
                // Note: This requires the image to be downloaded first, which is complex
                // For MVP, we'll skip automatic OCR of website images
                // Admin can manually trigger OCR if needed
              }
            } catch (error) {
              console.error(`[WebsiteProcessor] Error processing image ${image.url}:`, error);
              // Continue with next image
            }
          }
        }

        // Update chunk metadata with website-specific info AND link to images
        const chunks = await prisma.chunk.findMany({
          where: { documentId: document.id },
        });

        for (const chunk of chunks) {
          const existingMetadata = chunk.metadata ? JSON.parse(chunk.metadata) : {};
          
          // Link to first image from this page (if any) for visual display
          // Store all image IDs in metadata for potential future use
          const primaryImageId = pageImageAssetIds.length > 0 ? pageImageAssetIds[0] : undefined;
          
          const updatedMetadata = {
            ...existingMetadata,
            sourceType: "website",
            url: page.url,
            headingsPath: page.headingsPath,
            // Link to primary image for this page (for visual display)
            mediaAssetId: primaryImageId || existingMetadata.mediaAssetId,
            // Store all image IDs from this page
            imageAssetIds: pageImageAssetIds.length > 0 ? pageImageAssetIds : undefined,
          };

          await prisma.chunk.update({
            where: { id: chunk.id },
            data: {
              metadata: JSON.stringify(updatedMetadata),
            },
          });
          
          if (primaryImageId) {
            console.log(`[WebsiteProcessor] Linked image ${primaryImageId} to chunk ${chunk.id} from page ${page.url}`);
          }
        }
        
        if (pageImageAssetIds.length > 0) {
          console.log(`[WebsiteProcessor] Page ${page.url} has ${pageImageAssetIds.length} images linked to ${chunks.length} chunks`);
        }

        console.log(`[WebsiteProcessor] Processed page ${pagesProcessed}/${crawledPages.length}: ${page.title}`);
      } catch (error) {
        console.error(`[WebsiteProcessor] Error processing page ${page.url}:`, error);
        // Continue with next page
      }
    }

    // Update media asset status
    await prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: {
        processingStatus: "completed",
        processedAt: new Date(),
        metadata: JSON.stringify({
          ...metadata,
          pagesProcessed,
          imagesCollected,
          documentsCreated,
          lastCrawledAt: new Date().toISOString(),
        }),
      },
    });

    console.log(`[WebsiteProcessor] Successfully processed website: ${pagesProcessed} pages, ${imagesCollected} images, ${documentsCreated} documents`);

    return {
      pagesProcessed,
      imagesCollected,
      documentsCreated,
    };
  } catch (error) {
    console.error(`[WebsiteProcessor] Error processing website ${mediaAssetId}:`, error);

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
