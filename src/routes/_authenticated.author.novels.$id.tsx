import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/author/novels/$id")({
  head: () => ({ meta: [{ title: "إدارة الرواية — UR Fav Novel" }, { name: "robots", content: "noindex" }] }),
  component: ManageNovel,
});

function ManageNovel() {
  const { id } = Route.useParams();
  const { user, isAuthor, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  useEffect(() => { if (!loading && !isAuthor) nav({ to: "/author/apply" }); }, [loading, isAuthor]);

  const novelQ = useQuery({
    queryKey: ["author-novel", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("novels").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const chaptersQ = useQuery({
    queryKey: ["author-chapters", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("chapters")
        .select("id,chapter_number,title,status,scheduled_at,published_at,is_vip,views_count")
        .eq("novel_id", id).order("chapter_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const n = novelQ.data as null | { id: string; title: string; description: string; author: string; status: string; is_published: boolean; owner_id: string };
  if (!n && !novelQ.isLoading) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">لم يتم العثور على الرواية</div>;
  if (!n) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">جاري التحميل...</div>;

  async function togglePublish() {
    const { error } = await supabase.from("novels").update({ is_published: !n!.is_published }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(n!.is_published ? "تم إخفاء الرواية" : "تم نشر الرواية");
    qc.invalidateQueries({ queryKey: ["author-novel", id] });
  }

  async function saveEdits(form: FormData) {
    const patch = {
      title: String(form.get("title") ?? "").trim(),
      author: String(form.get("author") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      status: String(form.get("status") ?? "ongoing") as "ongoing" | "completed" | "hiatus",
    };
    const { error } = await supabase.from("novels").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ");
    qc.invalidateQueries({ queryKey: ["author-novel", id] });
  }

  async function deleteChapter(chId: string) {
    if (!confirm("حذف هذا الفصل نهائياً؟")) return;
    const { error } = await supabase.from("chapters").delete().eq("id", chId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["author-chapters", id] });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black md:text-2xl">{n.title}</h1>
          <div className="mt-1 text-xs text-muted-foreground">
            {n.is_published ? <span className="text-emerald-500">منشورة</span> : <span className="text-amber-500">مسودة (غير منشورة)</span>}
          </div>
        </div>
        <Button size="sm" variant={n.is_published ? "secondary" : "default"} onClick={togglePublish} className="shrink-0">
          {n.is_published ? "إلغاء النشر" : "نشر"}
        </Button>
      </header>

      <details className="mb-6 rounded-xl border border-border/40 bg-surface/40 p-4">
        <summary className="cursor-pointer text-sm font-semibold">تعديل تفاصيل الرواية</summary>
        <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); saveEdits(new FormData(e.currentTarget)); }}>
          <label className="block"><div className="mb-1 text-sm font-semibold">العنوان</div>
            <input name="title" defaultValue={n.title} className="input" required /></label>
          <label className="block"><div className="mb-1 text-sm font-semibold">المؤلف</div>
            <input name="author" defaultValue={n.author} className="input" /></label>
          <label className="block"><div className="mb-1 text-sm font-semibold">الوصف</div>
            <textarea name="description" defaultValue={n.description} rows={4} className="input resize-y" required /></label>
          <label className="block"><div className="mb-1 text-sm font-semibold">الحالة</div>
            <select name="status" defaultValue={n.status} className="input">
              <option value="ongoing">مستمرة</option><option value="completed">مكتملة</option><option value="hiatus">متوقفة</option>
            </select></label>
          <Button type="submit" size="sm">حفظ</Button>
        </form>
      </details>

      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2 className="truncate text-lg font-black">الفصول ({chaptersQ.data?.length ?? 0})</h2>
        <Button asChild size="sm" className="shrink-0">
          <Link to="/author/novels/$id/chapters/new" params={{ id }}><Plus className="me-1 h-4 w-4" />فصل جديد</Link>
        </Button>
      </div>

      <div className="space-y-2">
        {(chaptersQ.data ?? []).map((c) => (
          <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border/40 bg-surface/30 p-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">الفصل {c.chapter_number}: {c.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {c.status === "published" && <span className="flex items-center gap-1 text-emerald-500"><CheckCircle2 className="h-3 w-3" />منشور</span>}
                {c.status === "draft" && <span className="flex items-center gap-1 text-muted-foreground"><FileText className="h-3 w-3" />مسودة</span>}
                {c.status === "scheduled" && <span className="flex items-center gap-1 text-primary"><Calendar className="h-3 w-3" />مجدول {c.scheduled_at && new Date(c.scheduled_at).toLocaleString("ar")}</span>}
                {c.is_vip && <span className="text-amber-500">VIP</span>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                <Link to="/author/novels/$id/chapters/$chapterId" params={{ id, chapterId: c.id }}><Pencil className="h-4 w-4" /></Link>
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteChapter(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {chaptersQ.data?.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">لا توجد فصول بعد.</div>
        )}
      </div>
      <style>{`.input{width:100%;padding:0.5rem 0.75rem;border-radius:0.5rem;border:1px solid hsl(var(--input));background:hsl(var(--background)/.6);font-size:0.875rem;outline:none}.input:focus{border-color:hsl(var(--primary))}`}</style>
    </div>
  );
}
