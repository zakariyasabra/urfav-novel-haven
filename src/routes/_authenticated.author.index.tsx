import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Plus, Eye, Star, FileText, Coins, Gift, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyAuthorNovels } from "@/lib/author-api";
import { fetchMyAuthorEarnings, fetchMyEarningsSeries, fetchGiftsReceived } from "@/lib/monetization-api";
import { coverUrl } from "@/lib/covers";
import { statusLabel, formatViews, timeAgoAr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/author/")({
  head: () => ({ meta: [{ title: "لوحة الكاتب — UR Fav Novel" }, { name: "robots", content: "noindex" }] }),
  component: AuthorDashboard,
});

function AuthorDashboard() {
  const { isAuthor, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && !isAuthor) nav({ to: "/author/apply" }); }, [loading, isAuthor]);

  const novelsQ = useQuery({ queryKey: ["my-author-novels"], queryFn: fetchMyAuthorNovels, enabled: isAuthor });
  const earnQ = useQuery({ queryKey: ["author-earnings"], queryFn: fetchMyAuthorEarnings, enabled: isAuthor });
  const seriesQ = useQuery({ queryKey: ["author-earnings-series"], queryFn: () => fetchMyEarningsSeries(30), enabled: isAuthor });
  const giftsQ = useQuery({ queryKey: ["gifts-received"], queryFn: () => fetchGiftsReceived(10), enabled: isAuthor });

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

      {/* Earnings summary */}
      {earnQ.data && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard icon={Coins} label="إجمالي العملات" value={(((earnQ.data as { coins_total?: number }).coins_total) ?? 0).toLocaleString("ar")} />
          <StatCard icon={TrendingUp} label="معلّق" value={(((earnQ.data as { coins_pending?: number }).coins_pending) ?? 0).toLocaleString("ar")} />
          <StatCard icon={Gift} label="مسحوب" value={(((earnQ.data as { coins_paid_out?: number }).coins_paid_out) ?? 0).toLocaleString("ar")} />
        </div>
      )}

      {seriesQ.data && seriesQ.data.length > 0 && (
        <div className="mb-6 rounded-2xl border border-border/40 bg-surface/40 p-4">
          <div className="mb-3 text-sm font-bold text-muted-foreground">آخر 30 يوماً</div>
          <MiniChart data={aggregateByDay(seriesQ.data, 30)} />
        </div>
      )}

      {(giftsQ.data?.length ?? 0) > 0 && (
        <div className="mb-6 rounded-2xl border border-border/40 bg-surface/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold"><Gift className="h-4 w-4 text-primary" />آخر الهدايا</div>
          <div className="space-y-2">
            {(giftsQ.data ?? []).map((g) => {
              const gg = g as { id: string; sender?: { display_name?: string | null; username?: string | null } | null; message?: string | null; amount: number; created_at: string };
              const name = gg.sender?.display_name ?? gg.sender?.username ?? "قارئ";
              return (
                <div key={gg.id} className="flex items-center justify-between gap-2 rounded-md bg-background/30 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-bold">{name}</div>
                    {gg.message && <div className="truncate text-xs text-muted-foreground">{gg.message}</div>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1 font-black text-primary"><Coins className="h-3.5 w-3.5" />{gg.amount}</div>
                  <div className="shrink-0 text-xs text-muted-foreground">{timeAgoAr(gg.created_at)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface/40 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5 text-primary" />{label}</div>
      <div className="text-xl font-black tabular-nums">{value}</div>
    </div>
  );
}

function MiniChart({ data }: { data: { day: string; coins: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.coins));
  return (
    <div className="flex h-24 items-end gap-1">
      {data.map((d, i) => (
        <div key={i} title={`${d.day}: ${d.coins}`} className="flex-1 rounded-t bg-gradient-to-t from-primary/30 to-primary" style={{ height: `${Math.max(4, (d.coins / max) * 100)}%` }} />
      ))}
    </div>
  );
}

function aggregateByDay(rows: { amount: number; created_at: string }[], days: number): { day: string; coins: number }[] {
  const buckets = new Map<string, number>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of rows) {
    const k = r.created_at.slice(0, 10);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + r.amount);
  }
  return [...buckets.entries()].map(([day, coins]) => ({ day, coins }));
}
