import { showError } from "@/lib/errors";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Eye,
  Pencil,
  ListOrdered,
  Trash2,
  PenLine,
  User as UserIcon,
  ExternalLink,
  Clock,
  FileText,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyAuthorNovels } from "@/lib/author-api";
import { supabase } from "@/integrations/supabase/client";
import { coverUrl } from "@/lib/covers";
import { formatViews, useTimeAgo } from "@/lib/format";
import { confirmDialog } from "@/components/ui/dialog-service";
import { trashNovel } from "@/lib/author-trash-api";

export const Route = createFileRoute("/_authenticated/author/")({
  head: () => ({
    meta: [
      { title: "Author Studio — FAVNOL" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthorDashboard,
});

type Novel = {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  status: string;
  is_published: boolean;
  views_count: number;
  rating_avg: number;
  updated_at: string;
};

function AuthorDashboard() {
  const timeAgo = useTimeAgo();
  const { isAuthor, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !isAuthor) nav({ to: "/author/apply" });
  }, [loading, isAuthor, nav]);

  const novelsQ = useQuery({
    queryKey: ["my-author-novels"],
    queryFn: fetchMyAuthorNovels,
    enabled: isAuthor,
  });

  const novels = (novelsQ.data ?? []) as Novel[];
  const published = useMemo(() => novels.filter((n) => n.is_published), [novels]);
  const drafts = useMemo(() => novels.filter((n) => !n.is_published), [novels]);
  const latest = novels[0]; // ordered by updated_at desc

  // Latest chapter of the "continue writing" novel — pick most recently edited chapter
  const continueQ = useQuery({
    queryKey: ["author-continue", latest?.id],
    queryFn: async () => {
      if (!latest) return null;
      const { data, error } = await supabase
        .from("chapters")
        .select("id,chapter_number,title,status,updated_at")
        .eq("novel_id", latest.id)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as null | {
        id: string;
        chapter_number: number;
        title: string;
        status: string;
        updated_at: string;
      };
    },
    enabled: !!latest,
  });

  // Recent activity across the author's novels
  const activityQ = useQuery({
    queryKey: ["author-recent-activity", novels.map((n) => n.id).join(",")],
    queryFn: async () => {
      if (novels.length === 0) return [] as Array<{
        kind: "chapter" | "novel";
        id: string;
        novel_id: string;
        novel_title: string;
        title: string;
        status?: string;
        at: string;
      }>;
      const ids = novels.map((n) => n.id);
      const { data, error } = await supabase
        .from("chapters")
        .select("id,novel_id,chapter_number,title,status,updated_at,published_at")
        .is("deleted_at", null)
        .in("novel_id", ids)
        .order("updated_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      const byId = new Map(novels.map((n) => [n.id, n.title]));
      return (data ?? []).map((c) => {
        const cc = c as {
          id: string;
          novel_id: string;
          chapter_number: number;
          title: string;
          status: string;
          updated_at: string;
          published_at: string | null;
        };
        return {
          kind: "chapter" as const,
          id: cc.id,
          novel_id: cc.novel_id,
          novel_title: byId.get(cc.novel_id) ?? "",
          title: `الفصل ${cc.chapter_number}${cc.title ? ` — ${cc.title}` : ""}`,
          status: cc.status,
          at: cc.updated_at,
        };
      });
    },
    enabled: novels.length > 0,
  });

  async function deleteNovel(id: string, title: string) {
    if (
      !(await confirmDialog({
        title: "نقل إلى سلة المحذوفات",
        body: `سيتم نقل "${title}" وجميع فصولها إلى سلة المحذوفات، ويمكنك استعادتها خلال 30 يومًا.`,
        confirmLabel: "نقل إلى السلة",
        danger: true,
      }))
    )
      return;
    try {
      await trashNovel(id);
    } catch (error) {
      return showError(error);
    }
    toast.success("تم نقل الرواية إلى سلة المحذوفات.");
    qc.invalidateQueries({ queryKey: ["my-author-novels"] });
  }

  if (!isAuthor) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black md:text-3xl">استوديو الكاتب</h1>
          <p className="text-sm text-muted-foreground">
            ركّز على الكتابة — كل شيء آخر يمكن الانتظار.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/author/trash">
              <Trash2 className="me-1 h-4 w-4" />
              سلة المحذوفات
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/author/profile">
              <UserIcon className="me-1 h-4 w-4" />
              ملفي الشخصي
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/author/novels/new">
              <Plus className="me-1 h-4 w-4" />
              رواية جديدة
            </Link>
          </Button>
        </div>
      </header>

      {/* Continue Writing hero */}
      {latest && (
        <section className="mb-8 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-surface/40 to-background p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-[128px_minmax(0,1fr)_auto] md:items-center md:gap-6">
            <img
              src={coverUrl(latest.cover_url)}
              alt=""
              className="h-40 w-28 rounded-lg object-cover shadow-lg md:h-44 md:w-32"
            />
            <div className="min-w-0">
              <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                <Sparkles className="h-3 w-3" /> متابعة الكتابة
              </div>
              <h2 className="truncate text-xl font-black md:text-2xl">{latest.title}</h2>
              {continueQ.data ? (
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  آخر عمل: الفصل {continueQ.data.chapter_number}
                  {continueQ.data.title ? ` — ${continueQ.data.title}` : ""} ·{" "}
                  <span
                    className={
                      continueQ.data.status === "published"
                        ? "text-emerald-500"
                        : "text-amber-500"
                    }
                  >
                    {continueQ.data.status === "published" ? "منشور" : "مسودة"}
                  </span>{" "}
                  · {timeAgo(continueQ.data.updated_at)}
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  لم تكتب فصلاً بعد — ابدأ الفصل الأول الآن.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch">
              {continueQ.data ? (
                <Button asChild size="lg" className="whitespace-nowrap">
                  <Link
                    to="/author/novels/$id/chapters/$chapterId"
                    params={{ id: latest.id, chapterId: continueQ.data.id }}
                  >
                    <PenLine className="me-2 h-4 w-4" />
                    متابعة الكتابة
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="whitespace-nowrap">
                  <Link to="/author/novels/$id/chapters/new" params={{ id: latest.id }}>
                    <Plus className="me-2 h-4 w-4" />
                    اكتب الفصل الأول
                  </Link>
                </Button>
              )}
              <Button asChild size="sm" variant="outline">
                <Link to="/author/novels/$id" params={{ id: latest.id }}>
                  <Pencil className="me-1 h-3.5 w-3.5" />
                  إدارة الرواية
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {novelsQ.isLoading && (
        <div className="py-16 text-center text-muted-foreground">جارِ التحميل…</div>
      )}

      {!novelsQ.isLoading && novels.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-surface/30 p-12 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <div className="mb-2 text-lg font-bold">لا روايات بعد</div>
          <p className="mb-4 text-sm text-muted-foreground">ابدأ بكتابة قصتك الأولى.</p>
          <Button asChild size="lg">
            <Link to="/author/novels/new">
              <Plus className="me-1 h-4 w-4" />
              إنشاء رواية
            </Link>
          </Button>
        </div>
      )}

      {/* My Novels grid (published + all) */}
      {novels.length > 0 && (
        <section className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-black md:text-xl">رواياتي</h2>
            <span className="text-xs text-muted-foreground">{novels.length} رواية</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(published.length > 0 ? published : novels).map((n) => (
              <NovelCard key={n.id} n={n} onDelete={() => deleteNovel(n.id, n.title)} />
            ))}
          </div>
        </section>
      )}

      {/* Drafts */}
      {drafts.length > 0 && (
        <section className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-black md:text-xl">المسودات</h2>
            <span className="text-xs text-muted-foreground">{drafts.length} مسودة</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {drafts.map((n) => (
              <NovelCard key={n.id} n={n} onDelete={() => deleteNovel(n.id, n.title)} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      {activityQ.data && activityQ.data.length > 0 && (
        <section className="mb-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-black md:text-xl">النشاط الأخير</h2>
          </div>
          <ul className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/40 bg-surface/30">
            {activityQ.data.map((a) => (
              <li key={a.id}>
                <Link
                  to="/author/novels/$id/chapters/$chapterId"
                  params={{ id: a.novel_id, chapterId: a.id }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface/60"
                >
                  {a.status === "published" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0 text-amber-500" />
                  )}
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-semibold">{a.title}</span>
                    <span className="text-muted-foreground"> · {a.novel_title}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    <Clock className="me-1 inline h-3 w-3" />
                    {timeAgo(a.at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function NovelCard({ n, onDelete }: { n: Novel; onDelete: () => void }) {
  const timeAgo = useTimeAgo();
  return (
    <article className="group overflow-hidden rounded-2xl border border-border/40 bg-surface/40 transition-colors hover:border-primary/40">
      <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 p-3">
        <Link
          to="/author/novels/$id"
          params={{ id: n.id }}
          className="block h-32 w-24 shrink-0 overflow-hidden rounded-md"
        >
          <img
            src={coverUrl(n.cover_url)}
            alt=""
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </Link>
        <div className="min-w-0">
          <Link
            to="/author/novels/$id"
            params={{ id: n.id }}
            className="line-clamp-2 text-sm font-bold hover:text-primary md:text-base"
          >
            {n.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <span
              className={
                n.is_published
                  ? "font-semibold text-emerald-500"
                  : "font-semibold text-amber-500"
              }
            >
              {n.is_published ? "منشور" : "مسودة"}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatViews(n.views_count)}
            </span>
            <span>· {timeAgo(n.updated_at)}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 border-t border-border/40 bg-background/30 p-2">
        <Button asChild size="sm" variant="default" className="h-8 text-xs">
          <Link to="/author/novels/$id/chapters/new" params={{ id: n.id }}>
            <PenLine className="me-1 h-3.5 w-3.5" />
            متابعة
          </Link>
        </Button>
        <Button asChild size="sm" variant="secondary" className="h-8 text-xs">
          <Link to="/author/novels/$id" params={{ id: n.id }}>
            <ListOrdered className="me-1 h-3.5 w-3.5" />
            الفصول
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="h-8 text-xs">
          <Link to="/author/novels/$id" params={{ id: n.id }}>
            <Pencil className="me-1 h-3.5 w-3.5" />
            تعديل
          </Link>
        </Button>
        {n.is_published ? (
          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
            <Link to="/novels/$slug" params={{ slug: n.slug }}>
              <ExternalLink className="me-1 h-3.5 w-3.5" />
              عام
            </Link>
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="me-1 h-3.5 w-3.5" />
            حذف
          </Button>
        )}
        {n.is_published && (
          <Button
            size="sm"
            variant="ghost"
            className="col-span-2 h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="me-1 h-3.5 w-3.5" />
            حذف الرواية
          </Button>
        )}
      </div>
    </article>
  );
}
