import { showError } from "@/lib/errors";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Tag as TagIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function TagsTab() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const q = useQuery({
    queryKey: ["admin-tags"],
    queryFn: async () => {
      const { data } = await supabase.from("tags").select("id,name_ar,slug").order("name_ar");
      return data ?? [];
    },
  });

  async function add() {
    if (!name.trim() || !slug.trim()) return toast.error("الاسم والمعرف مطلوبان");
    const { error } = await supabase.from("tags").insert({ name_ar: name.trim(), slug: slug.trim().toLowerCase() });
    if (error) return showError(error);
    toast.success("تمت الإضافة");
    setName(""); setSlug("");
    qc.invalidateQueries({ queryKey: ["admin-tags"] });
  }

  async function del(id: string) {
    if (!confirm("حذف؟")) return;
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (error) return showError(error);
    qc.invalidateQueries({ queryKey: ["admin-tags"] });
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-border/40 bg-surface/40 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم بالعربية"
          className="h-10 rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary" />
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug (english)"
          className="h-10 rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary" />
        <Button onClick={add}><Plus className="me-1 h-4 w-4" />إضافة</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(q.data ?? []).map((t) => (
          <div key={t.id} className="group inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface/40 px-3 py-1.5 text-sm">
            <TagIcon className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold">{t.name_ar}</span>
            <span className="text-xs text-muted-foreground">{t.slug}</span>
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
