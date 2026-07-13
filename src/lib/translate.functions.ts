// AI translation server function for bilingual content.
// Uses Lovable AI Gateway (google/gemini-2.5-flash) with a plain fetch call.
// Caches results into the localized column and marks content_translations 'done'.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const TranslateInput = z.object({
  entity_type: z.enum(["novel", "chapter", "tag", "genre", "announcement", "vip_plan", "coin_package", "faq", "static_page", "profile"]),
  entity_id: z.string().uuid(),
  fields: z.array(z.string().min(1).max(64)).min(1).max(8),
  target_lang: z.enum(["ar", "en"]),
});

// Map entity -> table + owner column for permission checks.
const ENTITY_TABLE: Record<string, { table: string; owner?: string }> = {
  novel:        { table: "novels",        owner: "owner_id" },
  chapter:      { table: "chapters" },                            // authorized via parent novel below
  tag:          { table: "tags" },
  genre:        { table: "genres" },
  announcement: { table: "announcements" },
  vip_plan:     { table: "vip_plans" },
  coin_package: { table: "coin_packages" },
  faq:          { table: "faqs" },
  static_page:  { table: "static_pages" },
  profile:      { table: "profiles",      owner: "id" },
};

async function callGateway(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("تم تجاوز حد الاستخدام، حاول لاحقاً");
    if (res.status === 402) throw new Error("رصيد الذكاء الاصطناعي غير كافٍ");
    const t = await res.text().catch(() => "");
    throw new Error(`فشل الترجمة: ${res.status} ${t.slice(0, 200)}`);
  }
  const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("رد فارغ من نموذج الترجمة");
  return text;
}

async function translateOne(apiKey: string, source: string, targetLang: "ar" | "en", isHtml: boolean): Promise<string> {
  const targetName = targetLang === "en" ? "English" : "Arabic";
  const system = `You are a professional literary translator between Arabic and English. Translate the given text into ${targetName}. Preserve tone, style, and formatting. ${isHtml ? "Preserve HTML tags exactly." : "Preserve paragraph breaks (\\n\\n)."} Do NOT add commentary, notes, or quotes. Output ONLY the translation.`;
  return await callGateway(apiKey, system, source);
}

export const translateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => TranslateInput.parse(raw))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("خدمة الترجمة غير مُهيأة");

    const meta = ENTITY_TABLE[data.entity_type];
    if (!meta) throw new Error("نوع غير مدعوم");
    const { supabase, userId } = context;
    const target = data.target_lang;
    const source: "ar" | "en" = target === "en" ? "ar" : "en";

    // Permission gate: admins/super_admin OR author owning the parent novel.
    const [{ data: isSA }, { data: isAdminAny }] = await Promise.all([
      supabase.rpc("is_super_admin", { _user_id: userId }),
      supabase.rpc("has_any_admin_role", { _user_id: userId }),
    ]);
    let allowed = !!isSA || !!isAdminAny;
    if (!allowed && data.entity_type === "novel") {
      const { data: n } = await supabase.from("novels").select("owner_id").eq("id", data.entity_id).maybeSingle();
      allowed = (n as { owner_id: string } | null)?.owner_id === userId;
    }
    if (!allowed && data.entity_type === "chapter") {
      const { data: c } = await supabase.from("chapters").select("novel_id").eq("id", data.entity_id).maybeSingle();
      const novelId = (c as { novel_id: string } | null)?.novel_id;
      if (novelId) {
        const { data: n } = await supabase.from("novels").select("owner_id").eq("id", novelId).maybeSingle();
        allowed = (n as { owner_id: string } | null)?.owner_id === userId;
      }
    }
    if (!allowed && data.entity_type === "profile") allowed = data.entity_id === userId;
    if (!allowed) throw new Error("ليس لديك صلاحية للترجمة");

    // Pull source columns
    const cols = data.fields.map((f) => `${f}_${source}`).join(",");
    const { data: row, error: readErr } = await supabase.from(meta.table).select(cols).eq("id", data.entity_id).maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!row) throw new Error("العنصر غير موجود");

    // Mark running
    await supabase.from("content_translations").upsert({
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      target_lang: target,
      status: "running",
      requested_by: userId,
      error: null,
    }, { onConflict: "entity_type,entity_id,target_lang" });

    try {
      const update: Record<string, string> = {};
      for (const field of data.fields) {
        const src = (row as Record<string, unknown>)[`${field}_${source}`] as string | null | undefined;
        if (!src || !src.trim()) continue;
        const isHtml = field === "body_html" || /html/i.test(field);
        const translated = await translateOne(apiKey, src, target, isHtml);
        update[`${field}_${target}`] = translated;
      }
      if (Object.keys(update).length === 0) {
        throw new Error("لا يوجد محتوى مصدر للترجمة");
      }
      const { error: upErr } = await supabase.from(meta.table).update(update).eq("id", data.entity_id);
      if (upErr) throw new Error(upErr.message);
      await supabase.from("content_translations").update({ status: "done", error: null }).match({
        entity_type: data.entity_type, entity_id: data.entity_id, target_lang: target,
      });
      return { ok: true, fields: Object.keys(update) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase.from("content_translations").update({ status: "error", error: msg }).match({
        entity_type: data.entity_type, entity_id: data.entity_id, target_lang: target,
      });
      throw new Error(msg);
    }
  });
