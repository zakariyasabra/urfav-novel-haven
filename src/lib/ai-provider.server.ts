// Provider-agnostic chat/completion for the AI Reading Assistant.
// Currently routes through the Lovable AI Gateway with a Gemini default;
// swap PROVIDER at env / DB level to point at OpenAI, Anthropic, or a
// self-hosted LLM without changing callers.
//
// Server-only. Never import from client-reachable modules at module scope
// unless the caller is also server-only (a *.server.ts module or a
// createServerFn handler body).

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
const DEFAULT_MODEL = process.env.AI_ASSISTANT_MODEL ?? "google/gemini-2.5-flash";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function runAi(opts: AiCallOptions): Promise<AiCallResult> {
  const provider = opts.provider ?? DEFAULT_PROVIDER;
  const model = opts.model ?? DEFAULT_MODEL;

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("no_ai_key");

  const started = Date.now();

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("rate_limited");
    if (res.status === 402) throw new Error("credits_exhausted");
    throw new Error(`ai_gateway_${res.status}: ${t.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("empty_response");

  return {
    text,
    provider,
    model,
    tokens_in: json.usage?.prompt_tokens ?? null,
    tokens_out: json.usage?.completion_tokens ?? null,
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
