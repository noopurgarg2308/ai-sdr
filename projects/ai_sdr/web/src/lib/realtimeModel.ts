/**
 * GA Realtime voice model for /v1/realtime WebSocket sessions.
 * Replaces deprecated gpt-4o-realtime-preview-2024-12-17 (see OpenAI deprecations).
 */
export const DEFAULT_REALTIME_MODEL =
  process.env.OPENAI_REALTIME_MODEL?.trim() || "gpt-realtime-1.5";
