import { showError } from "@/lib/errors";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  FileText,
  CheckCircle2,
  Copy,
  Eye,
  Send,
  EyeOff,
  Info,
  Image as ImageIcon,
  BarChart3,
  Settings as SettingsIcon,
  ListOrdered,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { confirmDialog } from "@/components/ui/dialog-service";
import { NovelAnalyticsPanel } from "@/components/analytics/analytics-panel";
import { ImageUploader } from "@/components/image-uploader";
import { coverUrl as coverUrlFor } from "@/lib/covers";
import { usePreferences } from "@/i18n/provider";

export const Route = createFileRoute("/_authenticated/author/novels/$id/")({
  head: () => ({
    meta: [{ title: "إدارة الرواية — FAVNOL" }, { name: "robots", content: "noindex" }],
  }),
  component: ManageNovel,
});

type TabKey = "chapters" | "info" | "cover" | "settings" | "analytics";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "chapters", label: "الفصول", icon: ListOrdered },
  { key: "info", label: "المعلومات", icon: Info },
  { key: "cover", label: "الغلاف", icon: ImageIcon },
  { key: "settings", label: "الإعدادات", icon: SettingsIcon },
  { key: "analytics", label: "الإحصاءات", icon: BarChart3 },
];

function ManageNovel() {
  const { lang } = usePreferences();
  const locale = lang === "en" ? "en-US" : "ar-EG";
  const { id } = Route.useParams();
  const { isAuthor, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("chapters");

  useEffect(() => {
    if (!loading && !isAuthor) nav({ to: "/author/apply" });
  }, [loading, isAuthor, nav]);

  const novelQ = useQuery({
    queryKey: ["author-novel", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("novels")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const chaptersQ = useQuery({
    queryKey: ["author-chapters", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapters")
        .select(
          "id,chapter_number,title,title_ar,title_en,content,content_ar,content_en,status,scheduled_at,published_at,is_vip,coin_price,views_count,cover_url,updated_at",
        )
        .eq("novel_id", id)
        .order("chapter_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const n = novelQ.data as null | {
    id: string;
    title: string;
    description: string;
    author: string;
    status: string;
    is_published: boolean;
    owner_id: string;
    cover_url: string | null;
    slug: string;
  };

  if (!n && !novelQ.isLoading)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
        لم يتم العثور على الرواية.
      </div>
    );
  if (!n)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
        جارِ التحميل…
      </div>
    );

  async function togglePublish() {
    const { error } = await supabase
      .from("novels")
      .update({ is_published: !n!.is_published })
      .eq("id", id);
    if (error) return showError(error);
    toast.success(n!.is_published ? "تم إلغاء نشر الرواية." : "تم نشر الرواية ✓");
    qc.invalidateQueries({ queryKey: ["author-novel", id] });
    qc.invalidateQueries({ queryKey: ["my-author-novels"] });
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
    toast.success("تم الحفظ.");
    qc.invalidateQueries({ queryKey: ["author-novel", id] });
    qc.invalidateQueries({ queryKey: ["my-author-novels"] });
  }

  async function deleteNovel() {
    if (
      !(await confirmDialog({
        title: "حذف الرواية",
        body: `سيتم حذف "${n!.title}" وجميع فصولها. هذا الإجراء لا يمكن التراجع عنه.`,
        confirmLabel: "حذف نهائي",
        danger: true,
      }))
    )
      return;
    const { error } = await supabase.from("novels").delete().eq("id", id);
    if (error) return showError(error);
    toast.success("تم حذف الرواية.");
    nav({ to: "/author" });
  }

  async function deleteChapter(chId: string) {
    if (
      !(await confirmDialog({
        title: "حذف الفصل",
        body: "هل أنت متأكد من حذف هذا الفصل؟ لا يمكن التراجع.",
        confirmLabel: "حذف",
        danger: true,
      }))
    )
      return;
    const { error } = await supabase.from("chapters").delete().eq("id", chId);
    if (error) return showError(error);
    qc.invalidateQueries({ queryKey: ["author-chapters", id] });
  }

  async function updateCover(url: string | null) {
    const { error } = await (supabase as unknown as {
      from: (t: string) => { update: (v: object) => { eq: (c: string, v: string) => Promise<{ error: unknown }> } };
    })
      .from("novels")
      .update({ cover_url: url })
      .eq("id", id);
    if (error) {
      showError(error);
      return;
    }
    toast.success("تم حفظ الغلاف.");
    qc.invalidateQueries({ queryKey: ["author-novel", id] });
  }

  async function duplicateChapter(chId: string) {
    const src = (chaptersQ.data ?? []).find((c) => (c as { id: string }).id === chId) as
      | (Record<string, unknown> & {
          chapter_number: number;
          title: string;
          title_ar: string | null;
          title_en: string | null;
          content: string;
          content_ar: string | null;
          content_en: string | null;
          is_vip: boolean;
          coin_price: number | null;
          cover_url: string | null;
        })
      | undefined;
    if (!src) return;
    const maxNum = Math.max(
      0,
      ...(chaptersQ.data ?? []).map((c) => (c as { chapter_number: number }).chapter_number),
    );
    const { error } = await (supabase as unknown as {
      from: (t: string) => { insert: (v: object) => Promise<{ error: unknown }> };
    })
      .from("chapters")
      .insert({
        novel_id: id,
        chapter_number: maxNum + 1,
        title: `${src.title} (نسخة)`,
        title_ar: src.title_ar ? `${src.title_ar} (نسخة)` : null,
        title_en: src.title_en ? `${src.title_en} (Copy)` : null,
        content: src.content ?? "",
        content_ar: src.content_ar ?? null,
        content_en: src.content_en ?? null,
        status: "draft",
        is_vip: src.is_vip ?? false,
        coin_price: src.coin_price ?? 0,
        cover_url: src.cover_url ?? null,
      });
    if (error) return showError(error);
    toast.success("تم إنشاء نسخة من الفصل.");
    qc.invalidateQueries({ queryKey: ["author-chapters", id] });
  }

  async function toggleChapterPublish(chId: string, current: string) {
    const publishing = current !== "published";
    const chapter = (chaptersQ.data ?? []).find((c) => (c as { id: string }).id === chId) as
      | { title?: string | null; content?: string | null }
      | undefined;
    if (publishing) {
      const hasTitle = !!chapter?.title?.trim();
      const hasContent = (chapter?.content ?? "").replace(/<[^>]*>/g, "").trim().length >= 10;
      if (!hasTitle || !hasContent) {
        toast.error("أكمل عنوان الفصل ومحتوى لا يقل عن 10 أحرف قبل النشر.");
        return;
      }
    }
    const { error } = await (supabase as unknown as {
      from: (t: string) => {
        update: (v: object) => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
      };
    })
      .from("chapters")
      .update({
        status: publishing ? "published" : "draft",
        published_at: publishing ? new Date().toISOString() : null,
      })
      .eq("id", chId);
    if (error) return showError(error);
    toast.success(publishing ? "تم نشر الفصل ✓" : "تم إلغاء نشر الفصل.");
    qc.invalidateQueries({ queryKey: ["author-chapters", id] });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Back + Header */}
      <div className="mb-4">
        <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
          <Link to="/author">
            <ArrowLeft className="me-1 h-4 w-4" />
            استوديو الكاتب
          </Link>
        </Button>
      </div>

      <header className="mb-6 grid grid-cols-[80px_minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[112px_minmax(0,1fr)_auto] md:gap-4">
        <img
          src={coverUrlFor(n.cover_url)}
          alt=""
          className="h-28 w-20 shrink-0 rounded-lg object-cover md:h-40 md:w-28"
        />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black md:text-2xl">{n.title}</h1>
          <div className="mt-1 text-xs">
            {n.is_published ? (
              <span className="font-semibold text-emerald-500">منشور</span>
            ) : (
              <span className="font-semibold text-amber-500">مسودة</span>
            )}
            <span className="text-muted-foreground">
              {" "}
              · {chaptersQ.data?.length ?? 0} فصل
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {n.is_published && (
              <Button asChild size="sm" variant="outline">
                <Link to="/novels/$slug" params={{ slug: n.slug }}>
                  <Eye className="me-1 h-3.5 w-3.5" />
                  عرض عام
                </Link>
              </Button>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant={n.is_published ? "secondary" : "default"}
          onClick={togglePublish}
          className="shrink-0"
        >
          {n.is_published ? "إلغاء النشر" : "نشر"}
        </Button>
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border/40">
        {TABS.map((tt) => {
          const Icon = tt.icon;
          const active = tab === tt.key;
          return (
            <button
              key={tt.key}
              onClick={() => setTab(tt.key)}
              className={
                "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors " +
                (active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              <Icon className="h-4 w-4" />
              {tt.label}
            </button>
          );
        })}
      </div>

      {/* CHAPTERS */}
      {tab === "chapters" && (
        <>
          <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <h2 className="truncate text-lg font-black">
              الفصول ({chaptersQ.data?.length ?? 0})
            </h2>
            <Button asChild size="sm" className="shrink-0">
              <Link to="/author/novels/$id/chapters/new" params={{ id }}>
                <Plus className="me-1 h-4 w-4" />
                فصل جديد
              </Link>
            </Button>
          </div>

          <div className="space-y-2">
            {(chaptersQ.data ?? []).map((c) => {
              const chap = c as unknown as {
                id: string;
                chapter_number: number;
                title: string;
                content: string | null;
                status: string;
                scheduled_at: string | null;
                is_vip: boolean;
                cover_url: string | null;
                updated_at: string;
              };
              const isScheduledLive =
                chap.status === "scheduled" &&
                !!chap.scheduled_at &&
                new Date(chap.scheduled_at).getTime() <= Date.now();
              const effectiveStatus = isScheduledLive ? "published" : chap.status;
              const canPublishChapter =
                !!chap.title?.trim() &&
                (chap.content ?? "").replace(/<[^>]*>/g, "").trim().length >= 10;
              return (
                <div
                  key={chap.id}
                  className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border/40 bg-surface/30 p-3"
                >
                  {chap.cover_url ? (
                    <img
                      src={coverUrlFor(chap.cover_url)}
                      alt=""
                      className="h-16 w-12 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="grid h-16 w-12 shrink-0 place-items-center rounded bg-primary/10 text-xs font-black text-primary">
                      {chap.chapter_number}
                    </div>
                  )}
                  <div className="min-w-0">
                    <Link
                      to="/author/novels/$id/chapters/$chapterId"
                      params={{ id, chapterId: chap.id }}
                      className="block truncate text-sm font-bold hover:text-primary"
                    >
                      الفصل {chap.chapter_number}
                      {chap.title ? ` — ${chap.title}` : ""}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {effectiveStatus === "published" && (
                        <span className="flex items-center gap-1 text-emerald-500">
                          <CheckCircle2 className="h-3 w-3" />
                          {isScheduledLive ? "منشور الآن" : "منشور"}
                        </span>
                      )}
                      {effectiveStatus === "draft" && (
                        <span className="flex items-center gap-1 text-amber-500">
                          <FileText className="h-3 w-3" />
                          مسودة
                        </span>
                      )}
                      {effectiveStatus === "scheduled" && (
                        <span className="flex items-center gap-1 text-sky-500">
                          <Calendar className="h-3 w-3" />
                          مجدول{" "}
                          {chap.scheduled_at &&
                            new Date(chap.scheduled_at).toLocaleString(locale)}
                        </span>
                      )}
                      {chap.is_vip && <span className="text-amber-500">VIP</span>}
                      {chap.updated_at && (
                        <span className="opacity-70">
                          · {new Date(chap.updated_at).toLocaleDateString(locale)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {effectiveStatus === "published" && n.slug && (
                      <Button
                        asChild
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title="معاينة"
                      >
                        <Link
                          to="/novels/$slug/$chapter"
                          params={{ slug: n.slug, chapter: String(chap.chapter_number) }}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    <Button
                      asChild
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="تحرير"
                    >
                      <Link
                        to="/author/novels/$id/chapters/$chapterId"
                        params={{ id, chapterId: chap.id }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-8 w-8 ${effectiveStatus === "published" ? "text-amber-500" : "text-emerald-500"}`}
                      title={effectiveStatus === "published" ? "إلغاء النشر" : canPublishChapter ? "نشر" : "أكمل الفصل قبل النشر"}
                      disabled={effectiveStatus !== "published" && !canPublishChapter}
                      onClick={() => toggleChapterPublish(chap.id, effectiveStatus)}
                    >
                      {effectiveStatus === "published" ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="تكرار"
                      onClick={() => duplicateChapter(chap.id)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      title="حذف"
                      onClick={() => deleteChapter(chap.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {chaptersQ.data?.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/60 bg-surface/30 p-10 text-center">
                <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <div className="mb-2 text-base font-bold">لا فصول بعد</div>
                <p className="mb-4 text-sm text-muted-foreground">
                  ابدأ بكتابة الفصل الأول من روايتك.
                </p>
                <Button asChild>
                  <Link to="/author/novels/$id/chapters/new" params={{ id }}>
                    <Plus className="me-1 h-4 w-4" />
                    إنشاء الفصل الأول
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* INFO */}
      {tab === "info" && (
        <form
          className="space-y-4 rounded-2xl border border-border/40 bg-surface/40 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            saveEdits(new FormData(e.currentTarget));
          }}
        >
          <label className="block">
            <div className="mb-1 text-sm font-semibold">العنوان</div>
            <input name="title" defaultValue={n.title} className="input" required />
          </label>
          <label className="block">
            <div className="mb-1 text-sm font-semibold">المؤلف</div>
            <input name="author" defaultValue={n.author} className="input" />
          </label>
          <label className="block">
            <div className="mb-1 text-sm font-semibold">الوصف</div>
            <textarea
              name="description"
              defaultValue={n.description}
              rows={6}
              className="input resize-y"
              required
            />
          </label>
          <label className="block">
            <div className="mb-1 text-sm font-semibold">الحالة</div>
            <select name="status" defaultValue={n.status} className="input">
              <option value="ongoing">جارية</option>
              <option value="completed">مكتملة</option>
              <option value="hiatus">متوقفة مؤقتاً</option>
            </select>
          </label>
          <Button type="submit">حفظ التغييرات</Button>
        </form>
      )}

      {/* COVER */}
      {tab === "cover" && (
        <div className="rounded-2xl border border-border/40 bg-surface/40 p-5">
          <ImageUploader
            value={n.cover_url}
            onChange={updateCover}
            folder={`novel-${id}`}
            aspect="cover"
            deleteOnRemove
            label="غلاف الرواية"
            hint="نسبة موصى بها 2:3 — بحد أقصى 5MB."
          />
        </div>
      )}

      {/* SETTINGS */}
      {tab === "settings" && (
        <div className="space-y-4 rounded-2xl border border-border/40 bg-surface/40 p-5">
          <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 p-4">
            <div>
              <div className="text-sm font-bold">حالة النشر</div>
              <p className="text-xs text-muted-foreground">
                {n.is_published
                  ? "الرواية مرئية للقراء."
                  : "الرواية مخفية عن القراء."}
              </p>
            </div>
            <Button
              size="sm"
              variant={n.is_published ? "outline" : "default"}
              onClick={togglePublish}
            >
              {n.is_published ? "إلغاء النشر" : "نشر الآن"}
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/5 p-4">
            <div>
              <div className="text-sm font-bold text-destructive">حذف الرواية</div>
              <p className="text-xs text-muted-foreground">
                يحذف الرواية وجميع فصولها نهائياً.
              </p>
            </div>
            <Button size="sm" variant="destructive" onClick={deleteNovel}>
              <Trash2 className="me-1 h-3.5 w-3.5" />
              حذف
            </Button>
          </div>
        </div>
      )}

      {/* ANALYTICS */}
      {tab === "analytics" && (
        <div className="rounded-2xl border border-border/40 bg-surface/40 p-5">
          <NovelAnalyticsPanel novelId={id} />
        </div>
      )}

      <style>{`.input{width:100%;padding:0.5rem 0.75rem;border-radius:0.5rem;border:1px solid hsl(var(--input));background:hsl(var(--background)/.6);font-size:0.875rem;outline:none}.input:focus{border-color:hsl(var(--primary))}`}</style>
    </div>
  );
}
