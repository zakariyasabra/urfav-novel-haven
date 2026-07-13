import { showError } from "@/lib/errors";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Tag as TagIcon, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/ui/dialog-service";
import { useServerFn } from "@tanstack/react-start";
import { translateContent } from "@/lib/translate.functions";

export function TagsTab() {
  const qc = useQueryClient();
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const translateFn = useServerFn(translateContent);
  const [translatingId, setTranslatingId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-tags"],
    queryFn: async () => {
      const { data } = await supabase.from("tags").select("id,name_ar,name_en,slug").order("name_ar");
      return (data ?? []) as { id: string; name_ar: string; name_en: string | null; slug: string }[];
    },
  });

  async function add() {
    if (!nameAr.trim() || !slug.trim()) return toast.error("الاسم العربي والمعرف مطلوبان");
    const { error } = await supabase.from("tags").insert({
      name_ar: nameAr.trim(),
      name_en: nameEn.trim() || null,
      slug: slug.trim().toLowerCase(),
    });
    if (error) return showError(error);
    toast.success("تمت الإضافة");
    setNameAr(""); setNameEn(""); setSlug("");
    qc.invalidateQueries({ queryKey: ["admin-tags"] });
  }

  async function updateEn(id: string, value: string) {
    const { error } = await supabase.from("tags").update({ name_en: value.trim() || null }).eq("id", id);
    if (error) return showError(error);
    qc.invalidateQueries({ queryKey: ["admin-tags"] });
  }

  async function autoTranslate(id: string) {
    setTranslatingId(id);
    try {
      await translateFn({ data: { entity_type: "tag", entity_id: id, fields: ["name"], target_lang: "en" } });
      toast.success("تمت الترجمة");
      qc.invalidateQueries({ queryKey: ["admin-tags"] });
    } catch (e) { showError(e); }
    finally { setTranslatingId(null); }
  }

  async function del(id: string) {
    if (!(await confirmDialog({ title: "تأكيد", body: "حذف؟", confirmLabel: "تأكيد", danger: true }))) return;
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (error) return showError(error);
    qc.invalidateQueries({ queryKey: ["admin-tags"] });
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-border/40 bg-surface/40 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="الاسم بالعربية" dir="rtl"
          className="h-10 rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary" />
        <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Name (English)" dir="ltr"
          className="h-10 rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary" />
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug"
          className="h-10 rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary" />
        <Button onClick={add}><Plus className="me-1 h-4 w-4" />إضافة</Button>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {(q.data ?? []).map((t) => (
          <div key={t.id} className="group grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-lg border border-border/60 bg-surface/40 px-3 py-2 text-sm">
            <TagIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="truncate font-semibold">{t.name_ar}</div>
              <input
                defaultValue={t.name_en ?? ""}
                onBlur={(e) => { if (e.currentTarget.value !== (t.name_en ?? "")) updateEn(t.id, e.currentTarget.value); }}
                placeholder="English name…"
                dir="ltr"
                className="mt-1 h-7 w-full rounded border border-input bg-background/60 px-2 text-xs outline-none focus:border-primary"
              />
              <div className="mt-1 text-[10px] text-muted-foreground">{t.slug}</div>
            </div>
            <button onClick={() => autoTranslate(t.id)} disabled={translatingId === t.id}
              className="grid h-7 w-7 place-items-center rounded-full text-primary hover:bg-primary/10 disabled:opacity-50"
              title="ترجمة AR → EN"><Sparkles className="h-3.5 w-3.5" /></button>
            <button onClick={() => del(t.id)} className="opacity-0 transition-opacity group-hover:opacity-100" aria-label="حذف">
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </button>
          </div>
        ))}
        {q.data?.length === 0 && <div className="text-sm text-muted-foreground">لا وسوم بعد.</div>}
      </div>
    </div>
  );
}
