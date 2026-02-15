import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addMediaAsset } from "@/lib/media";
import { queueMediaProcessing } from "@/lib/queue";
import { requireClientAdminCompanyId } from "@/lib/clientAdmin";

export async function GET() {
  try {
    const companyId = await requireClientAdminCompanyId();
    const websites = await prisma.mediaAsset.findMany({
      where: { companyId, type: "website" },
      select: {
        id: true, url: true, title: true, processingStatus: true,
        processedAt: true, metadata: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ sources: websites });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}

export async function POST(request: NextRequest) {
  try {
    const companyId = await requireClientAdminCompanyId();
    const body = await request.json();
    const { url, title, description, maxPages, maxDepth, includeImages } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    const asset = await addMediaAsset({
      companyId,
      type: "website",
      url,
      title: title || `Website: ${new URL(url).hostname}`,
      description: description || undefined,
      metadata: { maxPages: maxPages ?? 50, maxDepth: maxDepth ?? 3, includeImages: includeImages ?? true },
    });

    const jobId = await queueMediaProcessing(asset.id, companyId, "website", {
      maxPages: maxPages ?? 50,
      maxDepth: maxDepth ?? 3,
      includeImages: includeImages ?? true,
    });

    return NextResponse.json({
      success: true,
      id: asset.id,
      jobId,
    }, { status: 201 });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
