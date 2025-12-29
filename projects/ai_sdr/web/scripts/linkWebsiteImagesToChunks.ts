/**
 * Retroactively link website images to chunks
 * 
 * This script links existing website images to chunks from the same page.
 * Run this if you crawled a website before the image linking fix was implemented.
 * 
 * Usage:
 *   npx tsx scripts/linkWebsiteImagesToChunks.ts --companyId=<id>
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";

async function main() {
  const args = process.argv.slice(2);
  const companyId = args.find(arg => arg.startsWith("--companyId="))?.split("=")[1];

  if (!companyId) {
    console.error("Usage: npx tsx scripts/linkWebsiteImagesToChunks.ts --companyId=<id>");
    process.exit(1);
  }

  console.log(`🔗 Linking website images to chunks for company: ${companyId}\n`);

  // Find all website documents
  const websiteDocs = await prisma.document.findMany({
    where: {
      companyId,
      source: "website_page",
    },
    include: {
      chunks: true,
    },
  });

  console.log(`Found ${websiteDocs.length} website documents\n`);

  let totalLinked = 0;

  for (const doc of websiteDocs) {
    if (!doc.url) continue;

    // Find images from the same website page
    const pageImages = await prisma.mediaAsset.findMany({
      where: {
        companyId,
        type: "image",
        metadata: {
          contains: doc.url,
        },
      },
    });

    if (pageImages.length === 0) {
      console.log(`  ⏭️  ${doc.title}: No images found for this page`);
      continue;
    }

    // Get the primary image (first one)
    const primaryImage = pageImages[0];

    // Update chunks to link to the primary image
    let chunkCount = 0;
    for (const chunk of doc.chunks) {
      const existingMetadata = chunk.metadata ? JSON.parse(chunk.metadata) : {};
      
      // Only update if chunk doesn't already have an image link
      if (!existingMetadata.mediaAssetId || existingMetadata.mediaAssetId === doc.mediaAssetId) {
        const updatedMetadata = {
          ...existingMetadata,
          sourceType: "website",
          url: doc.url,
          headingsPath: doc.headingsPath ? JSON.parse(doc.headingsPath) : undefined,
          // Link to primary image
          mediaAssetId: primaryImage.id,
          imageAssetIds: pageImages.map(img => img.id),
        };

        await prisma.chunk.update({
          where: { id: chunk.id },
          data: {
            metadata: JSON.stringify(updatedMetadata),
          },
        });

        chunkCount++;
      }
    }

    if (chunkCount > 0) {
      console.log(`  ✅ ${doc.title}: Linked ${chunkCount} chunks to ${pageImages.length} image(s)`);
      totalLinked += chunkCount;
    } else {
      console.log(`  ⏭️  ${doc.title}: Chunks already have image links`);
    }
  }

  console.log(`\n✅ Complete! Linked ${totalLinked} chunks to images.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
