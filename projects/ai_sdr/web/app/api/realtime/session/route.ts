import { NextRequest, NextResponse } from "next/server";
import { getOpenAIKeyForCompany } from "@/lib/openai";

/**
 * Generate a temporary session token for OpenAI Realtime API
 * Uses company's BYOK key when billingTier="byok", otherwise platform key.
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

    // Get OpenAI key for company (BYOK or platform)
    const apiKey = await getOpenAIKeyForCompany(companyId);

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured for this company" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      apiKey,
      model: "gpt-4o-realtime-preview-2024-12-17",
    });
  } catch (error) {
    console.error("[Realtime Session] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to create session";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

