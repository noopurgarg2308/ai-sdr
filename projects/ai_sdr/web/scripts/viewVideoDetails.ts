import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";

/**
 * View video transcription and frame analysis
 * 
 * Usage:
 *   npx tsx scripts/viewVideoDetails.ts [video-id]
 *   npx tsx scripts/viewVideoDetails.ts  # Shows all videos
 */
async function main() {
  const args = process.argv.slice(2);
  const videoId = args[0];

  if (videoId) {
    // Show specific video
    const video = await prisma.mediaAsset.findUnique({
      where: { id: videoId },
      include: {
        documents: true,
      },
    });

    if (!video) {
      console.error(`❌ Video not found: ${videoId}`);
      process.exit(1);
    }

    if (video.type !== "video") {
      console.error(`❌ Asset is not a video (type: ${video.type})`);
      process.exit(1);
    }

    displayVideoDetails(video);
  } else {
    // Show all videos
    const videos = await prisma.mediaAsset.findMany({
      where: { type: "video" },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (videos.length === 0) {
      console.log("No videos found in database.");
      process.exit(0);
    }

    console.log(`\n📹 Found ${videos.length} video(s):\n`);
    
    videos.forEach((video, index) => {
      console.log(`${index + 1}. ${video.title}`);
      console.log(`   ID: ${video.id}`);
      console.log(`   Status: ${video.processingStatus || "pending"}`);
      console.log(`   Transcript: ${video.transcript ? "✅" : "❌"}`);
      console.log(`   Frame Analysis: ${video.frameAnalysis ? "✅" : "❌"}`);
      console.log(`   Created: ${video.createdAt}`);
      console.log("");
    });

    console.log("\n💡 To view details, run:");
    console.log(`   npx tsx scripts/viewVideoDetails.ts <video-id>\n`);
  }
}

function displayVideoDetails(video: any) {
  console.log("\n" + "=".repeat(80));
  console.log(`📹 VIDEO: ${video.title}`);
  console.log("=".repeat(80));
  
  console.log(`\n📋 Metadata:`);
  console.log(`   ID: ${video.id}`);
  console.log(`   URL: ${video.url}`);
  console.log(`   Status: ${video.processingStatus || "pending"}`);
  console.log(`   Created: ${video.createdAt}`);
  if (video.processedAt) {
    console.log(`   Processed: ${video.processedAt}`);
  }

  // Show transcript
  if (video.transcript) {
    console.log(`\n📝 TRANSCRIPT (${video.transcript.length} characters):`);
    console.log("-".repeat(80));
    console.log(video.transcript);
    console.log("-".repeat(80));
  } else {
    console.log(`\n📝 TRANSCRIPT: ❌ Not available`);
    console.log(`   Status: ${video.processingStatus || "pending"}`);
    if (video.processingStatus === "failed") {
      console.log(`   ⚠️  Processing failed. Check logs for details.`);
    } else if (video.processingStatus === "processing") {
      console.log(`   ⏳ Still processing...`);
    } else {
      console.log(`   💡 Process the video to generate transcript.`);
    }
  }

  // Show frame analysis
  if (video.frameAnalysis) {
    try {
      const frames = JSON.parse(video.frameAnalysis);
      
      if (Array.isArray(frames) && frames.length > 0) {
        console.log(`\n🖼️  FRAME ANALYSIS (${frames.length} frames):`);
        console.log("-".repeat(80));
        
        frames.forEach((frame: any, index: number) => {
          const timestamp = formatTimestamp(frame.timestamp || 0);
          console.log(`\n[${index + 1}] ${timestamp}`);
          console.log(`   Description: ${frame.description || "N/A"}`);
          if (frame.frameUrl) {
            // Check if frame file exists
            const framePath = path.join(process.cwd(), "public", frame.frameUrl.replace(/^\//, ""));
            if (fs.existsSync(framePath)) {
              console.log(`   Frame: ${frame.frameUrl} ✅`);
            } else {
              console.log(`   Frame: ${frame.frameUrl} ❌ (file not found - may have been cleaned up)`);
            }
          }
        });
        console.log("-".repeat(80));
      } else {
        console.log(`\n🖼️  FRAME ANALYSIS: Empty array`);
      }
    } catch (e) {
      console.log(`\n🖼️  FRAME ANALYSIS: ❌ Invalid JSON`);
      console.log(`   Raw data: ${video.frameAnalysis.substring(0, 200)}...`);
    }
  } else {
    console.log(`\n🖼️  FRAME ANALYSIS: ❌ Not available`);
  }

  // Show extracted text (combined transcript + frames)
  if (video.extractedText) {
    console.log(`\n📄 EXTRACTED TEXT (Combined - ${video.extractedText.length} characters):`);
    console.log("-".repeat(80));
    console.log(video.extractedText.substring(0, 500));
    if (video.extractedText.length > 500) {
      console.log(`\n... (truncated, ${video.extractedText.length - 500} more characters)`);
    }
    console.log("-".repeat(80));
  }

  // Show linked documents
  if (video.documents && video.documents.length > 0) {
    console.log(`\n📚 LINKED RAG DOCUMENTS (${video.documents.length}):`);
    video.documents.forEach((doc: any) => {
      console.log(`   - ${doc.title}`);
      console.log(`     ID: ${doc.id}`);
      console.log(`     Content length: ${doc.content.length} chars`);
    });
  }

  // Check for frame files in filesystem
  console.log(`\n🔍 CHECKING FOR FRAME FILES:`);
  const framesDir = path.join(process.cwd(), "public", "uploads", "frames");
  if (fs.existsSync(framesDir)) {
    const frameDirs = fs.readdirSync(framesDir);
    if (frameDirs.length > 0) {
      console.log(`   Found ${frameDirs.length} frame directory(ies):`);
      frameDirs.forEach((dir) => {
        const dirPath = path.join(framesDir, dir);
        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.png'));
        if (files.length > 0) {
          console.log(`   - ${dir}/ (${files.length} frames)`);
          files.slice(0, 5).forEach((file) => {
            console.log(`     • ${file}`);
          });
          if (files.length > 5) {
            console.log(`     ... and ${files.length - 5} more`);
          }
        }
      });
    } else {
      console.log(`   No frame directories found (frames may have been cleaned up after processing)`);
    }
  } else {
    console.log(`   Frames directory doesn't exist yet`);
  }

  console.log("\n" + "=".repeat(80) + "\n");
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

