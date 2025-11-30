import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";

/**
 * Check for error information and logs for a video
 */
async function main() {
  const videoId = "cmikr6mj80001w3ly9ptjrh79";
  
  const video = await prisma.mediaAsset.findUnique({
    where: { id: videoId },
  });

  if (!video) {
    console.log("Video not found");
    return;
  }

  console.log("\n" + "=".repeat(80));
  console.log(`📹 Video: ${video.title}`);
  console.log("=".repeat(80));
  
  console.log(`\n📋 Processing Status:`);
  console.log(`   Status: ${video.processingStatus || "pending"}`);
  console.log(`   Created: ${video.createdAt}`);
  console.log(`   Processed: ${video.processedAt || "N/A"}`);
  
  console.log(`\n📊 Processing Results:`);
  console.log(`   Transcript: ${video.transcript ? `✅ (${video.transcript.length} chars)` : "❌"}`);
  console.log(`   Frame Analysis: ${video.frameAnalysis ? `✅ (${video.frameAnalysis.length} chars)` : "❌"}`);
  console.log(`   Extracted Text: ${video.extractedText ? `✅ (${video.extractedText.length} chars)` : "❌"}`);
  
  // Check metadata for errors
  if (video.metadata) {
    try {
      const metadata = JSON.parse(video.metadata);
      console.log(`\n📦 Metadata:`);
      console.log(JSON.stringify(metadata, null, 2));
      
      if (metadata.error) {
        console.log(`\n❌ Error found in metadata:`);
        console.log(`   ${metadata.error}`);
      }
    } catch (e) {
      console.log(`\n⚠️  Metadata exists but couldn't parse: ${video.metadata.substring(0, 100)}...`);
    }
  }
  
  // Check frame analysis content
  if (video.frameAnalysis) {
    try {
      const frames = JSON.parse(video.frameAnalysis);
      console.log(`\n🖼️  Frame Analysis Details:`);
      if (Array.isArray(frames)) {
        console.log(`   Type: Array`);
        console.log(`   Length: ${frames.length}`);
        if (frames.length > 0) {
          console.log(`   First frame:`, frames[0]);
        } else {
          console.log(`   ⚠️  Empty array - no frames were analyzed`);
        }
      } else {
        console.log(`   Type: ${typeof frames}`);
        console.log(`   Value:`, frames);
      }
    } catch (e: any) {
      console.log(`\n⚠️  Frame analysis exists but couldn't parse: ${e.message}`);
      console.log(`   Raw value: ${video.frameAnalysis.substring(0, 200)}...`);
    }
  } else {
    console.log(`\n⚠️  No frame analysis stored`);
  }
  
  // Check for linked documents
  const documents = await prisma.document.findMany({
    where: { mediaAssetId: videoId },
  });
  
  console.log(`\n📚 Linked Documents: ${documents.length}`);
  documents.forEach((doc) => {
    console.log(`   - ${doc.title} (${doc.content.length} chars)`);
  });
  
  console.log("\n" + "=".repeat(80));
  console.log("\n💡 Note: Console logs from processing would be in your server terminal");
  console.log("   Look for lines starting with [VideoProcessor]");
  console.log("   Common issues:");
  console.log("   - Frame extraction returned empty array (bug fixed)");
  console.log("   - OpenAI API errors during frame analysis");
  console.log("   - Frame files deleted before analysis");
  console.log("\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

