import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireClientAdminCompanyId } from "@/lib/clientAdmin";

const MODELS_TO_TEST = [
  { name: "gpt-4o-mini", endpoint: "chat" },
  { name: "text-embedding-3-small", endpoint: "embeddings" },
  { name: "gpt-4o", endpoint: "chat" },
];

export async function POST(request: NextRequest) {
  try {
    await requireClientAdminCompanyId();
    const { apiKey } = await request.json();
    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    const client = new OpenAI({ apiKey: apiKey.trim() });
    const results: { model: string; status: "ok" | "error"; message?: string }[] = [];

    for (const { name, endpoint } of MODELS_TO_TEST) {
      try {
        if (endpoint === "chat") {
          await client.chat.completions.create({
            model: name,
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 2,
          });
        } else if (endpoint === "embeddings") {
          await client.embeddings.create({
            model: name,
            input: "test",
          });
        }
        results.push({ model: name, status: "ok" });
      } catch (err: any) {
        const msg = err?.message || err?.error?.message || "Unknown error";
        results.push({ model: name, status: "error", message: msg });
      }
    }

    const allOk = results.every((r) => r.status === "ok");
    return NextResponse.json({
      valid: allOk,
      results,
    });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
