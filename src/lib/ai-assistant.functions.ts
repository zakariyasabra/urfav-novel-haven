// AI Reading Assistant server functions.
//
// All calls are spoiler-aware: they read `ai_reader_context(_novel_id)`
// through the caller's authenticated client and strictly limit the
// material passed to the model to chapters up to the caller's progress
// (unless allow_spoilers is set on the profile OR the caller/admin
// opts in explicitly).
//
// Asset generators (summaries, characters, timeline, world, glossary,
// reading order) are admin-only and write into `ai_assets`. The Ask AI
// endpoint is available to any authenticated user for any published novel.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const AskInput = z.object({
  conversation_id: z.string().uuid(),
  message: z.string().min(1).max(4000),
});

const GenerateAssetInput = z.object({
  novel_id: z.string().uuid(),
  kind: z.enum([
    "summary_spoilerfree",
    "summary_progress",
    "characters",
    "timeline",
    "world",
    "glossary",
    "reading_order",
  ]),
  scope_key: z.string().min(1).max(20).optional(), // "all" or a chapter index
  lang: z.enum(["ar", "en"]).default("ar"),
});

type ReaderCtx = {
  allow_spoilers: boolean;
  last_chapter_index: number;
  last_chapter_id: string | null;
  progress_percent: number;
};

async function loadReaderCtx(
  supabase: {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>;
  },
  novelId: string,
): Promise<ReaderCtx> {
  const { data } = await supabase.rpc("ai_reader_context", { _novel_id: novelId });
  const row = Array.isArray(data) ? (data[0] as Partial<ReaderCtx>) : (data as Partial<ReaderCtx>);
  return {
    allow_spoilers: !!row?.allow_spoilers,
    last_chapter_index: Number(row?.last_chapter_index ?? 0),
    last_chapter_id: row?.last_chapter_id ?? null,
    progress_percent: Number(row?.progress_percent ?? 0),
  };
}

