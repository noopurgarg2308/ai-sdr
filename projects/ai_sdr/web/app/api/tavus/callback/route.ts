import { NextRequest, NextResponse } from "next/server";
import { dispatchToolCall } from "@/lib/tools";

/**
 * Callback endpoint for Tavus function calls
 * Tavus will POST to this URL when it needs to execute tools
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log("[Tavus Callback] Received:", JSON.stringify(body, null, 2));

    // Tavus callback format may vary - check for different possible structures
    const functionCall = body.function_call || body.functionCall || body;
    const conversationId = body.conversation_id || body.conversationId;
    const companyId = body.company_id || body.companyId;

    if (!functionCall || !functionCall.name) {
      console.error("[Tavus Callback] Missing function call:", body);
      return NextResponse.json(
        { error: "Function call name is required" },
        { status: 400 }
      );
    }

    // Extract company ID from conversation metadata or use a default
    // In production, you'd want to store conversation -> company mapping
    let targetCompanyId = companyId;
    
    // If no company ID provided, try to extract from conversation
    // For now, we'll use "hypersonix" as default - you may want to store this mapping
    if (!targetCompanyId) {
      // Try to get from query params or default
      const url = new URL(request.url);
      targetCompanyId = url.searchParams.get("companyId") || "hypersonix";
    }

    console.log(`[Tavus Callback] Executing ${functionCall.name} for company ${targetCompanyId}`);

    // Execute the tool call
    const result = await dispatchToolCall(
      targetCompanyId,
      functionCall.name,
      functionCall.arguments || functionCall.args || {}
    );

    console.log(`[Tavus Callback] Result:`, result);

    // Return result in format Tavus expects
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("[Tavus Callback] Error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || "Failed to execute function call" 
      },
      { status: 500 }
    );
  }
}

