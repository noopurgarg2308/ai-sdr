import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import * as path from "path";
import { addMediaAsset } from "@/lib/media";
import { queueMediaProcessing } from "@/lib/queue";
import { requireClientAdminCompanyId } from "@/lib/clientAdmin";

export async function POST(request: NextRequest) {
  try {
    const companyId = await requireClientAdminCompanyId();
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;

    if (!file || !title) {
      return NextResponse.json(
        { error: "Missing required fields: file, title" },
        { status: 400 }
      );
    }

    const fileType = file.type;
    let mediaType: string;
    if (fileType.startsWith("image/")) mediaType = "image";
    else if (fileType.startsWith("video/")) mediaType = "video";
    else if (fileType === "application/pdf") mediaType = "pdf";
    else {
      return NextResponse.json(
        { error: "Unsupported file type. Use images, videos, or PDFs." },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", mediaType + "s");
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const originalName = file.name.replace(/\s+/g, "-");
    const filename = `${timestamp}-${originalName}`;
    const filepath = path.join(uploadDir, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    const publicUrl = `/uploads/${mediaType}s/${filename}`;

    const asset = await addMediaAsset({
      companyId,
      type: mediaType,
      url: publicUrl,
      title,
      description: description || undefined,
      metadata: { originalFilename: file.name, uploadedAt: new Date().toISOString() },
    });

    let jobId: string | undefined;
    if (mediaType === "image" || mediaType === "video" || mediaType === "pdf") {
      jobId = await queueMediaProcessing(asset.id, companyId, mediaType as "image" | "video" | "pdf");
    }

    return NextResponse.json({
      success: true,
      asset: { id: asset.id, type: asset.type, url: asset.url, title: asset.title },
      jobId,
    }, { status: 201 });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
