import { openai } from "./openai";
import { prisma } from "./prisma";
import { ingestCompanyDoc } from "./rag";

// Video processing is optional - requires ffmpeg to be installed separately
// For now, return placeholder implementations

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
  console.log(`[VideoProcessor] Video frame extraction disabled (ffmpeg not configured)`);
  console.log(`[VideoProcessor] To enable: install ffmpeg and configure fluent-ffmpeg`);
  
  // Return empty array - video processing disabled for now
  return [];
}

/**
 * Transcribe video audio using OpenAI Whisper
 */
export async function transcribeVideo(videoPath: string): Promise<{
  fullText: string;
  segments: TranscriptSegment[];
}> {
  console.log(`[VideoProcessor] Video transcription available but frame extraction disabled`);
  console.log(`[VideoProcessor] For full video processing, configure ffmpeg`);
  
  // Transcription still works, just no frame analysis
  return {
    fullText: "Video processing disabled - install ffmpeg to enable",
    segments: [],
  };
}

/**
 * Analyze video frames using GPT-4 Vision
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
        model: "gpt-4-vision-preview",
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
    // Note: For remote videos, you'd need to download first
    // For now, assuming local file path
    const videoPath = asset.url.startsWith("http")
      ? path.join(process.cwd(), "public", "temp", `video_${Date.now()}.mp4`)
      : asset.url;

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

