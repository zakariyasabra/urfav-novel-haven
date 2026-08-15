import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, RotateCcw, Trash2, Clock, BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { coverUrl } from "@/lib/covers";
import { confirmDialog } from "@/components/ui/dialog-service";
import { showError } from "@/lib/errors";
import {
  fetchAuthorTrash,
  purgeExpiredTrash,
  restoreNovel,
  purgeNovel,
  restoreChapter,
  purgeChapter,
  daysLeft,
  TRASH_RETENTION_DAYS,
} from "@/lib/author-trash-api";

export const Route = createFileRoute("/_authenticated/author/trash")({
  head: () => ({
    meta: [{ title: "سلة المحذوفات — FAVNOL" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthorTrash,
});

function fmt(dt: string) {
  return new Date(dt).toLocaleString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AuthorTrash() {
  const { isAuthor, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !isAuthor) nav({ to: "/author/apply" });
  }, [loading, isAuthor, nav]);

  const trashQ = useQuery({
    queryKey: ["author-trash"],
    queryFn: async () => {
      // حذف نهائي تلقائي لكل ما تجاوز 30 يومًا
      await purgeExpiredTrash().catch(() => undefined);
      return fetchAuthorTrash();
    },
    enabled: isAuthor,
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["author-trash"] });
    qc.invalidateQueries({ queryKey: ["my-author-novels"] });
    qc.invalidateQueries({ queryKey: ["author-chapters"] });
  }

  async function onRestoreNovel(id: string, title: string) {
    try {
      await restoreNovel(id);
      toast.success(`تم استعادة "${title}" ✓`);
      refresh();
    } catch (e) {
      showError(e);
    }
  }

  async function onPurgeNovel(id: string, title: string) {
    if (
      !(await confirmDialog({
        title: "حذف نهائي",
        body: `سيتم حذف "${title}" وجميع فصولها نهائيًا. لا يمكن التراجع.`,
        confirmLabel: "حذف نهائي",
        danger: true,
      }))
    )
      return;
    try {
      await purgeNovel(id);
      toast.success("تم الحذف النهائي.");
      refresh();
    } catch (e) {
      showError(e);
    }
  }

  async function onRestoreChapter(id: string) {
    try {
      await restoreChapter(id);
      toast.success("تم استعادة الفصل ✓");
      refresh();
    } catch (e) {
      showError(e);
    }
  }

  async function onPurgeChapter(id: string) {
    if (
      !(await confirmDialog({
        title: "حذف نهائي",
        body: "سيتم حذف الفصل نهائيًا. لا يمكن التراجع.",
        confirmLabel: "حذف نهائي",
        danger: true,
      }))
    )
      return;
    try {
      await purgeChapter(id);
      toast.success("تم الحذف النهائي.");
      refresh();
    } catch (e) {
      showError(e);
    }
  }

  if (!isAuthor) return null;

  const novels = trashQ.data?.novels ?? [];
  const chapters = trashQ.data?.chapters ?? [];
  const empty = novels.length === 0 && chapters.length === 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-8" dir="rtl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-black md:text-3xl">
            <Trash2 className="h-6 w-6 text-muted-foreground" />
            سلة المحذوفات
          </h1>
          <p className="text-sm text-muted-foreground">
            العناصر المحذوفة تبقى {TRASH_RETENTION_DAYS} يومًا ثم تُحذف نهائيًا تلقائيًا.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/author">
            <ArrowLeft className="me-1 h-4 w-4" />
            استوديو الكاتب
          </Link>
        </Button>
      </header>

      {trashQ.isLoading && <div className="py-16 text-center text-muted-foreground">جارِ التحميل…</div>}

      {!trashQ.isLoading && empty && (
        <div className="rounded-2xl border border-border/40 bg-surface/40 p-12 text-center">
          <Trash2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <div className="font-bold">السلة فارغة</div>
          <p className="text-sm text-muted-foreground">لا توجد روايات أو فصول محذوفة.</p>
        </div>
      )}

      {novels.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-muted-foreground">
            <BookOpen className="h-4 w-4" /> روايات محذوفة ({novels.length})
          </div>
          <div className="grid gap-3">
            {novels.map((n) => {
              const left = daysLeft(n.deleted_at);
              return (
                <div
                  key={n.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/40 bg-surface/40 p-3"
                >
                  <img
                    src={coverUrl(n.cover_url)}
                    alt=""
                    className="h-20 w-14 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{n.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> حُذفت في {fmt(n.deleted_at)}
                      </span>
                      {n.chapters_count > 0 && <span>• {n.chapters_count} فصل</span>}
                    </div>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        left <= 3
                          ? "bg-destructive/15 text-destructive"
                          : "bg-primary/15 text-primary"
                      }`}
                    >
                      {left > 0 ? `يتبقى ${left} يوم قبل الحذف النهائي` : "سيُحذف نهائيًا اليوم"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => onRestoreNovel(n.id, n.title)}>
                      <RotateCcw className="me-1 h-4 w-4" />
                      استعادة
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onPurgeNovel(n.id, n.title)}>
                      <Trash2 className="me-1 h-4 w-4" />
                      حذف نهائي
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {chapters.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-muted-foreground">
            <FileText className="h-4 w-4" /> فصول محذوفة ({chapters.length})
          </div>
          <div className="grid gap-3">
            {chapters.map((c) => {
              const left = daysLeft(c.deleted_at);
              return (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/40 bg-surface/40 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">
                      الفصل {c.chapter_number}
                      {c.title ? ` — ${c.title}` : ""}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{c.novel_title}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> حُذف في {fmt(c.deleted_at)}
                      </span>
                    </div>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        left <= 3
                          ? "bg-destructive/15 text-destructive"
                          : "bg-primary/15 text-primary"
                      }`}
                    >
                      {left > 0 ? `يتبقى ${left} يوم قبل الحذف النهائي` : "سيُحذف نهائيًا اليوم"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => onRestoreChapter(c.id)}>
                      <RotateCcw className="me-1 h-4 w-4" />
                      استعادة
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onPurgeChapter(c.id)}>
                      <Trash2 className="me-1 h-4 w-4" />
                      حذف نهائي
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
