/**
 * OpenAI function tool definitions
 * Separate file to avoid importing server-side code on client
 */

export const toolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "search_knowledge",
      description:
        "REQUIRED for company-specific questions: search this tenant's knowledge base (PDFs, crawled website, FAQs). Call before answering about products, pricing, features, or what the company does. Do not use general world knowledge when results are empty—follow the guidance field. When linked visuals are returned, they are shown automatically; do not list image descriptions in your reply.",
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
      name: "end_conversation",
      description:
        "Call this when the user says they want to end the conversation, say goodbye, or are done. Examples: 'end the conversation', 'goodbye', 'that's all', 'I'm done', 'thanks that's all', 'I have to go', 'we can stop now'. Call this instead of giving a long verbal farewell—it will end the session cleanly.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "show_visual",
      description:
        "Show relevant visual content (images, charts, slides, videos) to help explain a concept or answer a question. Use this when a visual would make the explanation clearer or more engaging. Examples: pricing charts, product screenshots, architecture diagrams, comparison tables, feature illustrations. Note: When search_knowledge returns linked visuals, those are automatically included - you don't need to call this tool separately for those. IMPORTANT: When visuals are shown, DO NOT describe or list them in your text response - they appear automatically in a visual section.",
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
            enum: ["product", "pricing", "comparison", "demo", "case-study", "feature", "architecture", "company-info"],
            description: "Category of content",
          },
        },
        required: ["query"],
      },
    },
  },
];

