/**
 * Verify OpenAI Realtime API configuration and account access.
 *
 * Usage:
 *   npx tsx scripts/verifyRealtimeApi.ts
 *
 * Checks:
 * 1. OPENAI_API_KEY is set (from .env.local or env)
 * 2. API key is valid (OpenAI API responds successfully)
 * 3. Realtime model (default gpt-realtime-1.5) is available to your account
 * 4. Optional: WebSocket connection to Realtime API (if `ws` is installed)
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const API_BASE = "https://api.openai.com/v1";
const REALTIME_MODEL =
  process.env.OPENAI_REALTIME_MODEL?.trim() || "gpt-realtime-1.5";

async function main() {
  console.log("OpenAI Realtime API verification\n");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("FAIL: OPENAI_API_KEY is not set.");
    console.error("  Set it in .env.local (e.g. OPENAI_API_KEY=sk-...)");
    process.exit(1);
  }
  const keyPreview = apiKey.slice(0, 7) + "..." + apiKey.slice(-4);
  console.log("1. API key: found", keyPreview);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  try {
    const modelsRes = await fetch(`${API_BASE}/models`, { headers });
    if (!modelsRes.ok) {
      const text = await modelsRes.text();
      console.error("2. FAIL: OpenAI API request failed:", modelsRes.status, modelsRes.statusText);
      if (modelsRes.status === 401) {
        console.error("   Invalid or expired API key. Check https://platform.openai.com/api-keys");
      } else if (modelsRes.status === 403) {
        console.error("   Access forbidden. Your account may not have API access or may be restricted.");
      }
      console.error("   Response:", text.slice(0, 300));
      process.exit(1);
    }
    const modelsData = (await modelsRes.json()) as { data?: { id: string }[] };
    const modelIds = (modelsData.data ?? []).map((m) => m.id);
    console.log("2. API key: valid (account can list models)");

    const hasRealtime = modelIds.some(
      (id) =>
        id === REALTIME_MODEL ||
        id.startsWith("gpt-realtime") ||
        id.startsWith("gpt-4o-realtime")
    );
    if (!hasRealtime) {
      const realtimeRes = await fetch(`${API_BASE}/models/${REALTIME_MODEL}`, { headers });
      if (realtimeRes.ok) {
        console.log("3. Realtime model: available (direct fetch)");
      } else {
        console.warn("3. Realtime model: not found in list; checking direct access...");
        if (realtimeRes.status === 404) {
          console.error(`   Model not found. Your account may not have access to ${REALTIME_MODEL}.`);
          console.error("   Check https://platform.openai.com/docs/models and billing/limits.");
        } else {
          console.error("   Status:", realtimeRes.status, await realtimeRes.text().then((t) => t.slice(0, 200)));
        }
      }
    } else {
      console.log(`3. Realtime model: available (${REALTIME_MODEL} or gpt-realtime* in model list)`);
    }

    console.log("\n4. WebSocket (Realtime) connectivity:");
    try {
      const { default: WebSocket } = await import("ws");
      const url = `wss://api.openai.com/v1/realtime?model=${REALTIME_MODEL}`;
      const ws = new WebSocket(url, [
        "realtime",
        `openai-insecure-api-key.${apiKey}`,
      ]);
      const done = new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("timeout")), 10000);
        ws.on("open", () => {
          clearTimeout(t);
          resolve();
        });
        ws.on("message", (data: Buffer) => {
          try {
            const msg = JSON.parse(data.toString());
            if (msg.type === "session.created" || msg.type === "session.updated") {
              clearTimeout(t);
              ws.close();
              resolve();
            }
            if (msg.type === "error") {
              clearTimeout(t);
              ws.close();
              reject(new Error(msg.error?.message ?? JSON.stringify(msg.error)));
            }
          } catch (_) {}
        });
        ws.on("error", (err) => {
          clearTimeout(t);
          reject(err);
        });
      });
      await done;
      ws.close();
      console.log("   Realtime WebSocket: connected and session ready.");
    } catch (e: unknown) {
      const err = e as Error & { code?: string };
      if (err.message === "timeout") {
        console.warn("   Realtime WebSocket: connect timed out (server may still be ok).");
      } else if (String(err).includes("Cannot find module 'ws'")) {
        console.log("   Install 'ws' to test WebSocket: npm i -D ws");
      } else {
        console.warn("   Realtime WebSocket:", err.message ?? err);
      }
    }

    console.log("\nSummary: API key is valid. Realtime model access may vary; run the app and check the browser console for response.done status.");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
