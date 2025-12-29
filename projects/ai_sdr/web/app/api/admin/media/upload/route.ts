import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import * as path from "path";
import { addMediaAsset } from "@/lib/media";
import { queueMediaProcessing } from "@/lib/queue";
import { convertToMP4 } from "@/lib/videoProcessor";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/media/upload?type=website
 * Fetch website sources
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");

    if (type === "website") {
      const websites = await prisma.mediaAsset.findMany({
        where: { type: "website" },
        select: {
          id: true,
          companyId: true,
          url: true,
          title: true,
          description: true,
          processingStatus: true,
          processedAt: true,
          metadata: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({
        sources: websites.map(w => ({
          id: w.id,
          companyId: w.companyId,
          url: w.url,
          title: w.title,
          description: w.description,
          processingStatus: w.processingStatus,
          processedAt: w.processedAt,
        })),
      });
    }

    return NextResponse.json({ sources: [] });
  } catch (error) {
    console.error("[Upload GET] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch sources" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type");
    
    // Handle JSON request for website sources
    if (contentType?.includes("application/json")) {
      const body = await request.json();
      const { companyId, type, url, title, description, metadata } = body;

      if (type !== "website") {
        return NextResponse.json(
          { error: "JSON requests only supported for website type" },
          { status: 400 }
        );
      }

      if (!companyId || !url) {
        return NextResponse.json(
          { error: "Missing required fields: companyId, url" },
          { status: 400 }
        );
      }

      // Validate company exists
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        return NextResponse.json(
          { error: "Company not found" },
          { status: 404 }
        );
      }

      // Create website source
      const asset = await addMediaAsset({
        companyId,
        type: "website",
        url,
        title: title || `Website: ${new URL(url).hostname}`,
        description: description || undefined,
        metadata: metadata || {},
      });

      return NextResponse.json({
        success: true,
        id: asset.id,
        asset: {
          id: asset.id,
          type: asset.type,
          url: asset.url,
          title: asset.title,
        },
      }, { status: 201 });
    }

    // Handle file upload (existing logic)
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

    // Check if this is a QuickTime/MOV file that needs conversion
    const isQuickTime = 
      fileType === "video/quicktime" || 
      file.name.toLowerCase().endsWith(".mov") ||
      file.name.toLowerCase().endsWith(".qt");
    
    let finalFilepath = filepath;
    let finalFilename = filename;
    let finalPublicUrl = `/uploads/${mediaType}s/${filename}`;
    let originalFileDeleted = false;

    // Convert QuickTime/MOV to MP4 if needed
    if (isQuickTime && mediaType === "video") {
      try {
        console.log(`[Upload] Converting QuickTime file to MP4: ${filepath}`);
        
        // Generate MP4 filename
        const mp4Filename = filename.replace(/\.(mov|qt)$/i, ".mp4");
        const mp4Filepath = path.join(uploadDir, mp4Filename);
        
        // Convert to MP4
        const convertedPath = await convertToMP4(filepath, mp4Filepath);
        
        // Delete original MOV file
        try {
          await unlink(filepath);
          originalFileDeleted = true;
          console.log(`[Upload] Deleted original QuickTime file: ${filepath}`);
        } catch (unlinkError) {
          console.warn(`[Upload] Could not delete original file: ${unlinkError}`);
        }
        
        // Update paths to use MP4 version
        finalFilepath = convertedPath;
        finalFilename = mp4Filename;
        finalPublicUrl = `/uploads/${mediaType}s/${mp4Filename}`;
        
        console.log(`[Upload] Successfully converted to MP4: ${finalFilepath}`);
      } catch (conversionError) {
        console.error(`[Upload] Failed to convert QuickTime to MP4:`, conversionError);
        // Continue with original file if conversion fails
        console.log(`[Upload] Using original file format (may not be web-compatible)`);
      }
    }

    // Create public URL
    const publicUrl = finalPublicUrl;

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
        mimeType: isQuickTime && originalFileDeleted ? "video/mp4" : file.type,
        uploadedAt: new Date().toISOString(),
        convertedFromQuickTime: isQuickTime && originalFileDeleted,
      },
    });

    console.log(`[Upload] Created MediaAsset: ${asset.id}`);

    // Queue for processing if auto-process enabled
    let jobId: string | undefined;
    if (autoProcess && (mediaType === "image" || mediaType === "video" || mediaType === "pdf")) {
      jobId = await queueMediaProcessing(asset.id, companyId, mediaType as "image" | "video" | "pdf");
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

