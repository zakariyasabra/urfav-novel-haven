// Public auto-translation pipeline for readers.
// - Called on first English visit to a novel or chapter.
// - Uses service role to translate Arabic source into _en columns exactly once.
// - Skips work if a fresh translation already exists (status='done' AND _en filled).
// - When Arabic is edited, a DB trigger flips status back to 'pending' so this
//   function will retranslate on the next English visit.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  entity_type: z.enum(["novel", "chapter"]),
  entity_id: z.string().uuid(),
});

const NOVEL_FIELDS = ["title", "description", "author_display", "original_title", "translator"] as const;
const CHAPTER_FIELDS = ["title", "content"] as const;

async function gatewayTranslate(apiKey: string, text: string, isHtml: boolean): Promise<string> {
  const system =
    `You are a professional literary translator between Arabic and English. Translate the given text into English. Preserve tone, style, and formatting. ` +
    (isHtml ? "Preserve HTML tags exactly." : "Preserve paragraph breaks (\\n\\n).") +
    " Do NOT add commentary, notes, or quotes. Output ONLY the translation.";
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: text },
      ],
    }),
  });
  if (!res.ok) throw new Error(`translate ${res.status}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const out = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!out) throw new Error("empty translation");
  return out;
}

export const ensureEnglishTranslation = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false, reason: "no_ai_key" as const };

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
      await supabaseAdmin.from("content_translations").upsert({
        entity_type: data.entity_type, entity_id: data.entity_id, target_lang: "en", status: "done", error: null,
      }, { onConflict: "entity_type,entity_id,target_lang" });
      return { ok: true, skipped: "nothing_to_translate" as const };
    }

    // Mark running (lock).
    await supabaseAdmin.from("content_translations").upsert({
      entity_type: data.entity_type, entity_id: data.entity_id, target_lang: "en", status: "running", error: null,
    }, { onConflict: "entity_type,entity_id,target_lang" });

    try {
      const update: Record<string, string> = {};
      for (const f of needs) {
        const src = (row as Record<string, string | null>)[`${f}_ar`]!;
        const isHtml = f === "content" || /html/i.test(f);
        update[`${f}_en`] = await gatewayTranslate(apiKey, src, isHtml);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: upErr } = await (supabaseAdmin as any).from(table).update(update).eq("id", data.entity_id);
      if (upErr) throw new Error(upErr.message);
      await supabaseAdmin.from("content_translations").upsert({
        entity_type: data.entity_type, entity_id: data.entity_id, target_lang: "en", status: "done", error: null,
      }, { onConflict: "entity_type,entity_id,target_lang" });
      return { ok: true, translated: needs };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabaseAdmin.from("content_translations").upsert({
        entity_type: data.entity_type, entity_id: data.entity_id, target_lang: "en", status: "error", error: msg,
      }, { onConflict: "entity_type,entity_id,target_lang" });
      return { ok: false, reason: "error" as const, error: msg };
    }
  });
