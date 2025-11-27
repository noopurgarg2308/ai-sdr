export type CompanyId = string;

export type Role = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
}

export type Persona = "vp_ecommerce" | "pricing_manager" | "cfo" | "other";

export type Intent =
  | "pricing_optimization"
  | "competitor_intelligence"
  | "shopify_integration"
  | "profitability_overview"
  | "unsure";

export interface CompanyConfig {
  id: CompanyId;
  slug: string;
  displayName: string;
  shortDescription: string;
  websiteUrl?: string;
  personas: Persona[];
  ragIndexName: string;
  demoNamespace: string;
  productSummary: string;
  toneGuidelines?: string;
  features: {
    canBookMeetings: boolean;
    canShowDemoClips: boolean;
    canLogLeads: boolean;
  };
  actionTemplates?: {
    name: string;
    description: string;
    parametersExample?: string;
  }[];
}

export interface ChatRequest {
  companyId: CompanyId;
  sessionId?: string;
  messages: ChatMessage[];
  personaHint?: Persona;
  urlPath?: string;
}

export interface ChatResponse {
  sessionId: string;
  reply: ChatMessage;
  demoClipUrl?: string;
  showMeetingPrompt?: boolean;
  meetingLink?: string;
  visualAssets?: Array<{
    type: string;
    url: string;
    title: string;
    description?: string;
    thumbnail?: string;
  }>;
}

