import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { processImageAsset } from "../src/lib/imageProcessor";

async function main() {
  // Find the uploaded GIF
  const asset = await prisma.mediaAsset.findFirst({
    where: {
      title: { contains: "Competitor" },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!asset) {
    console.log("Asset not found!");
    return;
  }

  console.log("Found asset:", asset.title);
  console.log("URL:", asset.url);
  console.log("Type:", asset.type);
  console.log("\nAttempting OCR processing...\n");

  try {
    const result = await processImageAsset(asset.id);
    console.log("\n✅ SUCCESS!");
    console.log("Document ID:", result.documentId);
    console.log("Extracted text length:", result.extractedText.length);
    console.log("\nFirst 200 chars:");
    console.log(result.extractedText.substring(0, 200));
  } catch (error) {
    console.error("\n❌ FAILED:");
    console.error(error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

