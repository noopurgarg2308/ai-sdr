import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const assets = await prisma.mediaAsset.findMany({
      where: { companyId: id },
      orderBy: { createdAt: "desc" },
      include: {
        documents: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Parse JSON fields and format response
    const formattedAssets = assets.map((asset) => ({
      id: asset.id,
      type: asset.type,
      url: asset.url,
      title: asset.title,
      description: asset.description,
      category: asset.category,
      tags: asset.tags ? JSON.parse(asset.tags) : null,
      thumbnail: asset.thumbnail,
      metadata: asset.metadata ? JSON.parse(asset.metadata) : null,
      transcript: asset.transcript,
      frameAnalysis: asset.frameAnalysis ? JSON.parse(asset.frameAnalysis) : null,
      extractedText: asset.extractedText,
      processingStatus: asset.processingStatus,
      processedAt: asset.processedAt,
      createdAt: asset.createdAt,
      documents: asset.documents,
    }));

    return NextResponse.json({ assets: formattedAssets });
  } catch (error) {
    console.error("[Admin API] Error fetching media assets:", error);
    return NextResponse.json(
      { error: "Failed to fetch media assets" },
      { status: 500 }
    );
  }
}

