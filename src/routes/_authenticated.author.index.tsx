import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Plus, Eye, Star, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyAuthorNovels } from "@/lib/author-api";
import { coverUrl } from "@/lib/covers";
import { statusLabel, formatViews } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/author/")({
  head: () => ({ meta: [{ title: "لوحة الكاتب — UR Fav Novel" }, { name: "robots", content: "noindex" }] }),
  component: AuthorDashboard,
});

function AuthorDashboard() {
  const { isAuthor, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && !isAuthor) nav({ to: "/author/apply" }); }, [loading, isAuthor]);

  const novelsQ = useQuery({ queryKey: ["my-author-novels"], queryFn: fetchMyAuthorNovels, enabled: isAuthor });

  if (!isAuthor) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black md:text-3xl">لوحة الكاتب</h1>
          <p className="text-sm text-muted-foreground">أدر رواياتك، الفصول، والمسودات.</p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link to="/author/novels/new"><Plus className="me-1 h-4 w-4" />رواية جديدة</Link>
        </Button>
      </header>

      {novelsQ.isLoading ? (
        <div className="py-12 text-center text-muted-foreground">جاري التحميل...</div>
      ) : (novelsQ.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-surface/30 p-12 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <div className="mb-2 text-lg font-bold">لا توجد روايات بعد</div>
          <p className="mb-4 text-sm text-muted-foreground">ابدأ بإنشاء روايتك الأولى ونشرها للقراء.</p>
          <Button asChild><Link to="/author/novels/new">إنشاء رواية</Link></Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {(novelsQ.data ?? []).map((n) => (
            <div key={n.id} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-border/40 bg-surface/40 p-3">
              <img src={coverUrl(n.cover_url)} alt="" className="h-20 w-16 shrink-0 rounded-md object-cover" />
              <div className="min-w-0">
                <div className="truncate font-bold">{n.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{statusLabel(n.status)}</span>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatViews(n.views_count)}</span>
                  <span className="flex items-center gap-1"><Star className="h-3 w-3" />{Number(n.rating_avg).toFixed(1)}</span>
                  {!n.is_published && <span className="flex items-center gap-1 text-amber-500"><FileText className="h-3 w-3" />غير منشورة</span>}
                </div>
              </div>
              <Button asChild size="sm" variant="secondary" className="shrink-0">
                <Link to="/author/novels/$id" params={{ id: n.id }}>إدارة</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
