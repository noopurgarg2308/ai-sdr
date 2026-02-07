import { appendFile, mkdir } from "fs/promises";
import path from "path";
import { openai } from "./openai";
import type { CompanyId } from "@/types/chat";

export interface LeadPayload {
  name?: string;
  email: string;
  company?: string;
  role?: string;
  icp_fit?: "high" | "medium" | "low";
  use_cases?: string[];
  summary: string;
  companyId: CompanyId;
}

export interface ConversationEntry {
  sessionId: string;
  companyId: CompanyId;
  isLead: boolean;
  name?: string | null;
  email?: string | null;
  company?: string | null;
  role?: string | null;
  icp_fit?: "high" | "medium" | "low" | null;
  use_cases?: string[] | null;
  summary: string;
  messageCount: number;
  loggedAt: string;
}

/** Sanitize companyId for use in filenames (alphanumeric, hyphens, underscores only) */
function sanitizeCompanyId(companyId: string): string {
  return companyId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/** Path to conversations directory (one file per company) */
const CONVERSATIONS_DIR = path.join(process.cwd(), "data", "conversations");

/** Path to leads directory (one file per company) - kept for backward compatibility */
const LEADS_DIR = path.join(process.cwd(), "data", "leads");

export async function logLeadToCRM(payload: LeadPayload): Promise<{ success: boolean }> {
  try {
    await mkdir(LEADS_DIR, { recursive: true });

    const fileName = `${sanitizeCompanyId(payload.companyId)}.jsonl`;
    const filePath = path.join(LEADS_DIR, fileName);

    const record = {
      ...payload,
      loggedAt: new Date().toISOString(),
    };
    const line = JSON.stringify(record) + "\n";

    await appendFile(filePath, line, "utf-8");

    console.log("[CRM] Lead saved to", filePath);
    return { success: true };
  } catch (err) {
    console.error("[CRM] Failed to save lead:", err);
    return { success: false };
  }
}

/**
 * Uses AI to classify a conversation (lead vs not) and extract contact info.
 * All fields can be blank if not mentioned in the conversation.
 */
async function classifyConversation(
  messages: Array<{ role: string; content: string }>
): Promise<Omit<ConversationEntry, "sessionId" | "companyId" | "messageCount" | "loggedAt">> {
  const conversationText = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You analyze chat conversations between a visitor and an AI SDR. For each conversation, classify it and extract any contact info mentioned.

Return a JSON object with these exact keys:
- isLead: boolean - true if the visitor shows buying intent, discusses use cases, asks about pricing/demos, or shares contact info for follow-up
- name: string or null - visitor's name if mentioned
- email: string or null - visitor's email if mentioned
- company: string or null - visitor's company if mentioned
- role: string or null - visitor's job title/role if mentioned
- icp_fit: "high" | "medium" | "low" or null - how well they match a typical ideal customer
- use_cases: array of strings or empty array - use cases or pain points discussed
- summary: string - brief 1-2 sentence summary of the conversation

Leave fields null or empty if not mentioned. Never invent information.`,
      },
      {
        role: "user",
        content: `Classify this conversation:\n\n${conversationText}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) {
    return {
      isLead: false,
      summary: "(Unable to classify)",
    };
  }

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return {
      isLead: Boolean(parsed.isLead),
      name: parsed.name ?? null,
      email: parsed.email ?? null,
      company: parsed.company ?? null,
      role: parsed.role ?? null,
      icp_fit: (parsed.icp_fit as "high" | "medium" | "low") ?? null,
      use_cases: Array.isArray(parsed.use_cases) ? parsed.use_cases : [],
      summary: String(parsed.summary ?? "").slice(0, 500),
    };
  } catch {
    return {
      isLead: false,
      summary: "( classification failed )",
    };
  }
}

/**
 * Classifies a conversation (lead vs not) and appends it to the company's conversation log.
 * Fire-and-forget: errors are logged but not thrown.
 */
export async function classifyAndLogConversation(
  companyId: CompanyId,
  sessionId: string,
  messages: Array<{ role: string; content: string }>
): Promise<void> {
  try {
    const classification = await classifyConversation(messages);

    const entry: ConversationEntry = {
      sessionId,
      companyId,
      messageCount: messages.length,
      loggedAt: new Date().toISOString(),
      ...classification,
    };

    await mkdir(CONVERSATIONS_DIR, { recursive: true });
    const fileName = `${sanitizeCompanyId(companyId)}.jsonl`;
    const filePath = path.join(CONVERSATIONS_DIR, fileName);
    const line = JSON.stringify(entry) + "\n";
    await appendFile(filePath, line, "utf-8");

    console.log("[CRM] Conversation logged:", entry.isLead ? "LEAD" : "visitor", filePath);
  } catch (err) {
    console.error("[CRM] Failed to classify/log conversation:", err);
  }
}

