import { showError } from "@/lib/errors";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { translateContent } from "@/lib/translate.functions";
import { Sparkles } from "lucide-react";

type Status = "draft" | "scheduled" | "published";

export function ChapterEditor({ novelId, chapterId, onSaved }: { novelId: string; chapterId?: string; onSaved?: (id: string) => void }) {
  const editing = !!chapterId;
  const [num, setNum] = useState<number>(1);
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [contentAr, setContentAr] = useState("");
  const [contentEn, setContentEn] = useState("");
  const [tab, setTab] = useState<"ar" | "en">("ar");
  const [isVip, setIsVip] = useState(false);
  const [status, setStatus] = useState<Status>("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [translating, setTranslating] = useState(false);
  const translateFn = useServerFn(translateContent);

  const chQ = useQuery({
    queryKey: ["chapter-edit", chapterId],
    queryFn: async () => {
      const { data, error } = await supabase.from("chapters").select("*").eq("id", chapterId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: editing,
  });

  const nextNumQ = useQuery({
    queryKey: ["chapter-next-num", novelId],
    queryFn: async () => {
      const { data } = await supabase.from("chapters").select("chapter_number").eq("novel_id", novelId).order("chapter_number", { ascending: false }).limit(1).maybeSingle();
      return ((data as { chapter_number: number } | null)?.chapter_number ?? 0) + 1;
    },
    enabled: !editing,
  });

  useEffect(() => {
    if (editing && chQ.data) {
      const c = chQ.data as Record<string, unknown> & { chapter_number: number; title: string; content: string; is_vip: boolean; status: Status; scheduled_at: string | null };
      setNum(c.chapter_number);
      setTitleAr((c.title_ar as string) ?? c.title ?? "");
      setTitleEn((c.title_en as string) ?? "");
      setContentAr((c.content_ar as string) ?? c.content ?? "");
      setContentEn((c.content_en as string) ?? "");
      setIsVip(c.is_vip); setStatus(c.status);
      setScheduledAt(c.scheduled_at ? new Date(c.scheduled_at).toISOString().slice(0, 16) : "");
    }
    if (!editing && nextNumQ.data) setNum(nextNumQ.data);
  }, [editing, chQ.data, nextNumQ.data]);

  async function save(publishNow?: boolean) {
    if (titleAr.trim().length < 1 || contentAr.trim().length < 10) {
      toast.error("العنوان والمحتوى بالعربية مطلوبان");
      return;
    }
    setBusy(true);
    try {
      const finalStatus: Status = publishNow ? "published" : status;
      const payload: Record<string, unknown> = {
        novel_id: novelId,
        chapter_number: num,
        title_ar: titleAr.trim(),
        title_en: titleEn.trim() || null,
        content_ar: contentAr,
        content_en: contentEn.trim() ? contentEn : null,
        is_vip: isVip,
        status: finalStatus,
        scheduled_at: finalStatus === "scheduled" && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        published_at: finalStatus === "published" ? new Date().toISOString() : null,
      };
      if (editing) {
        const { error } = await supabase.from("chapters").update(payload).eq("id", chapterId!);
        if (error) throw error;
        toast.success("تم الحفظ");
      } else {
        const { data, error } = await supabase.from("chapters").insert(payload).select("id").single();
        if (error) throw error;
        toast.success("تم إنشاء الفصل");
        onSaved?.((data as { id: string }).id);
      }
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  async function aiTranslate() {
    if (!editing || !chapterId) {
      toast.error("احفظ الفصل أولاً قبل الترجمة الآلية");
      return;
    }
    const targetLang: "ar" | "en" = tab === "en" ? "en" : "ar";
    setTranslating(true);
    try {
      await translateFn({ data: { entity_type: "chapter", entity_id: chapterId, fields: ["title", "content"], target_lang: targetLang } });
      const { data } = await supabase.from("chapters").select("title_ar,title_en,content_ar,content_en").eq("id", chapterId).maybeSingle();
      if (data) {
        const r = data as Record<string, unknown>;
        setTitleAr((r.title_ar as string) ?? "");
        setTitleEn((r.title_en as string) ?? "");
        setContentAr((r.content_ar as string) ?? "");
        setContentEn((r.content_en as string) ?? "");
      }
      toast.success("تمت الترجمة");
    } catch (e) {
      showError(e);
    } finally {
      setTranslating(false);
    }
  }

  const title = tab === "ar" ? titleAr : titleEn;
  const setTitle = tab === "ar" ? setTitleAr : setTitleEn;
  const content = tab === "ar" ? contentAr : contentEn;
  const setContent = tab === "ar" ? setContentAr : setContentEn;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-6 text-xl font-black md:text-2xl">{editing ? "تعديل فصل" : "فصل جديد"}</h1>

      <div className="grid gap-4 rounded-2xl border border-border/40 bg-surface/40 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-border/60 p-0.5">
            <button type="button" onClick={() => setTab("ar")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md ${tab === "ar" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              العربية
            </button>
            <button type="button" onClick={() => setTab("en")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md ${tab === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              English
            </button>
          </div>
          <Button type="button" onClick={aiTranslate} disabled={translating || !editing} variant="outline" size="sm">
            <Sparkles className="me-1 h-3.5 w-3.5" />
            {translating ? "جاري…" : (tab === "en" ? "ترجمة AR → EN" : "ترجمة EN → AR")}
          </Button>
        </div>

        <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
          <label><div className="mb-1 text-xs font-semibold">الرقم</div>
            <input type="number" min={1} value={num} onChange={(e) => setNum(parseInt(e.target.value) || 1)} className="input" /></label>
          <label><div className="mb-1 text-xs font-semibold">{tab === "ar" ? "العنوان (عربي)" : "Title (English)"}</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" dir={tab === "ar" ? "rtl" : "ltr"} /></label>
        </div>

        <label className="block"><div className="mb-1 text-xs font-semibold">{tab === "ar" ? "المحتوى (عربي)" : "Content (English)"}</div>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={18}
            dir={tab === "ar" ? "rtl" : "ltr"}
            className="input resize-y font-[Amiri,serif] text-base leading-loose" placeholder={tab === "ar" ? "ابدأ الكتابة..." : "Start writing..."} /></label>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex items-center gap-2 rounded-md border border-border/40 bg-background/40 p-2 text-sm">
            <input type="checkbox" checked={isVip} onChange={(e) => setIsVip(e.target.checked)} />
            فصل VIP
          </label>
          <label><div className="mb-1 text-xs font-semibold">الحالة</div>
            <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="input">
              <option value="draft">مسودة</option>
              <option value="scheduled">مجدول</option>
              <option value="published">منشور</option>
            </select></label>
          {status === "scheduled" && (
            <label><div className="mb-1 text-xs font-semibold">وقت النشر</div>
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="input" /></label>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save(false)} disabled={busy} variant="secondary">حفظ</Button>
          <Button onClick={() => save(true)} disabled={busy}>حفظ ونشر</Button>
        </div>
      </div>
      <style>{`.input{width:100%;padding:0.5rem 0.75rem;border-radius:0.5rem;border:1px solid hsl(var(--input));background:hsl(var(--background)/.6);font-size:0.875rem;outline:none}.input:focus{border-color:hsl(var(--primary))}`}</style>
    </div>
  );
}
