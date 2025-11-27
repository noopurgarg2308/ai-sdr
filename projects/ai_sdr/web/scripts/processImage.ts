import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { processImageAsset } from "../src/lib/imageProcessor";

async function main() {
  // Find the failed image
  const failedImage = await prisma.mediaAsset.findFirst({
    where: {
      type: "image",
      processingStatus: "failed",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!failedImage) {
    console.log("No failed images to process");
    return;
  }

  console.log(`\n🔄 Retrying OCR for: ${failedImage.title}`);
  console.log(`URL: ${failedImage.url}\n`);

  try {
    const result = await processImageAsset(failedImage.id);
    
    console.log(`\n✅ Success!`);
    console.log(`Document ID: ${result.documentId}`);
    console.log(`Extracted ${result.extractedText.length} characters`);
    console.log(`\nFirst 200 chars:`);
    console.log(result.extractedText.substring(0, 200) + "...");
  } catch (error) {
    console.error("\n❌ Processing failed:", error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

