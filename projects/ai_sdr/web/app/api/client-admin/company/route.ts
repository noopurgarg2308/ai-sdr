import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClientAdminCompanyId } from "@/lib/clientAdmin";

export async function GET() {
  try {
    const companyId = await requireClientAdminCompanyId();
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        slug: true,
        displayName: true,
        shortDescription: true,
        websiteUrl: true,
        config: true,
        billingTier: true,
        openaiApiKey: true,
      },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    const config = company.config as Record<string, unknown>;
    return NextResponse.json({
      ...company,
      openaiApiKey: company.openaiApiKey
        ? `${company.openaiApiKey.slice(0, 7)}...****`
        : null,
      openaiApiKeyConfigured: !!company.openaiApiKey,
      productSummary: config?.productSummary ?? "",
    });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}

/**
 * Client-editable fields only. Admin-only fields (billingTier, openaiApiKey, slug,
 * useVisuals, useTavusVideo, tavusReplicaId, tavusPersonaId) are never accepted here;
 * only the super admin can set those via /api/admin/companies/[id].
 */
export async function PUT(request: NextRequest) {
  try {
    const companyId = await requireClientAdminCompanyId();
    const body = await request.json();

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const config = (company.config as Record<string, unknown>) || {};

    if (body.productSummary !== undefined) config.productSummary = body.productSummary;
    if (Object.keys(config).length > 0) updateData.config = config;
    if (body.shortDescription !== undefined) updateData.shortDescription = body.shortDescription;
    if (body.displayName !== undefined) updateData.displayName = body.displayName;
    if (body.websiteUrl !== undefined) updateData.websiteUrl = body.websiteUrl;

    await prisma.company.update({
      where: { id: companyId },
      data: updateData as any,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