/** Ask AI — free-form Q&A grounded in the novel, spoiler-aware. */
export const askAiAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => AskInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Verify ownership of conversation and pull metadata.
    const { data: conv } = await supabase
      .from("ai_conversations")
      .select("id, novel_id, allow_spoilers")
      .eq("id", data.conversation_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!conv) throw new Error("conversation_not_found");

    // 2. Per-user rate limit — reuse the generic gateway limiter.
    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      _action: "ai_assistant_ask",
      _limit: 30,
      _window_secs: 60,
    });
    if (allowed === false) throw new Error("rate_limited");

    // 3. Reader context (spoiler ceiling).
    const ctx = await loadReaderCtx(supabase, conv.novel_id);
    const spoilers = ctx.allow_spoilers || conv.allow_spoilers;

    // 4. Load novel meta.
    const { data: novel } = await supabase
      .from("novels")
      .select("id, title_ar, title_en, description_ar, description_en, author_display_ar, author_display_en")
      .eq("id", conv.novel_id)
      .maybeSingle();
    if (!novel) throw new Error("novel_not_found");

    // 5. Load chapter titles the user has actually reached (or all if spoilers on).
    // Cap at 200 titles to keep the prompt bounded.
    let chapterQuery = supabase
      .from("chapters")
      .select("chapter_number, title_ar, title_en")
      .eq("novel_id", conv.novel_id)
      .eq("status", "published")
      .order("chapter_number", { ascending: true })
      .limit(200);
    if (!spoilers && ctx.last_chapter_index > 0) {
      chapterQuery = chapterQuery.lte("chapter_number", ctx.last_chapter_index);
    } else if (!spoilers) {
      // No progress and no spoilers → only the first chapter's title for context.
      chapterQuery = chapterQuery.lte("chapter_number", 1);
    }
    const { data: chapterList } = await chapterQuery;

    // 6. Optionally pull raw content for the current chapter to ground the answer.
    let currentContent = "";
    if (ctx.last_chapter_id) {
      const { data: cur } = await supabase
        .from("chapters")
        .select("content_ar")
        .eq("id", ctx.last_chapter_id)
        .maybeSingle();
      currentContent = String(cur?.content_ar ?? "").slice(0, 6000);
    }

    // 7. Recent conversation history (last 12 messages).
    const { data: history } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", data.conversation_id)
      .order("created_at", { ascending: false })
      .limit(12);
    const recent = ((history ?? []) as Array<{ role: string; content: string }>)
      .slice()
      .reverse();

    // 8. Build the system prompt with strict spoiler rules.
    const title = novel.title_ar ?? novel.title_en ?? "";
    const author = novel.author_display_ar ?? novel.author_display_en ?? "";
    const description = (novel.description_ar ?? novel.description_en ?? "").slice(0, 800);
    const chapterLines = ((chapterList ?? []) as Array<{ chapter_number: number; title_ar: string | null; title_en: string | null }>)
      .map((c) => `${c.chapter_number}. ${c.title_ar ?? c.title_en ?? ""}`)
      .join("\n");

    const spoilerRule = spoilers
      ? "The reader has explicitly enabled spoilers. You may reference any chapter."
      : `The reader has reached chapter ${ctx.last_chapter_index || 0}. Under NO circumstances reveal, hint at, or foreshadow anything from later chapters. If the user asks about future events, reply: "هذه المعلومة تحتوي على حرق للأحداث بعد تقدمك الحالي." and offer to enable spoilers.`;

    const system = [
      "You are the AI Reading Assistant for a novel-reading platform (FAVNOL).",
      "Answer in the same language as the user's last message (Arabic or English).",
      "Ground every answer in the provided novel material only. Do NOT invent characters, worlds, or events.",
      spoilerRule,
      `Novel: ${title}`,
      author ? `Author: ${author}` : "",
      description ? `Synopsis (public): ${description}` : "",
      chapterLines ? `Chapters visible to the reader:\n${chapterLines}` : "",
      currentContent ? `Excerpt from the reader's current chapter (may be truncated):\n${currentContent}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    // 9. Compose the user turn: prior history + new message.
    const historyBlock = recent
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");
    const userPrompt = historyBlock
      ? `${historyBlock}\n\nUSER: ${data.message}`
      : data.message;

    const { runAi } = await import("./ai-provider.server");
    let reply: Awaited<ReturnType<typeof runAi>>;
    try {
      reply = await runAi({ system, user: userPrompt });
    } catch (err) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("ai_generation_logs").insert({
        novel_id: conv.novel_id,
        user_id: userId,
        kind: "ask_ai",
        status: "error",
        error: String(err instanceof Error ? err.message : err).slice(0, 500),
      });
      throw err;
    }

    // 10. Persist both turns and log.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ai_messages").insert([
      {
        conversation_id: data.conversation_id,
        role: "user",
        content: data.message,
        max_chapter_index: ctx.last_chapter_index,
        allow_spoilers: spoilers,
      },
      {
        conversation_id: data.conversation_id,
        role: "assistant",
        content: reply.text,
        max_chapter_index: ctx.last_chapter_index,
        allow_spoilers: spoilers,
        tokens_in: reply.tokens_in,
        tokens_out: reply.tokens_out,
      },
    ]);
    await supabaseAdmin
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.conversation_id);
    await supabaseAdmin.from("ai_generation_logs").insert({
      novel_id: conv.novel_id,
      user_id: userId,
      kind: "ask_ai",
      provider: reply.provider,
      model: reply.model,
      tokens_in: reply.tokens_in,
      tokens_out: reply.tokens_out,
      duration_ms: reply.duration_ms,
      status: "ok",
    });

    return { ok: true as const, reply: reply.text };
  });

// --- Admin: generate / regenerate cached assets -----------------------------

const KIND_PROMPTS: Record<
  string,
  { instruction: string; schemaHint: string }
> = {
  summary_spoilerfree: {
    instruction:
      "Write a short SPOILER-FREE synopsis of the novel (max 180 words) covering setting, premise, and tone. Do NOT reveal plot twists, major deaths, or the ending.",
    schemaHint: '{ "summary": "..." }',
  },
  summary_progress: {
    instruction:
      "Write a chapter-by-chapter recap covering only the provided chapters. Keep each entry 1-3 sentences.",
    schemaHint:
      '{ "entries": [ { "chapter": 1, "title": "...", "recap": "..." } ] }',
  },
  characters: {
    instruction:
      "Build a character guide covering ONLY characters introduced in the provided chapters. Do NOT include future developments.",
    schemaHint:
      '{ "characters": [ { "name": "...", "description": "...", "status": "...", "relationships": ["..."], "abilities": ["..."], "first_appearance": "Chapter N" } ] }',
  },
  timeline: {
    instruction:
      "Produce a chronological timeline of key events from the provided chapters only.",
    schemaHint:
      '{ "events": [ { "chapter": 1, "event": "..." } ] }',
  },
  world: {
    instruction:
      "Describe the world guide (kingdoms, factions, magic/cultivation systems, geography) based ONLY on what has been revealed in the provided chapters.",
    schemaHint:
      '{ "sections": [ { "heading": "...", "body": "..." } ] }',
  },
  glossary: {
    instruction:
      "Extract a glossary of terms, techniques, ranks, artifacts, or bloodlines that have appeared in the provided chapters.",
    schemaHint:
      '{ "terms": [ { "term": "...", "definition": "..." } ] }',
  },
  reading_order: {
    instruction:
      "Suggest a reading order across main story, side stories, prequels, and sequels. If unknown, return an empty array.",
    schemaHint:
      '{ "entries": [ { "label": "...", "kind": "main|side|prequel|sequel|spinoff", "note": "..." } ] }',
  },
};

export const generateAiAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => GenerateAssetInput.parse(raw))
  .handler(async ({ data, context }) => {
    // Admin-only.
    const { data: allowed } = await context.supabase.rpc("has_any_admin_role", {
      _user_id: context.userId,
    });
    if (!allowed) throw new Error("forbidden");

    const kind = data.kind;
    const prompt = KIND_PROMPTS[kind];
    if (!prompt) throw new Error("unknown_kind");

    const scopeKey =
      kind === "summary_spoilerfree" || kind === "reading_order"
        ? "all"
        : data.scope_key && /^[0-9]+$/.test(data.scope_key)
          ? data.scope_key
          : "all";

    // Load novel + chapter material.
    const { data: novel } = await context.supabase
      .from("novels")
      .select("id, title_ar, title_en, description_ar, description_en")
      .eq("id", data.novel_id)
      .maybeSingle();
    if (!novel) throw new Error("novel_not_found");

    let chapterQuery = context.supabase
      .from("chapters")
      .select("chapter_number, title_ar, title_en, content_ar")
      .eq("novel_id", data.novel_id)
      .eq("status", "published")
      .order("chapter_number", { ascending: true })
      .limit(300);
    if (scopeKey !== "all") {
      chapterQuery = chapterQuery.lte("chapter_number", parseInt(scopeKey, 10));
    }
    const { data: chapters } = await chapterQuery;

    const chapterMaterial = ((chapters ?? []) as Array<{
      chapter_number: number;
      title_ar: string | null;
      title_en: string | null;
      content_ar: string | null;
    }>)
      .map((c) => {
        const title = c.title_ar ?? c.title_en ?? "";
        // Trim each chapter to keep prompt bounded.
        const body = (c.content_ar ?? "").slice(0, 1200);
        return `--- Chapter ${c.chapter_number}: ${title} ---\n${body}`;
      })
      .join("\n\n")
      .slice(0, 40000);

    const targetLang = data.lang === "en" ? "English" : "Arabic";
    const system = [
      `You are a literary assistant. Reply in ${targetLang} ONLY.`,
      "Output STRICT JSON matching the requested schema. No prose outside JSON.",
      prompt.instruction,
      `Schema: ${prompt.schemaHint}`,
    ].join("\n\n");

    const user = [
      `Novel: ${novel.title_ar ?? novel.title_en ?? ""}`,
      `Synopsis: ${(novel.description_ar ?? novel.description_en ?? "").slice(0, 800)}`,
      `Scope: ${scopeKey === "all" ? "entire published corpus" : `up to chapter ${scopeKey}`}`,
      "",
      "Material:",
      chapterMaterial || "(no chapter content available)",
    ].join("\n");

    const { runAi, safeJsonParse } = await import("./ai-provider.server");
    const started = Date.now();
    let result;
    try {
      result = await runAi({ system, user, json: true });
    } catch (err) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("ai_generation_logs").insert({
        novel_id: data.novel_id,
        user_id: context.userId,
        kind,
        status: "error",
        error: String(err instanceof Error ? err.message : err).slice(0, 500),
        duration_ms: Date.now() - started,
      });
      throw err;
    }
    const parsed = safeJsonParse<Record<string, unknown>>(result.text);
    if (!parsed) throw new Error("bad_json");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("ai_assets")
      .upsert(
        {
          novel_id: data.novel_id,
          kind,
          scope_key: scopeKey,
          lang: data.lang,
          content: parsed,
          provider: result.provider,
          model: result.model,
          tokens_in: result.tokens_in,
          tokens_out: result.tokens_out,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "novel_id,kind,scope_key,lang" },
      );

    await supabaseAdmin.from("ai_generation_logs").insert({
      novel_id: data.novel_id,
      user_id: context.userId,
      kind,
      provider: result.provider,
      model: result.model,
      tokens_in: result.tokens_in,
      tokens_out: result.tokens_out,
      duration_ms: result.duration_ms,
      status: "ok",
    });

    return { ok: true as const, kind, scope_key: scopeKey, content: parsed };
  });
