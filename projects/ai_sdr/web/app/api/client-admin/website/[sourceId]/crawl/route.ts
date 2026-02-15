import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { queueMediaProcessing } from "@/lib/queue";
import { requireClientAdminCompanyId } from "@/lib/clientAdmin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const companyId = await requireClientAdminCompanyId();
    const { sourceId } = await params;

    const source = await prisma.mediaAsset.findUnique({
      where: { id: sourceId },
    });
    if (!source || source.companyId !== companyId || source.type !== "website") {
      return NextResponse.json({ error: "Website source not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const jobId = await queueMediaProcessing(sourceId, companyId, "website", {
      maxPages: body.maxPages ?? 50,
      maxDepth: body.maxDepth ?? 3,
      includeImages: body.includeImages ?? true,
      forceReindex: body.forceReindex ?? false,
    });

    return NextResponse.json({ jobId, status: "queued" });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const companyId = await requireClientAdminCompanyId();
    const { sourceId } = await params;

    const source = await prisma.mediaAsset.findUnique({
      where: { id: sourceId },
    });
    if (!source || source.companyId !== companyId) {
      return NextResponse.json({ error: "Website source not found" }, { status: 404 });
    }

    return NextResponse.json({
      processingStatus: source.processingStatus,
      processedAt: source.processedAt,
      metadata: source.metadata ? JSON.parse(source.metadata) : {},
    });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
