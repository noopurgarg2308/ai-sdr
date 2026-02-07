import { NextRequest, NextResponse } from "next/server";
import { getCompanyConfigBySlug } from "@/lib/companies";
import { classifyAndLogConversation } from "@/lib/crm";

/**
 * Log a conversation (e.g. from Realtime voice session).
 * Client sends sessionId and messages; we classify and append to company's conversation log.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId: companySlug } = await params;
    const body = await request.json();
    const { sessionId, messages } = body as {
      sessionId: string;
      messages: Array<{ role: string; content: string }>;
    };

    if (!sessionId || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "sessionId and non-empty messages array required" },
        { status: 400 }
      );
    }

    const config = await getCompanyConfigBySlug(companySlug);
    const formatted = messages.map((m) => ({ role: m.role, content: m.content || "" }));

    await classifyAndLogConversation(config.id, sessionId, formatted);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Log Conversation] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to log conversation" },
      { status: 500 }
    );
  }
}
