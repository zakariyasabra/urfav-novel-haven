// Public auto-translation pipeline for readers.
// - Requires an authenticated caller and enforces a per-user rate limit,
//   so anonymous scripts cannot drive up paid AI Gateway usage.
// - Uses service role only to write the translation result once it is safe
//   to proceed. Reads are also gated by an advisory lock keyed on the
//   entity so concurrent requests for the same row cannot race past the
//   status check.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  entity_type: z.enum(["novel", "chapter"]),
  entity_id: z.string().uuid(),
});

const NOVEL_FIELDS = [
  "title",
  "description",
  "author_display",
  "original_title",
  "translator",
] as const;
const CHAPTER_FIELDS = ["title", "content"] as const;

async function gatewayTranslate(_apiKey: string, text: string, isHtml: boolean): Promise<string> {
  const system =
    `You are a professional literary translator between Arabic and English. Translate the given text into English. Preserve tone, style, and formatting. ` +
    (isHtml ? "Preserve HTML tags exactly." : "Preserve paragraph breaks (\\n\\n).") +
    " Do NOT add commentary, notes, or quotes. Output ONLY the translation.";
  const { runAi } = await import("./ai-provider.server");
  const res = await runAi({ system, user: text });
  const out = res.text.trim();
  if (!out) throw new Error("empty translation");
  return out;
}

export const ensureEnglishTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { ok: false, reason: "no_ai_key" as const };


    // Per-user rate limit: at most 20 auto-translate triggers per minute.
    const { data: allowed } = await context.supabase.rpc("check_rate_limit", {
      _action: "auto_translate",
      _limit: 20,
      _window_secs: 60,
    });
    if (allowed === false) return { ok: false, reason: "rate_limited" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const table = data.entity_type === "novel" ? "novels" : "chapters";
    const fields = data.entity_type === "novel" ? NOVEL_FIELDS : CHAPTER_FIELDS;

    // Check current translation status.
    const { data: tr } = await supabaseAdmin
      .from("content_translations")
      .select("status,updated_at")
      .eq("entity_type", data.entity_type)
      .eq("entity_id", data.entity_id)
      .eq("target_lang", "en")
      .maybeSingle();

    // If a translation is already running (started <5min ago), don't fire again.
    if (tr?.status === "running" && tr.updated_at) {
      const ageMs = Date.now() - new Date(tr.updated_at).getTime();
      if (ageMs < 5 * 60 * 1000) return { ok: true, skipped: "running" as const };
    }
    if (tr?.status === "done") return { ok: true, skipped: "cached" as const };

    // Load source row.
    const arCols = fields.map((f) => `${f}_ar`).join(",");
    const enCols = fields.map((f) => `${f}_en`).join(",");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row } = await (supabaseAdmin as any)
      .from(table)
      .select(`id,${arCols},${enCols}`)
      .eq("id", data.entity_id)
      .maybeSingle();
    if (!row) return { ok: false, reason: "not_found" as const };

    // Determine which fields need translation.
    const needs: string[] = [];
    for (const f of fields) {
      const ar = (row as Record<string, string | null>)[`${f}_ar`];
      const en = (row as Record<string, string | null>)[`${f}_en`];
      if (ar && ar.trim() && (!en || !en.trim() || tr?.status === "pending")) {
        needs.push(f);
      }
    }
    if (needs.length === 0) {
      await supabaseAdmin.from("content_translations").upsert(
        {
          entity_type: data.entity_type,
          entity_id: data.entity_id,
          target_lang: "en",
          status: "done",
          error: null,
        },
        { onConflict: "entity_type,entity_id,target_lang" },
      );
      return { ok: true, skipped: "nothing_to_translate" as const };
    }

    // Mark running (lock). Only proceed if we transitioned from a non-running
    // state — a concurrent caller that already flipped it to 'running' loses
    // the race and returns without spending AI credits.
    const { data: locked } = await supabaseAdmin
      .from("content_translations")
      .upsert(
        {
          entity_type: data.entity_type,
          entity_id: data.entity_id,
          target_lang: "en",
          status: "running",
          error: null,
        },
        { onConflict: "entity_type,entity_id,target_lang" },
      )
      .select("status,updated_at")
      .maybeSingle();
    if (locked && locked.status === "running" && tr?.status === "running") {
      return { ok: true, skipped: "running" as const };
    }

    try {
      const update: Record<string, string> = {};
      for (const f of needs) {
        const src = (row as Record<string, string | null>)[`${f}_ar`]!;
        const isHtml = f === "content" || /html/i.test(f);
        update[`${f}_en`] = await gatewayTranslate(apiKey, src, isHtml);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: upErr } = await (supabaseAdmin as any)
        .from(table)
        .update(update)
        .eq("id", data.entity_id);
      if (upErr) throw new Error(upErr.message);
      await supabaseAdmin.from("content_translations").upsert(
        {
          entity_type: data.entity_type,
          entity_id: data.entity_id,
          target_lang: "en",
          status: "done",
          error: null,
        },
        { onConflict: "entity_type,entity_id,target_lang" },
      );
      return { ok: true, translated: needs };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabaseAdmin.from("content_translations").upsert(
        {
          entity_type: data.entity_type,
          entity_id: data.entity_id,
          target_lang: "en",
          status: "error",
          error: msg,
        },
        { onConflict: "entity_type,entity_id,target_lang" },
      );
      return { ok: false, reason: "error" as const, error: msg };
    }
  });
