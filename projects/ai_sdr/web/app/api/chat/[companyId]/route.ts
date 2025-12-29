import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { getCompanyConfigBySlug } from "@/lib/companies";
import { buildSystemPrompt } from "@/lib/systemPrompt";
import { toolDefinitions, dispatchToolCall } from "@/lib/tools";
import type { ChatRequest, ChatResponse, ChatMessage } from "@/types/chat";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const body = (await request.json()) as Omit<ChatRequest, "companyId">;

    // Load company config
    const config = await getCompanyConfigBySlug(companyId);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(config);

    // Prepare messages for OpenAI
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...body.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // First OpenAI call with tools
    let completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages,
      tools: toolDefinitions,
      tool_choice: "auto",
      temperature: 0.7,
    });

    let assistantMessage = completion.choices[0].message;

    // Handle tool calls if any
    let toolResults: Array<{ role: "tool"; tool_call_id: string; content: string }> = [];
    let demoClipUrl: string | undefined;
    let meetingLink: string | undefined;
    let showMeetingPrompt = false;
    let visualAssets: Array<any> = [];

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Execute all tool calls
      const toolCallPromises = assistantMessage.tool_calls.map(async (toolCall) => {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await dispatchToolCall(config.id, toolCall.function.name, args);

          // Extract special fields
          if (toolCall.function.name === "get_demo_clip" && result) {
            demoClipUrl = result.url;
          }
          if (toolCall.function.name === "create_meeting_link" && result) {
            meetingLink = result.url;
            showMeetingPrompt = true;
          }
          if (toolCall.function.name === "show_visual" && result && result.visuals) {
            visualAssets = [...visualAssets, ...result.visuals];
          }
          if (toolCall.function.name === "search_knowledge" && result) {
            // Add linked visuals from RAG search results
            if (result.linkedVisuals && result.linkedVisuals.length > 0) {
              console.log(`[Chat API] Adding ${result.linkedVisuals.length} linked visuals from RAG`);
              console.log(`[Chat API] Linked visuals:`, result.linkedVisuals.map((v: any) => ({ type: v.type, title: v.title, url: v.url })));
              visualAssets = [...visualAssets, ...result.linkedVisuals];
            }
            if (result.visualResults && result.visualResults.length > 0) {
              console.log(`[Chat API] Adding ${result.visualResults.length} visual results`);
              visualAssets = [...visualAssets, ...result.visualResults];
            }
          }

          return {
            role: "tool" as const,
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          };
        } catch (error) {
          console.error(`Error executing tool ${toolCall.function.name}:`, error);
          return {
            role: "tool" as const,
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: "Tool execution failed" }),
          };
        }
      });

      toolResults = await Promise.all(toolCallPromises);

      // Second OpenAI call with tool results
      const messagesWithTools = [
        ...messages,
        {
          role: "assistant" as const,
          content: assistantMessage.content,
          tool_calls: assistantMessage.tool_calls,
        },
        ...toolResults,
      ];

      completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: messagesWithTools as any,
        temperature: 0.7,
      });

      assistantMessage = completion.choices[0].message;
    }

    // Build response
    const sessionId = body.sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    const reply: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      role: "assistant",
      content: assistantMessage.content || "",
      createdAt: new Date().toISOString(),
    };

    console.log(`[Chat API] Total visual assets to return: ${visualAssets.length}`);
    if (visualAssets.length > 0) {
      console.log(`[Chat API] Visual assets:`, visualAssets.map((v: any) => ({ type: v.type, title: v.title, url: v.url })));
    }
    
    const response: ChatResponse = {
      sessionId,
      reply,
      demoClipUrl,
      showMeetingPrompt,
      meetingLink,
      visualAssets: visualAssets.length > 0 ? visualAssets : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Chat API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

