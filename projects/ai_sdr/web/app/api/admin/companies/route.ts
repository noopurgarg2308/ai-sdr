import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CompanyConfig, Persona } from "@/types/chat";

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { demoClips: true },
        },
      },
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error("[Admin API] Error fetching companies:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, displayName, shortDescription, websiteUrl, productSummary, ownerEmail } = body;

    // Validate required fields
    if (!slug || !displayName || !shortDescription) {
      return NextResponse.json(
        { error: "Missing required fields: slug, displayName, shortDescription" },
        { status: 400 }
      );
    }

    // Build default config
    const config: Partial<CompanyConfig> = {
      personas: ["vp_ecommerce", "pricing_manager", "cfo", "other"] as Persona[],
      ragIndexName: `rag_${slug}`,
      demoNamespace: slug,
      productSummary: productSummary || "",
      features: {
        canBookMeetings: true,
        canShowDemoClips: true,
        canLogLeads: true,
      },
    };

    // Create company
    const company = await prisma.company.create({
      data: {
        slug,
        displayName,
        shortDescription,
        websiteUrl: websiteUrl || null,
        ownerEmail: ownerEmail || null,
        config: config as any,
      },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error: any) {
    console.error("[Admin API] Error creating company:", error);
    
    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A company with this slug already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}

