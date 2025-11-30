import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { processVideoAsset } from "../src/lib/videoProcessor";

/**
 * Reprocess a video to extract frame analysis
 * 
 * Usage:
 *   npx tsx scripts/reprocessVideo.ts <video-id>
 */
async function main() {
  const args = process.argv.slice(2);
  const videoId = args[0] || "cmikr6mj80001w3ly9ptjrh79"; // Default to the video in question

  if (!videoId) {
    console.error("❌ Error: Please provide a video ID");
    console.log("\nUsage:");
    console.log("  npx tsx scripts/reprocessVideo.ts <video-id>");
    process.exit(1);
  }

  console.log(`\n🔄 Reprocessing video: ${videoId}\n`);

  // Check if video exists
  const video = await prisma.mediaAsset.findUnique({
    where: { id: videoId },
  });

  if (!video) {
    console.error(`❌ Video not found: ${videoId}`);
    process.exit(1);
  }

  if (video.type !== "video") {
    console.error(`❌ Asset is not a video (type: ${video.type})`);
    process.exit(1);
  }

  console.log(`📹 Video: ${video.title}`);
  console.log(`   URL: ${video.url}`);
  console.log(`   Current status: ${video.processingStatus || "pending"}`);
  console.log(`   Has transcript: ${video.transcript ? "✅" : "❌"}`);
  console.log(`   Has frame analysis: ${video.frameAnalysis ? "✅" : "❌"}`);
  console.log("");

  try {
    console.log("⏳ Starting reprocessing...\n");
    
    const result = await processVideoAsset(videoId);
    
    console.log("\n✅ Reprocessing completed!");
    console.log(`   Document ID: ${result.documentId}`);
    console.log(`   Transcript length: ${result.transcript.length} characters`);
    console.log(`   Frames analyzed: ${result.frameCount}`);
    
    // Fetch updated video to show new frame analysis
    const updated = await prisma.mediaAsset.findUnique({
      where: { id: videoId },
    });
    
    if (updated?.frameAnalysis) {
      try {
        const frames = JSON.parse(updated.frameAnalysis);
        console.log(`   Frame analysis: ${Array.isArray(frames) ? frames.length : 0} frames`);
      } catch (e) {
        console.log(`   Frame analysis: Error parsing`);
      }
    }
    
  } catch (error: any) {
    console.error("\n❌ Reprocessing failed:", error.message);
    console.error("\nError details:", error);
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

