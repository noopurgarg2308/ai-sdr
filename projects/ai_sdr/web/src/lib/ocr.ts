import { openai } from "./openai";
import * as fs from "fs";
import * as path from "path";

/**
 * Convert local image path to base64 data URL for OpenAI
 */
function imageToBase64(imagePath: string): string {
  // If it's already a URL, return as is
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // Handle local file path
  const fullPath = imagePath.startsWith("/uploads")
    ? path.join(process.cwd(), "public", imagePath)
    : imagePath;

  const imageBuffer = fs.readFileSync(fullPath);
  const base64 = imageBuffer.toString("base64");
  
  // Detect MIME type from extension
  const ext = path.extname(fullPath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  const mimeType = mimeTypes[ext] || "image/png";

  return `data:${mimeType};base64,${base64}`;
}

/**
 * Extract text and detailed description from an image using GPT-4 Vision
 */
export async function extractTextFromImage(imageUrl: string): Promise<{
  text: string;
  confidence: number;
}> {
  console.log(`[OCR] Extracting text from image: ${imageUrl}`);

  try {
    // Convert to base64 if local file
    const processedUrl = imageToBase64(imageUrl);
    console.log(`[OCR] Using ${processedUrl.startsWith("data:") ? "base64" : "URL"} format`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please analyze this image in detail. Extract and describe:

1. Any visible text (UI labels, headings, numbers, data)
2. Visual elements (charts, graphs, diagrams, layouts)
3. UI components (buttons, forms, navigation)
4. Data and metrics shown
5. Overall purpose and context

Be comprehensive and detailed. Format as continuous text for search indexing.`,
            },
            {
              type: "image_url",
              image_url: {
                url: processedUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.3, // Lower temperature for more accurate extraction
    });

    const extractedText = response.choices[0].message.content || "";
    
    // Estimate confidence based on response length and detail
    const confidence = extractedText.length > 100 ? 0.9 : 0.7;

    console.log(`[OCR] Extracted ${extractedText.length} characters`);

    return {
      text: extractedText,
      confidence,
    };
  } catch (error) {
    console.error("[OCR] Error extracting text from image:", error);
    throw error;
  }
}

/**
 * Analyze an image for specific information
 */
export async function analyzeImage(
  imageUrl: string,
  question: string
): Promise<string> {
  console.log(`[OCR] Analyzing image with question: ${question}`);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Updated from deprecated gpt-4-vision-preview
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: question,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("[OCR] Error analyzing image:", error);
    throw error;
  }
}

