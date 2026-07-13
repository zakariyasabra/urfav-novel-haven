import { showError } from "@/lib/errors";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { confirmDialog } from "@/components/ui/dialog-service";
import { NovelAnalyticsPanel } from "@/components/analytics/analytics-panel";
import { useT, usePreferences } from "@/i18n/provider";

export const Route = createFileRoute("/_authenticated/author/novels/$id")({
  head: () => ({ meta: [{ title: "Manage novel — UR Fav Novel" }, { name: "robots", content: "noindex" }] }),
  component: ManageNovel,
});

function ManageNovel() {
  const t = useT();
  const { lang } = usePreferences();
  const locale = lang === "en" ? "en-US" : "ar-EG";
  const { id } = Route.useParams();
  const { isAuthor, loading } = useAuth();
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
  if (!n && !novelQ.isLoading) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">{t("authNv.notFound")}</div>;
  if (!n) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">{t("author.loading")}</div>;

  async function togglePublish() {
    const { error } = await supabase.from("novels").update({ is_published: !n!.is_published }).eq("id", id);
    if (error) return showError(error);
    toast.success(n!.is_published ? t("authNv.unpublishedToast") : t("authNv.publishedToast"));
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
    if (error) return showError(error);
    toast.success(t("authNv.saved"));
    qc.invalidateQueries({ queryKey: ["author-novel", id] });
  }

  async function deleteChapter(chId: string) {
    if (!(await confirmDialog({ title: t("lib.confirmTitle"), body: t("authNv.ch.deleteConfirm"), confirmLabel: t("lib.confirmLabel"), danger: true }))) return;
    const { error } = await supabase.from("chapters").delete().eq("id", chId);
    if (error) return showError(error);
    qc.invalidateQueries({ queryKey: ["author-chapters", id] });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black md:text-2xl">{n.title}</h1>
          <div className="mt-1 text-xs text-muted-foreground">
            {n.is_published ? <span className="text-emerald-500">{t("authNv.published")}</span> : <span className="text-amber-500">{t("authNv.draft")}</span>}
          </div>
        </div>
        <Button size="sm" variant={n.is_published ? "secondary" : "default"} onClick={togglePublish} className="shrink-0">
          {n.is_published ? t("authNv.unpublish") : t("authNv.publish")}
        </Button>
      </header>

      <details className="mb-6 rounded-xl border border-border/40 bg-surface/40 p-4">
        <summary className="cursor-pointer text-sm font-semibold">{t("authNv.editDetails")}</summary>
        <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); saveEdits(new FormData(e.currentTarget)); }}>
          <label className="block"><div className="mb-1 text-sm font-semibold">{t("authNv.fTitle")}</div>
            <input name="title" defaultValue={n.title} className="input" required /></label>
          <label className="block"><div className="mb-1 text-sm font-semibold">{t("authNv.fAuthor")}</div>
            <input name="author" defaultValue={n.author} className="input" /></label>
          <label className="block"><div className="mb-1 text-sm font-semibold">{t("authNv.fDesc")}</div>
            <textarea name="description" defaultValue={n.description} rows={4} className="input resize-y" required /></label>
          <label className="block"><div className="mb-1 text-sm font-semibold">{t("authNv.fStatus")}</div>
            <select name="status" defaultValue={n.status} className="input">
              <option value="ongoing">{t("authNv.s.ongoing")}</option><option value="completed">{t("authNv.s.completed")}</option><option value="hiatus">{t("authNv.s.hiatus")}</option>
            </select></label>
          <Button type="submit" size="sm">{t("authNv.save")}</Button>
        </form>
      </details>
      <section className="mb-6">
        <div className="mb-3 text-sm font-bold text-muted-foreground">{t("authNv.analytics")}</div>
        <NovelAnalyticsPanel novelId={id} />
      </section>

      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2 className="truncate text-lg font-black">{t("authNv.chaptersN", { n: chaptersQ.data?.length ?? 0 })}</h2>
        <Button asChild size="sm" className="shrink-0">
          <Link to="/author/novels/$id/chapters/new" params={{ id }}><Plus className="me-1 h-4 w-4" />{t("authNv.newChapter")}</Link>
        </Button>
      </div>

      <div className="space-y-2">
        {(chaptersQ.data ?? []).map((c) => (
          <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border/40 bg-surface/30 p-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{t("authNv.ch.label", { n: c.chapter_number, t: c.title })}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {c.status === "published" && <span className="flex items-center gap-1 text-emerald-500"><CheckCircle2 className="h-3 w-3" />{t("authNv.ch.published")}</span>}
                {c.status === "draft" && <span className="flex items-center gap-1 text-muted-foreground"><FileText className="h-3 w-3" />{t("authNv.ch.draft")}</span>}
                {c.status === "scheduled" && <span className="flex items-center gap-1 text-primary"><Calendar className="h-3 w-3" />{t("authNv.ch.scheduled")} {c.scheduled_at && new Date(c.scheduled_at).toLocaleString(locale)}</span>}
                {c.is_vip && <span className="text-amber-500">{t("authNv.ch.vip")}</span>}
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
          <div className="rounded-lg border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">{t("authNv.ch.empty")}</div>
        )}
      </div>
      <style>{`.input{width:100%;padding:0.5rem 0.75rem;border-radius:0.5rem;border:1px solid hsl(var(--input));background:hsl(var(--background)/.6);font-size:0.875rem;outline:none}.input:focus{border-color:hsl(var(--primary))}`}</style>
    </div>
  );
}
