import OpenAI from "openai";
import { prisma } from "./prisma";

// Don't throw error immediately - allow for late-loading env vars (e.g., from dotenv in scripts)
export const getOpenAIClient = (apiKey?: string) => {
  const key = apiKey ?? process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }
  return new OpenAI({ apiKey: key });
};

// Lazy initialization - only create client when first accessed (uses platform key)
let _openai: OpenAI | null = null;

export const openai = new Proxy({} as OpenAI, {
  get(target, prop) {
    if (!_openai) {
      _openai = getOpenAIClient();
    }
    return (_openai as any)[prop];
  },
});

/**
 * Get the effective OpenAI API key for a company.
 * - BYOK (billingTier="byok"): Uses company's openaiApiKey if set; throws if missing.
 * - Otherwise: Uses platform OPENAI_API_KEY from env.
 */
export async function getOpenAIKeyForCompany(companyIdOrSlug: string): Promise<string> {
  const company = await prisma.company.findFirst({
    where: {
      OR: [{ id: companyIdOrSlug }, { slug: companyIdOrSlug }],
    },
    select: { id: true, billingTier: true, openaiApiKey: true },
  });

  if (!company) {
    throw new Error(`Company "${companyIdOrSlug}" not found`);
  }

  if (company.billingTier === "byok") {
    if (!company.openaiApiKey || company.openaiApiKey.trim() === "") {
      throw new Error(
        "OpenAI API key is required for this account (Tier 1 BYOK). Please add your key in the admin settings."
      );
    }
    return company.openaiApiKey;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }
  return process.env.OPENAI_API_KEY;
}

/**
 * Get an OpenAI client configured with the appropriate API key for a company.
 */
export async function getOpenAIForCompany(companyId: string): Promise<OpenAI> {
  const apiKey = await getOpenAIKeyForCompany(companyId);
  return getOpenAIClient(apiKey);
}

