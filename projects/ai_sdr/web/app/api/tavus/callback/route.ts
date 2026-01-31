import { NextRequest, NextResponse } from "next/server";
import { dispatchToolCall } from "@/lib/tools";

/**
 * Format tool result as a string so the Tavus LLM can use it to continue the conversation.
 * Without a clear text "content", the avatar may say one sentence and stop.
 */
function formatToolResultForLLM(toolName: string, result: unknown): string {
  if (result == null) return "No result.";
  const r = result as Record<string, unknown>;
  switch (toolName) {
    case "search_knowledge": {
      const results = (r.results as Array<{ content?: string; source?: string }>) || [];
      if (results.length === 0) return "No relevant content found in the knowledge base.";
      const parts = results.map((item, i) => `[${i + 1}] ${(item.content || "").trim()}`).filter(Boolean);
      return parts.join("\n\n");
    }
    case "show_visual": {
      const visuals = (r.visuals as Array<{ title?: string; url?: string }>) || [];
      if (visuals.length === 0) return "No visuals found.";
      return visuals.map((v) => v.title || v.url || "").filter(Boolean).join("; ") || "Visuals retrieved.";
    }
    case "get_demo_clip":
      return typeof r.url === "string" ? `Demo clip: ${r.url}` : JSON.stringify(r);
    case "create_meeting_link":
      return typeof r.link === "string" ? `Meeting link: ${r.link}` : JSON.stringify(r);
    case "log_lead":
      return "Lead logged successfully.";
    default:
      return typeof r === "object" ? JSON.stringify(r) : String(r);
  }
}

/**
 * Callback endpoint for Tavus function calls
 * Tavus will POST to this URL when it needs to execute tools
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log("[Tavus Callback] Received:", JSON.stringify(body, null, 2));

    // Tavus sends conversation.tool_call events: { event_type, conversation_id, properties: { name, arguments } }
    // See https://docs.tavus.io/sections/event-schemas/conversation-toolcall
    const eventType = body.event_type || body.eventType;
    const properties = body.properties || {};
    const url = new URL(request.url);
    let targetCompanyId = body.company_id || body.companyId || url.searchParams.get("companyId");

    let toolName: string;
    let toolArgs: Record<string, unknown>;

    if (eventType === "conversation.tool_call") {
      toolName = properties.name;
      const rawArgs = properties.arguments;
      if (typeof rawArgs === "string") {
        try {
          toolArgs = (JSON.parse(rawArgs || "{}") as Record<string, unknown>) || {};
        } catch {
          toolArgs = {};
        }
      } else {
        toolArgs = (rawArgs as Record<string, unknown>) || {};
      }
    } else {
      // Legacy: direct function_call / functionCall in body
      const functionCall = body.function_call || body.functionCall || body;
      toolName = functionCall.name;
      toolArgs = functionCall.arguments || functionCall.args || {};
    }

    if (!toolName) {
      console.error("[Tavus Callback] Missing function call name:", body);
      return NextResponse.json(
        { error: "Function call name is required" },
        { status: 400 }
      );
    }

    if (!targetCompanyId) {
      targetCompanyId = "hypersonix";
    }

    console.log(`[Tavus Callback] Executing ${toolName} for company ${targetCompanyId}`);

    // Execute the tool call (search_knowledge hits our RAG; other tools as defined)
    const result = await dispatchToolCall(
      targetCompanyId,
      toolName,
      toolArgs
    );

    console.log(`[Tavus Callback] Result:`, result);

    // Tavus LLM needs a string "content" to continue the conversation. If we only return
    // a complex object, the avatar may say one sentence and stop. Build a text summary.
    const content = formatToolResultForLLM(toolName, result);

    return NextResponse.json({
      success: true,
      result,
      content,
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

