import OpenAI from "openai";

// Don't throw error immediately - allow for late-loading env vars (e.g., from dotenv in scripts)
const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

// Lazy initialization - only create client when first accessed
let _openai: OpenAI | null = null;

export const openai = new Proxy({} as OpenAI, {
  get(target, prop) {
    if (!_openai) {
      _openai = getOpenAIClient();
    }
    return (_openai as any)[prop];
  },
});

