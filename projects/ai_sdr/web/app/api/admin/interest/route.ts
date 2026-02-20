import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/interest
 * List all sign-up interest submissions
 */
export async function GET() {
  try {
    const interests = await prisma.interest.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ interests });
  } catch (error) {
    console.error("[Admin Interest] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch interests" },
      { status: 500 }
    );
  }
}
