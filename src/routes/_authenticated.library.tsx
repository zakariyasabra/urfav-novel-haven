import { showError } from "@/lib/errors";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Heart, History, Bookmark, Users, FolderHeart, Clock, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { coverUrl } from "@/lib/covers";
import { formatViews, timeAgoAr, statusLabel } from "@/lib/format";
import { NovelCard, type NovelCardData } from "@/components/novel-card";
import { Button } from "@/components/ui/button";
import { fetchMyBookmarks, removeBookmark, fetchMyCollections, createCollection, deleteCollection, fetchFollowedAuthors } from "@/lib/reader-api";
import { fetchMyStreak, fetchMyGoals, upsertMyGoals, fetchTodaysReadCount } from "@/lib/monetization-api";
import { Flame, Target } from "lucide-react";
import { confirmDialog, promptDialog } from "@/components/ui/dialog-service";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "مكتبتي — UR Fav Novel" }, { name: "robots", content: "noindex" }] }),
  component: LibraryPage,
});

type Tab = "continue" | "favorites" | "bookmarks" | "history" | "following" | "collections";

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "continue", label: "متابعة القراءة", icon: Clock },
  { key: "favorites", label: "المفضلة", icon: Heart },
  { key: "bookmarks", label: "العلامات", icon: Bookmark },
  { key: "history", label: "السجل", icon: History },
  { key: "collections", label: "قوائمي", icon: FolderHeart },
  { key: "following", label: "الكتّاب", icon: Users },
];

function LibraryPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("continue");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-black md:text-4xl">مكتبتي</h1>
        <p className="mt-1 text-sm text-muted-foreground">كل ما حفظته وقرأته في مكان واحد.</p>
      </header>

      <StreakCard />


      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                active ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
              }`}>
              <Icon className="h-4 w-4" />{t.label}
            </button>
          );
        })}
      </div>

      {user && (
        <>
          {tab === "continue" && <ContinueReading userId={user.id} />}
          {tab === "favorites" && <Favorites userId={user.id} />}
          {tab === "bookmarks" && <Bookmarks />}
          {tab === "history" && <HistoryList userId={user.id} />}
          {tab === "collections" && <Collections />}
          {tab === "following" && <Following />}
        </>
      )}
    </div>
  );
}

function ContinueReading({ userId }: { userId: string }) {
  const q = useQuery({
    queryKey: ["continue", userId],
    queryFn: async () => {
      const { data } = await supabase.from("reading_history")
        .select("last_read_at,progress,chapter:chapters(chapter_number,title),novel:novels(slug,title,cover_url,author)")
        .eq("user_id", userId).order("last_read_at", { ascending: false }).limit(12);
      return (data ?? []) as unknown as {
        last_read_at: string; progress: number;
        chapter: { chapter_number: number; title: string } | null;
        novel: { slug: string; title: string; cover_url: string | null; author: string };
      }[];
    },
  });
  if ((q.data?.length ?? 0) === 0) return <Empty title="لا يوجد ما تتابعه" hint="ابدأ بقراءة رواية لتظهر هنا." />;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {(q.data ?? []).map((h) => (
        <Link key={h.novel.slug} to="/novels/$slug/$chapter" params={{ slug: h.novel.slug, chapter: String(h.chapter?.chapter_number ?? 1) }}
          className="group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-surface to-surface-elevated p-3 transition-all hover:border-primary/50 hover:shadow-elevated">
          <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-3">
            <img src={coverUrl(h.novel.cover_url)} alt="" className="h-28 w-20 rounded-md object-cover shadow-md" />
            <div className="min-w-0">
              <div className="truncate text-sm font-black">{h.novel.title}</div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">{h.novel.author}</div>
              <div className="mt-2 text-xs text-primary">الفصل {h.chapter?.chapter_number}</div>
              <div className="mt-2 h-1.5 rounded-full bg-secondary">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow" style={{ width: `${Math.max(3, h.progress)}%` }} />
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">{h.progress}% — {timeAgoAr(h.last_read_at)}</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Favorites({ userId }: { userId: string }) {
  const q = useQuery({
    queryKey: ["favorites", userId],
    queryFn: async () => {
      const { data } = await supabase.from("favorites")
        .select("created_at, novel:novels(id,slug,title,author,cover_url,status,views_count,rating_avg)")
        .eq("user_id", userId).order("created_at", { ascending: false });
      return ((data ?? []) as unknown as { novel: NovelCardData }[]).map((r) => r.novel);
    },
  });
  if ((q.data?.length ?? 0) === 0) return <Empty title="لا مفضلات بعد" hint="اضغط ♥ على أي رواية لإضافتها." />;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {(q.data ?? []).map((n) => <NovelCard key={n.slug} novel={n} />)}
    </div>
  );
}

function Bookmarks() {
  const q = useQuery({ queryKey: ["my-bookmarks"], queryFn: fetchMyBookmarks });
  async function del(id: string) {
    try { await removeBookmark(id); toast.success("حُذفت"); q.refetch(); } catch { toast.error("خطأ"); }
  }
  const items = (q.data ?? []) as unknown as {
    id: string; created_at: string; paragraph_index: number | null; note: string | null;
    chapter: { id: string; chapter_number: number; title: string } | null;
    novel: { id: string; slug: string; title: string; cover_url: string | null; author: string };
  }[];
  if (items.length === 0) return <Empty title="لا علامات محفوظة" hint="اضغط ⤴ لحفظ فصل، أو انقر مرتين على فقرة لحفظها." />;
  return (
    <div className="space-y-2">
      {items.map((b) => (
        <div key={b.id} className="grid grid-cols-[60px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/40 bg-surface/40 p-3">
          <img src={coverUrl(b.novel.cover_url)} alt="" className="h-20 w-14 rounded object-cover" />
          <Link to="/novels/$slug/$chapter" params={{ slug: b.novel.slug, chapter: String(b.chapter?.chapter_number ?? 1) }} className="min-w-0">
            <div className="truncate text-sm font-bold">{b.novel.title}</div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              الفصل {b.chapter?.chapter_number} — {b.chapter?.title}
              {b.paragraph_index !== null && <> · فقرة #{b.paragraph_index + 1}</>}
            </div>
            {b.note && <div className="mt-1 line-clamp-1 text-xs italic opacity-70">"{b.note}"</div>}
            <div className="mt-1 text-[10px] text-muted-foreground">{timeAgoAr(b.created_at)}</div>
          </Link>
          <button onClick={() => del(b.id)} className="grid h-9 w-9 place-items-center rounded-full text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function HistoryList({ userId }: { userId: string }) {
  const q = useQuery({
    queryKey: ["history-full", userId],
    queryFn: async () => {
      const { data } = await supabase.from("reading_history")
        .select("last_read_at,progress,chapter:chapters(chapter_number,title),novel:novels(slug,title,cover_url,author,status,views_count,rating_avg)")
        .eq("user_id", userId).order("last_read_at", { ascending: false });
      return (data ?? []) as unknown as {
        last_read_at: string; progress: number;
        chapter: { chapter_number: number; title: string } | null;
        novel: { slug: string; title: string; cover_url: string | null; author: string; status: string; views_count: number; rating_avg: number };
      }[];
    },
  });
  if ((q.data?.length ?? 0) === 0) return <Empty title="لا سجل بعد" hint="سيظهر هنا كل ما قرأته." />;
  return (
    <div className="space-y-2">
      {(q.data ?? []).map((h) => (
        <Link key={`${h.novel.slug}-${h.last_read_at}`} to="/novels/$slug/$chapter" params={{ slug: h.novel.slug, chapter: String(h.chapter?.chapter_number ?? 1) }}
          className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-border/40 bg-surface/40 p-3 transition-colors hover:border-primary/50">
          <img src={coverUrl(h.novel.cover_url)} alt="" className="h-20 w-16 rounded object-cover" />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{h.novel.title}</div>
            <div className="truncate text-xs text-muted-foreground">الفصل {h.chapter?.chapter_number} — {h.chapter?.title}</div>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span>{statusLabel(h.novel.status)}</span>
              <span>{formatViews(h.novel.views_count)}</span>
              <span>{timeAgoAr(h.last_read_at)}</span>
            </div>
          </div>
          <div className="text-xs font-bold text-primary">{h.progress}%</div>
        </Link>
      ))}
    </div>
  );
}

function Collections() {
  const q = useQuery({ queryKey: ["my-collections"], queryFn: fetchMyCollections });
  const [name, setName] = useState("");
  async function create() {
    if (!name.trim()) return;
    try { await createCollection({ name: name.trim() }); setName(""); toast.success("تم"); q.refetch(); }
    catch { toast.error("خطأ"); }
  }
  async function del(id: string) {
    if (!(await confirmDialog({ title: "تأكيد", body: "حذف القائمة؟", confirmLabel: "تأكيد", danger: true }))) return;
    try { await deleteCollection(id); toast.success("حُذفت"); q.refetch(); } catch { toast.error("خطأ"); }
  }
  return (
    <div>
      <div className="mb-4 flex gap-2 rounded-xl border border-border/40 bg-surface/40 p-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم قائمة جديدة..."
          className="h-9 flex-1 rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary" />
        <Button size="sm" onClick={create}><Plus className="me-1 h-4 w-4" />إنشاء</Button>
      </div>
      {(q.data?.length ?? 0) === 0 ? <Empty title="لا قوائم بعد" hint="أنشئ قائمة قراءة مخصصة لتنظيم رواياتك." /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(q.data ?? []).map((c) => (
            <div key={c.id} className="rounded-xl border border-border/40 bg-surface/40 p-4 transition-all hover:border-primary/50">
              <div className="mb-1 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-bold">{c.name}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{c.is_public ? "عامة" : "خاصة"} — {timeAgoAr(c.created_at)}</div>
                </div>
                <button onClick={() => del(c.id)} className="grid h-8 w-8 place-items-center rounded-full text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {c.description && <div className="line-clamp-2 text-xs text-muted-foreground">{c.description}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Following() {
  const q = useQuery({ queryKey: ["following-authors"], queryFn: fetchFollowedAuthors });
  const items = (q.data ?? []) as unknown as {
    created_at: string;
    author: { id: string; username: string; display_name: string | null; avatar_url: string | null; is_verified: boolean };
  }[];
  if (items.length === 0) return <Empty title="لا تتابع أحداً" hint="اتبع كتّابك المفضلين لتصلك تنبيهات فصولهم الجديدة." />;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((f) => (
        <Link key={f.author.id} to="/authors/$username" params={{ username: f.author.username }}
          className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border/40 bg-surface/40 p-3 transition-all hover:border-primary/50">
          <div className="grid h-13 w-13 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary-glow font-bold text-primary-foreground">
            {f.author.avatar_url ? <img src={f.author.avatar_url} alt="" className="h-full w-full object-cover" /> : (f.author.display_name || f.author.username).slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate font-bold">
              {f.author.display_name || f.author.username}
              {f.author.is_verified && <span className="ms-1 text-primary">✓</span>}
            </div>
            <div className="truncate text-xs text-muted-foreground">@{f.author.username}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-surface/30 p-12 text-center">
      <div className="mb-1 text-base font-bold">{title}</div>
      <div className="text-sm text-muted-foreground">{hint}</div>
    </div>
  );
}

function StreakCard() {
  const streakQ = useQuery({ queryKey: ["my-streak"], queryFn: fetchMyStreak });
  const goalsQ = useQuery({ queryKey: ["my-goals"], queryFn: fetchMyGoals });
  const todayQ = useQuery({ queryKey: ["today-read"], queryFn: fetchTodaysReadCount });
  const [editing, setEditing] = useState(false);
  const [daily, setDaily] = useState(1);
  const [weekly, setWeekly] = useState(5);
  const s = streakQ.data ?? { current_streak: 0, longest_streak: 0, last_read_date: null };
  const g = goalsQ.data ?? { daily_chapters: 1, weekly_chapters: 5 };
  const today = todayQ.data ?? 0;
  const pct = Math.min(100, Math.round((today / Math.max(1, g.daily_chapters)) * 100));

  async function save() {
    try {
      await upsertMyGoals({ daily_chapters: daily, weekly_chapters: weekly });
      toast.success("تم الحفظ");
      setEditing(false);
      goalsQ.refetch();
    } catch (e) { showError(e); }
  }

  return (
    <div className="mb-6 grid gap-3 md:grid-cols-3">
      <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 to-surface p-4">
        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-widest text-primary"><Flame className="h-3.5 w-3.5" />سلسلة القراءة</div>
        <div className="text-3xl font-black">{s.current_streak} <span className="text-sm text-muted-foreground">يوم</span></div>
        <div className="text-xs text-muted-foreground">الأطول: {s.longest_streak}</div>
      </div>
      <div className="rounded-2xl border border-border/40 bg-surface/40 p-4">
        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground"><Target className="h-3.5 w-3.5" />هدف اليوم</div>
        <div className="mb-2 text-2xl font-black">{today} / {g.daily_chapters} فصل</div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="rounded-2xl border border-border/40 bg-surface/40 p-4">
        <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">إعداد الهدف</div>
        {editing ? (
          <div className="space-y-2">
            <label className="block text-xs">فصول/يوم
              <input type="number" min={1} max={20} value={daily} onChange={(e) => setDaily(Number(e.target.value))}
                className="mt-1 h-8 w-full rounded border border-input bg-background/60 px-2 text-sm" />
            </label>
            <label className="block text-xs">فصول/أسبوع
              <input type="number" min={1} max={100} value={weekly} onChange={(e) => setWeekly(Number(e.target.value))}
                className="mt-1 h-8 w-full rounded border border-input bg-background/60 px-2 text-sm" />
            </label>
            <div className="flex gap-2"><Button size="sm" onClick={save}>حفظ</Button><Button size="sm" variant="ghost" onClick={() => setEditing(false)}>إلغاء</Button></div>
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">{g.daily_chapters} فصل/يوم · {g.weekly_chapters}/أسبوع</div>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => { setDaily(g.daily_chapters); setWeekly(g.weekly_chapters); setEditing(true); }}>تعديل</Button>
          </>
        )}
      </div>
    </div>
  );
}
