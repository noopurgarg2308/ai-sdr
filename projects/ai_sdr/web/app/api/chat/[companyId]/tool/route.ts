import { NextRequest, NextResponse } from "next/server";
import { dispatchToolCall } from "@/lib/tools";
import { getCompanyConfigBySlug } from "@/lib/companies";

/**
 * Tool execution endpoint for Realtime API function calls
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId: companySlug } = await params;
    const { name, args } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Tool name is required" },
        { status: 400 }
      );
    }

    // Resolve slug to actual company ID
    const config = await getCompanyConfigBySlug(companySlug);
    const actualCompanyId = config.id;

    console.log(`[Tool API] Executing tool: ${name} for company: ${companySlug} (ID: ${actualCompanyId})`);

    const result = await dispatchToolCall(actualCompanyId, name, args || {});

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Tool API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tool execution failed" },
      { status: 500 }
    );
  }
}

