import { NextResponse } from "next/server";
import { getCompanyConfigBySlug } from "@/lib/companies";
import { buildSystemPrompt } from "@/lib/systemPrompt";
import { prisma } from "@/lib/prisma";

/**
 * Public widget config for voice/text clients (no secrets).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const { companySlug } = await params;
    const config = await getCompanyConfigBySlug(companySlug);

    const voiceAddendum = `

**VOICE MODE**
- Before answering any question about ${config.displayName}, its products, pricing, features, or company-specific facts, you MUST call search_knowledge first.
- Answer only from search_knowledge results. Never use general training knowledge for ${config.displayName}-specific questions.
- If search_knowledge returns zero results or guidance says NO_MATCH, say you do not have that information in ${config.displayName}'s knowledge base and offer to connect the visitor with the team. Do not invent facts.`;

    const chunkCount = await prisma.chunk.count({
      where: { companyId: config.id },
    });

    return NextResponse.json({
      displayName: config.displayName,
      useVisuals: config.useVisuals ?? false,
      instructions: buildSystemPrompt(config) + voiceAddendum,
      chunkCount,
    });
  } catch (error) {
    console.error("[Widget Config] Error:", error);
    const message = error instanceof Error ? error.message : "Company not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
