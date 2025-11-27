import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import * as path from "path";
import { addMediaAsset } from "@/lib/media";
import { queueMediaProcessing } from "@/lib/queue";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const companyId = formData.get("companyId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const category = formData.get("category") as string | null;
    const autoProcess = formData.get("autoProcess") === "true";

    if (!file || !companyId || !title) {
      return NextResponse.json(
        { error: "Missing required fields: file, companyId, title" },
        { status: 400 }
      );
    }

    // Determine file type
    const fileType = file.type;
    let mediaType: string;
    
    if (fileType.startsWith("image/")) {
      mediaType = "image";
    } else if (fileType.startsWith("video/")) {
      mediaType = "video";
    } else if (fileType === "application/pdf") {
      mediaType = "pdf";
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Use images, videos, or PDFs." },
        { status: 400 }
      );
    }

    // Create uploads directory structure
    const uploadDir = path.join(process.cwd(), "public", "uploads", mediaType + "s");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/\s+/g, "-");
    const filename = `${timestamp}-${originalName}`;
    const filepath = path.join(uploadDir, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    console.log(`[Upload] Saved file: ${filepath}`);

    // Create public URL
    const publicUrl = `/uploads/${mediaType}s/${filename}`;

    // Create media asset in database
    const asset = await addMediaAsset({
      companyId,
      type: mediaType,
      url: publicUrl,
      title,
      description: description || undefined,
      category: category as any,
      metadata: {
        originalFilename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
      },
    });

    console.log(`[Upload] Created MediaAsset: ${asset.id}`);

    // Queue for processing if auto-process enabled
    let jobId: string | undefined;
    if (autoProcess && (mediaType === "image" || mediaType === "video")) {
      jobId = await queueMediaProcessing(asset.id, companyId, mediaType as "image" | "video");
      console.log(`[Upload] Queued for processing: job ${jobId}`);
    }

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        type: asset.type,
        url: asset.url,
        title: asset.title,
      },
      jobId,
    }, { status: 201 });

  } catch (error) {
    console.error("[Upload] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

