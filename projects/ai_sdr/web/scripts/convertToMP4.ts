import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { convertToMP4 } from "../src/lib/videoProcessor";

/**
 * Convert QuickTime (.mov) or other video files to MP4
 * 
 * Usage:
 *   npx tsx scripts/convertToMP4.ts <input-file> [output-file]
 * 
 * Examples:
 *   npx tsx scripts/convertToMP4.ts public/uploads/videos/video.mov
 *   npx tsx scripts/convertToMP4.ts video.mov output.mp4
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("❌ Error: Please provide an input file path");
    console.log("\nUsage:");
    console.log("  npx tsx scripts/convertToMP4.ts <input-file> [output-file]");
    console.log("\nExamples:");
    console.log("  npx tsx scripts/convertToMP4.ts public/uploads/videos/video.mov");
    console.log("  npx tsx scripts/convertToMP4.ts video.mov output.mp4");
    process.exit(1);
  }

  const inputPath = path.resolve(args[0]);
  const outputPath = args[1] ? path.resolve(args[1]) : undefined;

  // Check if input file exists
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  console.log(`\n🔄 Converting: ${inputPath}`);
  if (outputPath) {
    console.log(`📁 Output: ${outputPath}`);
  }
  console.log("");

  try {
    const result = await convertToMP4(inputPath, outputPath);
    console.log(`\n✅ Success! Converted file: ${result}`);
  } catch (error: any) {
    console.error("\n❌ Conversion failed:", error.message);
    if (error.message.includes("ffmpeg")) {
      console.error("\n💡 Make sure ffmpeg is installed:");
      console.error("   macOS: brew install ffmpeg");
      console.error("   Linux: apt-get install ffmpeg");
      console.error("   Windows: Download from https://ffmpeg.org/download.html");
    }
    process.exit(1);
  }
}

main().catch(console.error);

