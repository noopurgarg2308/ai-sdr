import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { queueMediaProcessing } from "@/lib/queue";

/**
 * POST /api/admin/companies/:id/websites/:sourceId/crawl
 * 
 * Manual trigger to start crawling a website source.
 * 
 * Request body (all optional):
 * {
 *   "maxPages": number,
 *   "maxDepth": number,
 *   "forceReindex": boolean,
 *   "includeImages": boolean,
 *   "dryRun": boolean
 * }
 * 
 * Returns:
 * {
 *   "jobId": string,
 *   "status": "queued",
 *   "message": string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sourceId: string }> }
) {
  try {
    const { id: companyId, sourceId } = await params;
    
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

    // Validate website source exists and is a website type
    const websiteSource = await prisma.mediaAsset.findUnique({
      where: { id: sourceId },
    });

    if (!websiteSource) {
      return NextResponse.json(
        { error: "Website source not found" },
        { status: 404 }
      );
    }

    if (websiteSource.companyId !== companyId) {
      return NextResponse.json(
        { error: "Website source does not belong to this company" },
        { status: 403 }
      );
    }

    if (websiteSource.type !== "website") {
      return NextResponse.json(
        { error: `Asset is not a website (type: ${websiteSource.type})` },
        { status: 400 }
      );
    }

    // Parse optional request body
    let options: {
      maxPages?: number;
      maxDepth?: number;
      forceReindex?: boolean;
      includeImages?: boolean;
      dryRun?: boolean;
    } = {};

    try {
      const body = await request.json();
      if (body.maxPages !== undefined) options.maxPages = Number(body.maxPages);
      if (body.maxDepth !== undefined) options.maxDepth = Number(body.maxDepth);
      if (body.forceReindex !== undefined) options.forceReindex = Boolean(body.forceReindex);
      if (body.includeImages !== undefined) options.includeImages = Boolean(body.includeImages);
      if (body.dryRun !== undefined) options.dryRun = Boolean(body.dryRun);
    } catch {
      // No body provided, use defaults
    }

    // Enqueue crawl job (async, non-blocking)
    const jobId = await queueMediaProcessing(
      sourceId,
      companyId,
      "website",
      options
    );

    console.log(`[Admin API] Queued website crawl: job ${jobId} for source ${sourceId}`);

    return NextResponse.json({
      jobId,
      status: "queued",
      message: "Website crawl job queued successfully",
      options,
    });
  } catch (error: any) {
    console.error("[Admin API] Error queuing website crawl:", error);
    
    return NextResponse.json(
      { error: "Failed to queue website crawl", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/companies/:id/websites/:sourceId/crawl
 * 
 * Get crawl status for a website source.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sourceId: string }> }
) {
  try {
    const { id: companyId, sourceId } = await params;
    
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

    // Get website source
    const websiteSource = await prisma.mediaAsset.findUnique({
      where: { id: sourceId },
    });

    if (!websiteSource || websiteSource.companyId !== companyId) {
      return NextResponse.json(
        { error: "Website source not found" },
        { status: 404 }
      );
    }

    // Get processing status
    const status = {
      processingStatus: websiteSource.processingStatus,
      processedAt: websiteSource.processedAt,
      metadata: websiteSource.metadata ? JSON.parse(websiteSource.metadata) : {},
    };

    return NextResponse.json(status);
  } catch (error: any) {
    console.error("[Admin API] Error fetching crawl status:", error);
    
    return NextResponse.json(
      { error: "Failed to fetch crawl status", details: error.message },
      { status: 500 }
    );
  }
}
