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
        "Search the knowledge base using semantic search. Use this tool to find information about ANY topic - the knowledge base may contain documentation, FAQs, product information, company information, or other relevant content. ALWAYS use this tool first when answering questions, regardless of the topic. Search for any question the user asks.",
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
            enum: ["product", "pricing", "comparison", "demo", "case-study", "feature", "architecture", "company-info"],
            description: "Category of content",
          },
        },
        required: ["query"],
      },
    },
  },
];

