import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        demoClips: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("[Admin API] Error fetching company:", error);
    return NextResponse.json(
      { error: "Failed to fetch company" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { slug, displayName, shortDescription, websiteUrl, config, ownerEmail } = body;

    const updateData: any = {};
    if (slug !== undefined) updateData.slug = slug;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (shortDescription !== undefined) updateData.shortDescription = shortDescription;
    if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl;
    if (ownerEmail !== undefined) updateData.ownerEmail = ownerEmail;
    if (config !== undefined) updateData.config = config;

    const company = await prisma.company.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(company);
  } catch (error: any) {
    console.error("[Admin API] Error updating company:", error);
    
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A company with this slug already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update company" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.company.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Admin API] Error deleting company:", error);
    
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete company" },
      { status: 500 }
    );
  }
}

