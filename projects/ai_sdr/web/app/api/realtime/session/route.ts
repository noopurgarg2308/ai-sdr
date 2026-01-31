import { NextRequest, NextResponse } from "next/server";

/**
 * Generate a temporary session token for OpenAI Realtime API
 * This keeps the API key secure on the server side
 */
export async function POST(request: NextRequest) {
  try {
    const { companyId } = await request.json();

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }

    // In production, use OpenAI Realtime ephemeral tokens (realtime-sessions API)
    // so the client never sees your API key. For dev, we return the key server-side only.
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      apiKey,
      model: "gpt-4o-realtime-preview-2024-12-17",
    });
  } catch (error) {
    console.error("[Realtime Session] Error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

