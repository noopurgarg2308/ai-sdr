import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";

async function main() {
  const videoId = "cmikr6mj80001w3ly9ptjrh79";
  
  const video = await prisma.mediaAsset.findUnique({
    where: { id: videoId },
  });

  if (!video) {
    console.log("Video not found");
    return;
  }

  console.log("Frame Analysis field:");
  console.log("  Type:", typeof video.frameAnalysis);
  console.log("  Value:", video.frameAnalysis);
  console.log("  Length:", video.frameAnalysis?.length);
  
  if (video.frameAnalysis) {
    try {
      const parsed = JSON.parse(video.frameAnalysis);
      console.log("  Parsed type:", Array.isArray(parsed) ? `Array with ${parsed.length} items` : typeof parsed);
      if (Array.isArray(parsed)) {
        console.log("  First item:", parsed[0]);
      }
    } catch (e: any) {
      console.log("  Parse error:", e.message);
    }
  } else {
    console.log("  Field is null/undefined");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

