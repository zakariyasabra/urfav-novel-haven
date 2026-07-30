// Provider-agnostic chat/completion for the AI Reading Assistant.
// Uses the official Google Gemini Developer API (@google/genai).
//
// Server-only. Never import from client-reachable modules at module scope
// unless the caller is also server-only (a *.server.ts module or a
// createServerFn handler body).

import { GoogleGenAI } from "@google/genai";

export type AiProvider = "gemini" | "openai" | "anthropic" | "custom";

export interface AiCallResult {
  text: string;
  provider: string;
  model: string;
  tokens_in: number | null;
  tokens_out: number | null;
  duration_ms: number;
}

interface AiCallOptions {
  system: string;
  user: string;
  json?: boolean;
  provider?: AiProvider;
  model?: string;
}

const DEFAULT_PROVIDER: AiProvider =
  (process.env.AI_ASSISTANT_PROVIDER as AiProvider | undefined) ?? "gemini";
const DEFAULT_MODEL = process.env.AI_ASSISTANT_MODEL ?? "gemini-2.5-flash";

export async function runAi(opts: AiCallOptions): Promise<AiCallResult> {
  const provider = opts.provider ?? DEFAULT_PROVIDER;
  const model = opts.model ?? DEFAULT_MODEL;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("no_ai_key");

  const started = Date.now();
  const ai = new GoogleGenAI({ apiKey });

  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: opts.user }] }],
      config: {
        systemInstruction: opts.system,
        ...(opts.json ? { responseMimeType: "application/json" } : {}),
      },
    });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    const status = err?.status;
    const msg = err?.message ?? String(e);
    if (status === 429 || /rate|quota/i.test(msg)) throw new Error("rate_limited");
    if (status === 402) throw new Error("credits_exhausted");
    throw new Error(`gemini_error_${status ?? "unknown"}: ${msg.slice(0, 200)}`);
  }

  const text = (response.text ?? "").trim();
  if (!text) throw new Error("empty_response");

  const usage = response.usageMetadata;

  return {
    text,
    provider,
    model,
    tokens_in: usage?.promptTokenCount ?? null,
    tokens_out: usage?.candidatesTokenCount ?? null,
    duration_ms: Date.now() - started,
  };
}

export function safeJsonParse<T>(text: string): T | null {
  try {
    // Strip common ```json fences if the model added them.
    const cleaned = text.replace(/^```(?:json)?\s*|```$/gim, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
