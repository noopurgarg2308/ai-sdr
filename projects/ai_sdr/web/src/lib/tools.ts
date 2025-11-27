import type { CompanyId, Persona } from "@/types/chat";
import { searchKnowledge } from "./rag";
import { intelligentSearch } from "./smartSearch";
import { getDemoClip } from "./demoMedia";
import { createMeetingLink } from "./scheduling";
import { logLeadToCRM, type LeadPayload } from "./crm";
import { searchMediaAssets, type MediaType, type MediaCategory } from "./media";

// Export tool definitions from separate file to avoid client-side imports
export { toolDefinitions } from "./toolDefinitions";

// Keep the old definitions here for reference but commented out
const _toolDefinitionsOld = [
  {
    type: "function" as const,
    function: {
      name: "search_knowledge",
      description:
        "Search company-specific documentation, FAQs, and product information using semantic search. Use this when you need accurate information to answer a question about the company's products or services.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Natural language question to search company knowledge for.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_demo_clip",
      description:
        "Retrieve a relevant product demo video clip based on the visitor's persona and intent. Use this when the conversation has progressed to showing a demo.",
      parameters: {
        type: "object",
        properties: {
          persona: {
            type: "string",
            enum: ["vp_ecommerce", "pricing_manager", "cfo", "other"],
            description: "The visitor's role/persona",
          },
          intent: {
            type: "string",
            description: "The visitor's primary intent or use case (e.g., 'pricing_optimization', 'competitor_intelligence')",
          },
        },
        required: ["persona", "intent"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_meeting_link",
      description:
        "Generate a meeting booking link for a qualified lead who wants to speak with the sales team. Use this when the visitor is ready to book a demo or discovery call.",
      parameters: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description: "The visitor's timezone (e.g., 'America/New_York')",
            default: "America/New_York",
          },
          persona: {
            type: "string",
            description: "The visitor's role/persona to customize the meeting",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "log_lead",
      description:
        "Log a qualified lead to the CRM system. Use this when you've gathered enough information about a promising lead (name, email, company, role, etc.).",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The lead's full name",
          },
          email: {
            type: "string",
            description: "The lead's email address",
          },
          company: {
            type: "string",
            description: "The lead's company name",
          },
          role: {
            type: "string",
            description: "The lead's job title or role",
          },
          icp_fit: {
            type: "string",
            enum: ["high", "medium", "low"],
            description: "Ideal Customer Profile fit assessment",
          },
          use_cases: {
            type: "array",
            items: { type: "string" },
            description: "List of use cases or pain points discussed",
          },
          summary: {
            type: "string",
            description: "Brief summary of the conversation and lead qualification",
          },
        },
        required: ["email", "summary"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "show_visual",
      description:
        "Show relevant visual content (images, charts, slides, videos) to help explain a concept or answer a question. Use this when a visual would make the explanation clearer or more engaging. Examples: pricing charts, product screenshots, architecture diagrams, comparison tables, feature illustrations.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "What to search for (e.g., 'pricing', 'architecture', 'feature comparison')",
          },
          type: {
            type: "string",
            enum: ["image", "video", "pdf", "slide", "chart", "gif"],
            description: "Type of visual content to show",
          },
          category: {
            type: "string",
            enum: ["product", "pricing", "comparison", "demo", "case-study", "feature", "architecture"],
            description: "Category of content",
          },
        },
        required: ["query"],
      },
    },
  },
]; // End of old definitions (kept for reference)

export async function dispatchToolCall(
  companyId: CompanyId,
  name: string,
  args: any
): Promise<any> {
  console.log(`[Tools] Dispatching tool call: ${name}`, args);

  switch (name) {
    case "search_knowledge": {
      // Use intelligent search that includes linked visuals
      const smartResults = await intelligentSearch(companyId, args.query, {
        includeVisuals: true,
        limit: 5,
      });
      
      console.log(`[Tools] Smart search found ${smartResults.textResults.length} text results, ${smartResults.linkedVisuals.length} linked visuals`);
      
      return {
        results: smartResults.textResults.map((r) => ({
          content: r.content,
          score: r.score,
        })),
        linkedVisuals: smartResults.linkedVisuals,
        visualResults: smartResults.visualResults,
      };
    }

    case "get_demo_clip":
      return await getDemoClip(companyId, args.persona as Persona, args.intent);

    case "create_meeting_link":
      return await createMeetingLink(args.timezone, args.persona);

    case "log_lead": {
      const payload: LeadPayload = {
        ...args,
        companyId,
      };
      return await logLeadToCRM(payload);
    }

    case "show_visual": {
      const results = await searchMediaAssets({
        companyId,
        query: args.query,
        type: args.type as MediaType | undefined,
        category: args.category as MediaCategory | undefined,
        limit: 3,
      });
      return {
        visuals: results.map((v) => ({
          type: v.type,
          url: v.url,
          title: v.title,
          description: v.description,
          thumbnail: v.thumbnail,
        })),
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

