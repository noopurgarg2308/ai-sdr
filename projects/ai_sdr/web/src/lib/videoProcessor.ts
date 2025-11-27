import { openai } from "./openai";
import { prisma } from "./prisma";
import { ingestCompanyDoc } from "./rag";
import * as fs from "fs";
import * as path from "path";

// Lazy load ffmpeg to avoid build issues
let ffmpeg: any = null;

async function getFFmpeg() {
  if (!ffmpeg) {
    const fluentFfmpeg = await import("fluent-ffmpeg");
    ffmpeg = fluentFfmpeg.default;
    
    // Try to set ffmpeg path if available on system
    // User should install via: brew install ffmpeg (Mac) or apt-get install ffmpeg (Linux)
    console.log("[VideoProcessor] Using system ffmpeg (install via: brew install ffmpeg)");
  }
  return ffmpeg;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface FrameDescription {
  timestamp: number;
  description: string;
  frameUrl?: string;
}

/**
 * Extract keyframes from video at regular intervals
 */
export async function extractKeyframes(
  videoPath: string,
  interval: number = 10 // seconds
): Promise<string[]> {
  console.log(`[VideoProcessor] Extracting keyframes from ${videoPath} every ${interval}s`);

  const outputDir = path.join(process.cwd(), "public", "uploads", "frames", Date.now().toString());
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const ffmpegInstance = await getFFmpeg();

  return new Promise((resolve, reject) => {
    const framePaths: string[] = [];

    ffmpegInstance(videoPath)
      .on("end", () => {
        console.log(`[VideoProcessor] Extracted ${framePaths.length} frames`);
        resolve(framePaths);
      })
      .on("error", (err: any) => {
        console.error("[VideoProcessor] Frame extraction error:", err);
        console.error("[VideoProcessor] Make sure ffmpeg is installed: brew install ffmpeg");
        reject(err);
      })
      .on("filenames", (filenames: string[]) => {
        framePaths.push(...filenames.map(f => path.join(outputDir, f)));
      })
      .screenshots({
        timestamps: Array.from({ length: 30 }, (_, i) => i * interval), // Extract up to 30 frames
        folder: outputDir,
        filename: "frame-%04d.png",
        size: "1280x720",
      });
  });
}

/**
 * Extract audio track from video (optional optimization for large files)
 */
async function extractAudioFromVideo(videoPath: string): Promise<string> {
  console.log(`[VideoProcessor] Extracting audio from video for better reliability`);
  
  const audioPath = path.join(process.cwd(), "public", "uploads", "temp", `audio_${Date.now()}.mp3`);
  const audioDir = path.dirname(audioPath);
  
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  const ffmpegInstance = await getFFmpeg();

  return new Promise((resolve, reject) => {
    ffmpegInstance(videoPath)
      .audioCodec("libmp3lame")
      .audioBitrate(128)
      .output(audioPath)
      .on("end", () => {
        console.log(`[VideoProcessor] Audio extracted to: ${audioPath}`);
        resolve(audioPath);
      })
      .on("error", (err: any) => {
        console.error("[VideoProcessor] Audio extraction error:", err);
        reject(err);
      })
      .run();
  });
}

/**
 * Transcribe video audio using OpenAI Whisper with retry logic
 */
export async function transcribeVideo(videoPath: string): Promise<{
  fullText: string;
  segments: TranscriptSegment[];
}> {
  console.log(`[VideoProcessor] Transcribing video: ${videoPath}`);

  // Check file size (Whisper has 25MB limit)
  const stats = fs.statSync(videoPath);
  const fileSizeMB = stats.size / (1024 * 1024);
  console.log(`[VideoProcessor] Video file size: ${fileSizeMB.toFixed(2)} MB`);

  if (fileSizeMB > 25) {
    throw new Error(`Video file too large (${fileSizeMB.toFixed(2)} MB). Whisper API limit is 25 MB. Please compress the video first.`);
  }

  // For files > 10MB, extract audio first for better reliability
  let audioPath = videoPath;
  let shouldCleanupAudio = false;

  if (fileSizeMB > 10) {
    try {
      audioPath = await extractAudioFromVideo(videoPath);
      shouldCleanupAudio = true;
      console.log(`[VideoProcessor] Using extracted audio for transcription`);
    } catch (error) {
      console.warn(`[VideoProcessor] Failed to extract audio, using video directly:`, error);
      // Continue with video file
    }
  }

  // Retry logic for network errors
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[VideoProcessor] Transcription attempt ${attempt}/${maxRetries}`);

      // Create a fresh read stream for each attempt (use audioPath if extracted, otherwise videoPath)
      const fileStream = fs.createReadStream(audioPath);

      const transcription = await openai.audio.transcriptions.create(
        {
          file: fileStream as any,
          model: "whisper-1",
          response_format: "verbose_json",
          timestamp_granularities: ["segment"],
        },
        {
          timeout: 300000, // 5 minute timeout for large files
        }
      );

      const segments: TranscriptSegment[] = ((transcription as any).segments || []).map((seg: any) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text,
      }));

      const fullText = (transcription as any).text || "";

      console.log(`[VideoProcessor] Transcribed ${fullText.length} characters`);

      // Cleanup extracted audio file if we created one
      if (shouldCleanupAudio && fs.existsSync(audioPath) && audioPath !== videoPath) {
        try {
          fs.unlinkSync(audioPath);
          console.log(`[VideoProcessor] Cleaned up temporary audio file`);
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      return {
        fullText,
        segments,
      };
    } catch (error: any) {
      lastError = error;
      const isNetworkError = 
        error?.code === "ECONNRESET" ||
        error?.code === "ETIMEDOUT" ||
        error?.code === "ENOTFOUND" ||
        error?.message?.includes("ECONNRESET") ||
        error?.message?.includes("timeout") ||
        error?.message?.includes("Connection");

      if (isNetworkError && attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
        console.warn(`[VideoProcessor] Network error on attempt ${attempt}, retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      // If not a network error or last attempt, throw immediately
      if (!isNetworkError || attempt === maxRetries) {
        console.error(`[VideoProcessor] Transcription error (attempt ${attempt}):`, error);
        
        // Cleanup extracted audio file on error
        if (shouldCleanupAudio && fs.existsSync(audioPath) && audioPath !== videoPath) {
          try {
            fs.unlinkSync(audioPath);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
        
        throw error;
      }
    }
  }

  // Cleanup on final failure
  if (shouldCleanupAudio && fs.existsSync(audioPath) && audioPath !== videoPath) {
    try {
      fs.unlinkSync(audioPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error("Transcription failed after retries");
}

/**
 * Analyze video frames using GPT-4 Vision (updated to gpt-4o)
 */
export async function analyzeFrames(
  framePaths: string[],
  transcriptSegments: TranscriptSegment[]
): Promise<FrameDescription[]> {
  console.log(`[VideoProcessor] Analyzing ${framePaths.length} frames with GPT-4 Vision`);

  const descriptions: FrameDescription[] = [];

  for (let i = 0; i < framePaths.length; i++) {
    const framePath = framePaths[i];
    const timestamp = i * 10; // Assuming 10s intervals

    try {
      // Find corresponding transcript segment
      const segment = transcriptSegments.find(
        (s) => s.start <= timestamp && s.end >= timestamp
      );
      const context = segment ? segment.text : "";

      // Convert frame to base64 or URL
      const frameBuffer = fs.readFileSync(framePath);
      const base64Frame = `data:image/png;base64,${frameBuffer.toString("base64")}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Describe what's shown in this video frame at ${timestamp}s. ${
                  context ? `Audio says: "${context}"` : ""
                }
                
Focus on: UI elements, data shown, user actions, visual design.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: base64Frame,
                  detail: "low", // Low detail for speed
                },
              },
            ],
          },
        ],
        max_tokens: 200,
      });

      const description = response.choices[0].message.content || "";

      descriptions.push({
        timestamp,
        description,
        frameUrl: framePath,
      });

      console.log(`[VideoProcessor] Frame ${i + 1}/${framePaths.length}: ${description.substring(0, 50)}...`);
    } catch (error) {
      console.error(`[VideoProcessor] Error analyzing frame ${i}:`, error);
      // Continue with next frame
    }
  }

  return descriptions;
}

/**
 * Process a complete video: transcribe + analyze frames + create RAG document
 */
export async function processVideoAsset(mediaAssetId: string): Promise<{
  documentId: string;
  transcript: string;
  frameCount: number;
}> {
  console.log(`[VideoProcessor] Processing video asset: ${mediaAssetId}`);

  // Get the media asset
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: mediaAssetId },
  });

  if (!asset) {
    throw new Error(`MediaAsset ${mediaAssetId} not found`);
  }

  if (asset.type !== "video") {
    throw new Error(`Asset ${mediaAssetId} is not a video (type: ${asset.type})`);
  }

  // Update status
  await prisma.mediaAsset.update({
    where: { id: mediaAssetId },
    data: { processingStatus: "processing" },
  });

  try {
    // Convert public URL to file system path
    let videoPath: string;
    
    if (asset.url.startsWith("http")) {
      // Remote video - would need to download first
      videoPath = path.join(process.cwd(), "public", "temp", `video_${Date.now()}.mp4`);
    } else if (asset.url.startsWith("/")) {
      // Public URL like /uploads/videos/filename.mp4 -> public/uploads/videos/filename.mp4
      videoPath = path.join(process.cwd(), "public", asset.url.substring(1));
    } else {
      // Already a file system path
      videoPath = asset.url;
    }
    
    console.log(`[VideoProcessor] Resolved video path: ${videoPath}`);
    
    // Verify file exists
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    // 1. Transcribe audio
    const { fullText: transcript, segments } = await transcribeVideo(videoPath);

    // 2. Extract keyframes (every 10 seconds)
    const framePaths = await extractKeyframes(videoPath, 10);

    // 3. Analyze frames with GPT-4 Vision
    const frameDescriptions = await analyzeFrames(framePaths, segments);

    // 4. Combine transcript and frame descriptions
    const combinedText = combineTranscriptAndFrames(transcript, segments, frameDescriptions);

    // 5. Create RAG document
    const document = await ingestCompanyDoc({
      companyId: asset.companyId,
      title: `${asset.title} (Video Transcript)`,
      source: "whisper",
      content: combinedText,
    });

    // 6. Link document to media asset
    await prisma.document.update({
      where: { id: document.id },
      data: { mediaAssetId: asset.id },
    });

    // 7. Update media asset with processing results
    await prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: {
        transcript,
        frameAnalysis: JSON.stringify(frameDescriptions),
        extractedText: combinedText,
        processingStatus: "completed",
        processedAt: new Date(),
      },
    });

    // 8. Cleanup frame files
    framePaths.forEach((fp) => {
      try {
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    console.log(`[VideoProcessor] Successfully processed video: ${asset.title}`);

    return {
      documentId: document.id,
      transcript,
      frameCount: frameDescriptions.length,
    };
  } catch (error) {
    console.error(`[VideoProcessor] Error processing video ${mediaAssetId}:`, error);

    await prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: {
        processingStatus: "failed",
        metadata: JSON.stringify({
          error: error instanceof Error ? error.message : "Processing failed",
        }),
      },
    });

    throw error;
  }
}

/**
 * Combine transcript and frame descriptions into searchable text
 */
function combineTranscriptAndFrames(
  transcript: string,
  segments: TranscriptSegment[],
  frames: FrameDescription[]
): string {
  let combined = `Video Transcript:\n\n${transcript}\n\n`;

  combined += "Visual Timeline:\n\n";

  // Sort frames by timestamp
  frames.sort((a, b) => a.timestamp - b.timestamp);

  frames.forEach((frame) => {
    const timeStr = formatTimestamp(frame.timestamp);
    
    // Find corresponding audio segment
    const segment = segments.find(
      (s) => s.start <= frame.timestamp && s.end >= frame.timestamp
    );

    combined += `[${timeStr}] Visual: ${frame.description}`;
    if (segment) {
      combined += ` | Audio: "${segment.text}"`;
    }
    combined += "\n\n";
  });

  return combined;
}

/**
 * Format seconds to MM:SS
 */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

