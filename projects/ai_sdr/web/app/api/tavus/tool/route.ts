import { NextRequest, NextResponse } from "next/server";
import { dispatchToolCall } from "@/lib/tools";

/**
 * Execute function calls from Tavus CVI
 * Tavus will call this endpoint when the AI needs to use tools
 */
export async function POST(request: NextRequest) {
  try {
    const { companyId, name, arguments: args } = await request.json();

    if (!companyId || !name) {
      return NextResponse.json(
        { error: "Company ID and function name are required" },
        { status: 400 }
      );
    }

    // Execute the tool call using your existing dispatcher
    const result = await dispatchToolCall(companyId, name, args || {});

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("[Tavus Tool] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute tool" },
      { status: 500 }
    );
  }
}

