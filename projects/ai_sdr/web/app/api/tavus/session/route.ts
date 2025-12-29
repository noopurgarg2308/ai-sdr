import { NextRequest, NextResponse } from "next/server";
import { getTavusClient } from "@/lib/tavus";
import { prisma } from "@/lib/prisma";
import { buildSystemPrompt } from "@/lib/systemPrompt";
import { toolDefinitions } from "@/lib/toolDefinitions";

/**
 * Create a Tavus CVI session
 * Returns session credentials for WebSocket connection
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

    // Get company configuration by slug (companyId is actually a slug from the URL)
    const company = await prisma.company.findUnique({
      where: { slug: companyId },
      select: {
        id: true,
        slug: true,
        displayName: true,
        shortDescription: true,
        config: true,
        tavusReplicaId: true,
        tavusPersonaId: true,
        useTavusVideo: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    if (!company.useTavusVideo || !company.tavusReplicaId) {
      return NextResponse.json(
        { error: "Tavus video not enabled for this company" },
        { status: 400 }
      );
    }

    const tavusClient = getTavusClient();
    if (!tavusClient) {
      return NextResponse.json(
        { error: "Tavus API key not configured" },
        { status: 500 }
      );
    }

    // Build system prompt from company config
    const companyConfig = {
      displayName: company.displayName,
      shortDescription: company.shortDescription,
      productSummary:
        typeof company.config === "object" && company.config !== null
          ? (company.config as any).productSummary || ""
          : "",
      toneGuidelines:
        typeof company.config === "object" && company.config !== null
          ? (company.config as any).toneGuidelines || ""
          : "",
      personas:
        typeof company.config === "object" && company.config !== null
          ? (company.config as any).personas || []
          : [],
    };

    let instructions = buildSystemPrompt(companyConfig);
    
    // Emphasize using the search_knowledge tool for company-specific questions
    instructions += `\n\nCRITICAL INSTRUCTIONS FOR TOOL USAGE:
- You have access to a search_knowledge tool that searches ${company.displayName}'s proprietary knowledge base
- ALWAYS use search_knowledge when asked about:
  * ${company.displayName} products, features, or capabilities
  * Pricing, plans, or packages
  * How the product works or what it does
  * Company-specific information
  * Technical details or specifications
- NEVER answer questions about ${company.displayName} using general knowledge - you MUST search the knowledge base first
- The search_knowledge tool returns accurate, up-to-date information from ${company.displayName}'s documentation
- If search_knowledge doesn't return results, say "I don't have that information in our knowledge base, but I'd be happy to connect you with our team to learn more."
- Use other tools (get_demo_clip, show_visual, create_meeting_link, log_lead) as appropriate during the conversation`;

    // Get base URL for callback
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3001");
    const callbackUrl = `${baseUrl}/api/tavus/callback?companyId=${company.slug}`;

    // Create CVI session
    const session = await tavusClient.createCVISession({
      replicaId: company.tavusReplicaId,
      personaId: company.tavusPersonaId || undefined,
      instructions,
      tools: toolDefinitions,
      callbackUrl, // Pass callback URL for function calls
    });

    console.log("[Tavus Session] Created session:", {
      sessionId: session.sessionId,
      websocketUrl: session.websocketUrl,
    });

    return NextResponse.json({
      sessionId: session.sessionId,
      websocketUrl: session.websocketUrl,
      replicaId: company.tavusReplicaId,
    });
  } catch (error: any) {
    console.error("[Tavus Session] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create Tavus session" },
      { status: 500 }
    );
  }
}

