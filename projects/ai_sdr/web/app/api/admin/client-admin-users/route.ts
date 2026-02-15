import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

/**
 * POST /api/admin/client-admin-users
 * Create a client admin user for a company.
 * Body: { companyId, email, password }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, email, password } = body;

    if (!companyId || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields: companyId, email, password" },
        { status: 400 }
      );
    }

    const emailNormalized = (email as string).trim().toLowerCase();
    if (!emailNormalized.includes("@")) {
      return NextResponse.json(
        { error: "Email must be a valid email address" },
        { status: 400 }
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: emailNormalized },
    });
    if (existing) {
      return NextResponse.json(
        { error: `User ${emailNormalized} already exists` },
        { status: 409 }
      );
    }

    const passwordTrimmed = (password as string).trim();
    if (!passwordTrimmed) {
      return NextResponse.json(
        { error: "Password cannot be empty" },
        { status: 400 }
      );
    }
    const passwordHash = await hash(passwordTrimmed, 12);
    const user = await prisma.user.create({
      data: {
        email: emailNormalized,
        passwordHash,
        companyId,
      },
      include: { company: true },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        companyId: user.companyId,
        companySlug: user.company.slug,
        companyDisplayName: user.company.displayName,
      },
      loginUrl: "/client-admin/login",
    });
  } catch (error) {
    console.error("[Admin] Error creating client admin user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
