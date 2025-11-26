import { NextRequest, NextResponse } from "next/server";
import { dispatchToolCall } from "@/lib/tools";

/**
 * Tool execution endpoint for Realtime API function calls
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const { name, args } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Tool name is required" },
        { status: 400 }
      );
    }

    console.log(`[Tool API] Executing tool: ${name} for company: ${companyId}`);

    const result = await dispatchToolCall(companyId, name, args || {});

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Tool API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tool execution failed" },
      { status: 500 }
    );
  }
}

