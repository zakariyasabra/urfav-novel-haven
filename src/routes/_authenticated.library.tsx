import { showError } from "@/lib/errors";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Heart, History, Bookmark, Users, FolderHeart, Clock, Trash2, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { coverUrl } from "@/lib/covers";
import { formatViews, useStatusLabel, useTimeAgo } from "@/lib/format";
import { NovelCard, type NovelCardData } from "@/components/novel-card";
import { Button } from "@/components/ui/button";
import { fetchMyBookmarks, removeBookmark, fetchMyCollections, createCollection, deleteCollection, fetchFollowedAuthors } from "@/lib/reader-api";
import { fetchMyStreak, fetchMyGoals, upsertMyGoals, fetchTodaysReadCount } from "@/lib/monetization-api";
import { Flame, Target } from "lucide-react";
import { confirmDialog } from "@/components/ui/dialog-service";
import { useT, usePreferences } from "@/i18n/provider";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "My library — UR Fav Novel" }, { name: "robots", content: "noindex" }] }),
  component: LibraryPage,
});

type Tab = "continue" | "favorites" | "bookmarks" | "history" | "following" | "collections";

function LibraryPage() {
  const t = useT();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("continue");

  const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "continue", label: t("lib.tab.continue"), icon: Clock },
    { key: "favorites", label: t("lib.tab.favorites"), icon: Heart },
    { key: "bookmarks", label: t("lib.tab.bookmarks"), icon: Bookmark },
    { key: "history", label: t("lib.tab.history"), icon: History },
    { key: "collections", label: t("lib.tab.collections"), icon: FolderHeart },
    { key: "following", label: t("lib.tab.authors"), icon: Users },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-black md:text-4xl">{t("lib.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("lib.subtitle")}</p>
      </header>

      {user && <LibraryStats userId={user.id} />}

      <StreakCard />

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tt) => {
          const Icon = tt.icon;
          const active = tab === tt.key;
          return (
            <button key={tt.key} onClick={() => setTab(tt.key)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                active ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
              }`}>
              <Icon className="h-4 w-4" />{tt.label}
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

function LibraryStats({ userId }: { userId: string }) {
  const t = useT();
  const { lang } = usePreferences();
  const locale = lang === "en" ? "en-US" : "ar-EG";
  const q = useQuery({
    queryKey: ["lib-stats", userId],
    queryFn: async () => {
      const [hist, fav, bm] = await Promise.all([
        supabase.from("reading_history").select("progress, novel_id", { count: "exact", head: false }).eq("user_id", userId),
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("bookmarks").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      const rows = (hist.data ?? []) as { progress: number; novel_id: string }[];
      const uniqueNovels = new Set(rows.map(r => r.novel_id)).size;
      const finished = new Set(rows.filter(r => (r.progress ?? 0) >= 95).map(r => r.novel_id)).size;
      return {
        read: uniqueNovels,
        favorites: fav.count ?? 0,
        bookmarks: bm.count ?? 0,
        finished,
      };
    },
  });
  const s = q.data ?? { read: 0, favorites: 0, bookmarks: 0, finished: 0 };
  const items = [
    { icon: Clock, label: t("lib.stats.readNovels"), value: s.read },
    { icon: Heart, label: t("lib.stats.favorites"), value: s.favorites },
    { icon: Bookmark, label: t("lib.stats.bookmarks"), value: s.bookmarks },
    { icon: CheckCircle2, label: t("lib.stats.finished"), value: s.finished },
  ];
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-2xl border border-border/40 bg-surface/40 p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <it.icon className="h-3.5 w-3.5 text-primary" />{it.label}
          </div>
          <div className="text-2xl font-black tabular-nums">{it.value.toLocaleString(locale)}</div>
        </div>
      ))}
    </div>
  );
}

function ContinueReading({ userId }: { userId: string }) {
  const t = useT();
  const timeAgo = useTimeAgo();
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
  if ((q.data?.length ?? 0) === 0) return <Empty title={t("lib.empty.continue.t")} hint={t("lib.empty.continue.h")} />;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {(q.data ?? []).map((h) => (
        <Link key={h.novel.slug} to="/novels/$slug/$chapter" params={{ slug: h.novel.slug, chapter: String(h.chapter?.chapter_number ?? 1) }}
          className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-surface to-surface-elevated p-3 transition-all hover:border-primary/50 hover:shadow-elevated">
          <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-3">
            <img src={coverUrl(h.novel.cover_url)} alt="" className="h-28 w-20 rounded-md object-cover shadow-md" />
            <div className="min-w-0">
              <div className="truncate text-sm font-black">{h.novel.title}</div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">{h.novel.author}</div>
              <div className="mt-2 text-xs text-primary">{t("lib.chapterN", { n: h.chapter?.chapter_number ?? 1 })}</div>
              <div className="mt-2 h-1.5 rounded-full bg-secondary">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow" style={{ width: `${Math.max(3, h.progress)}%` }} />
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">{h.progress}% — {timeAgo(h.last_read_at)}</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Favorites({ userId }: { userId: string }) {
  const t = useT();
  const q = useQuery({
    queryKey: ["favorites", userId],
    queryFn: async () => {
      const { data } = await supabase.from("favorites")
        .select("created_at, novel:novels(id,slug,title,author,cover_url,status,views_count,rating_avg)")
        .eq("user_id", userId).order("created_at", { ascending: false });
      return ((data ?? []) as unknown as { novel: NovelCardData }[]).map((r) => r.novel);
    },
  });
  if ((q.data?.length ?? 0) === 0) return <Empty title={t("lib.empty.favorites.t")} hint={t("lib.empty.favorites.h")} />;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {(q.data ?? []).map((n) => <NovelCard key={n.slug} novel={n} />)}
    </div>
  );
}

function Bookmarks() {
  const t = useT();
  const timeAgo = useTimeAgo();
  const q = useQuery({ queryKey: ["my-bookmarks"], queryFn: fetchMyBookmarks });
  async function del(id: string) {
    try { await removeBookmark(id); toast.success(t("lib.deleted")); q.refetch(); } catch { toast.error(t("lib.error")); }
  }
  const items = (q.data ?? []) as unknown as {
    id: string; created_at: string; paragraph_index: number | null; note: string | null;
    chapter: { id: string; chapter_number: number; title: string } | null;
    novel: { id: string; slug: string; title: string; cover_url: string | null; author: string };
  }[];
  if (items.length === 0) return <Empty title={t("lib.empty.bookmarks.t")} hint={t("lib.empty.bookmarks.h")} />;
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {items.map((b) => (
        <div key={b.id} className="grid grid-cols-[60px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/40 bg-surface/40 p-3">
          <img src={coverUrl(b.novel.cover_url)} alt="" className="h-20 w-14 rounded object-cover" />
          <Link to="/novels/$slug/$chapter" params={{ slug: b.novel.slug, chapter: String(b.chapter?.chapter_number ?? 1) }} className="min-w-0">
            <div className="truncate text-sm font-bold">{b.novel.title}</div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {t("lib.chapterN", { n: b.chapter?.chapter_number ?? 1 })} — {b.chapter?.title}
              {b.paragraph_index !== null && <> · {t("lib.paragraphN", { n: b.paragraph_index + 1 })}</>}
            </div>
            {b.note && <div className="mt-1 line-clamp-1 text-xs italic opacity-70">"{b.note}"</div>}
            <div className="mt-1 text-[10px] text-muted-foreground">{timeAgo(b.created_at)}</div>
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
  const t = useT();
  const timeAgo = useTimeAgo();
  const statusLabel = useStatusLabel();
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
  if ((q.data?.length ?? 0) === 0) return <Empty title={t("lib.empty.history.t")} hint={t("lib.empty.history.h")} />;
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {(q.data ?? []).map((h) => (
        <Link key={`${h.novel.slug}-${h.last_read_at}`} to="/novels/$slug/$chapter" params={{ slug: h.novel.slug, chapter: String(h.chapter?.chapter_number ?? 1) }}
          className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-border/40 bg-surface/40 p-3 transition-colors hover:border-primary/50">
          <img src={coverUrl(h.novel.cover_url)} alt="" className="h-20 w-16 rounded object-cover" />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{h.novel.title}</div>
            <div className="truncate text-xs text-muted-foreground">{t("lib.chapterN", { n: h.chapter?.chapter_number ?? 1 })} — {h.chapter?.title}</div>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span>{statusLabel(h.novel.status)}</span>
              <span>{formatViews(h.novel.views_count)}</span>
              <span>{timeAgo(h.last_read_at)}</span>
            </div>
          </div>
          <div className="text-xs font-bold text-primary">{h.progress}%</div>
        </Link>
      ))}
    </div>
  );
}

function Collections() {
  const t = useT();
  const timeAgo = useTimeAgo();
  const q = useQuery({ queryKey: ["my-collections"], queryFn: fetchMyCollections });
  const [name, setName] = useState("");
  async function create() {
    if (!name.trim()) return;
    try { await createCollection({ name: name.trim() }); setName(""); toast.success(t("lib.saved")); q.refetch(); }
    catch { toast.error(t("lib.error")); }
  }
  async function del(id: string) {
    if (!(await confirmDialog({ title: t("lib.confirmTitle"), body: t("lib.collections.deleteConfirm"), confirmLabel: t("lib.confirmLabel"), danger: true }))) return;
    try { await deleteCollection(id); toast.success(t("lib.deleted")); q.refetch(); } catch { toast.error(t("lib.error")); }
  }
  return (
    <div>
      <div className="mb-4 flex gap-2 rounded-xl border border-border/40 bg-surface/40 p-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("lib.collections.newPlaceholder")}
          className="h-9 flex-1 rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary" />
        <Button size="sm" onClick={create}><Plus className="me-1 h-4 w-4" />{t("lib.collections.create")}</Button>
      </div>
      {(q.data?.length ?? 0) === 0 ? <Empty title={t("lib.empty.collections.t")} hint={t("lib.empty.collections.h")} /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(q.data ?? []).map((c) => (
            <div key={c.id} className="rounded-xl border border-border/40 bg-surface/40 p-4 transition-all hover:border-primary/50">
              <div className="mb-1 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-bold">{c.name}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{c.is_public ? t("lib.collections.public") : t("lib.collections.private")} — {timeAgo(c.created_at)}</div>
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
  const t = useT();
  const q = useQuery({ queryKey: ["following-authors"], queryFn: fetchFollowedAuthors });
  const items = (q.data ?? []) as unknown as {
    created_at: string;
    author: { id: string; username: string; display_name: string | null; avatar_url: string | null; is_verified: boolean };
  }[];
  if (items.length === 0) return <Empty title={t("lib.empty.authors.t")} hint={t("lib.empty.authors.h")} />;
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
  const t = useT();
  const { lang } = usePreferences();
  const locale = lang === "en" ? "en-US" : "ar-EG";
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
      toast.success(t("lib.saved"));
      setEditing(false);
      goalsQ.refetch();
    } catch (e) { showError(e); }
  }

  return (
    <div className="mb-6 grid gap-3 md:grid-cols-3">
      <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 to-surface p-4">
        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-widest text-primary"><Flame className="h-3.5 w-3.5" />{t("lib.streak")}</div>
        <div className="text-3xl font-black">{s.current_streak.toLocaleString(locale)} <span className="text-sm text-muted-foreground">{t("lib.day")}</span></div>
        <div className="text-xs text-muted-foreground">{t("lib.streak.longest")}: {s.longest_streak.toLocaleString(locale)}</div>
      </div>
      <div className="rounded-2xl border border-border/40 bg-surface/40 p-4">
        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground"><Target className="h-3.5 w-3.5" />{t("lib.goal.today")}</div>
        <div className="mb-2 text-2xl font-black">{today} / {g.daily_chapters} {t("lib.goal.chapters")}</div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="rounded-2xl border border-border/40 bg-surface/40 p-4">
        <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">{t("lib.goal.setup")}</div>
        {editing ? (
          <div className="space-y-2">
            <label className="block text-xs">{t("lib.goal.daily")}
              <input type="number" min={1} max={20} value={daily} onChange={(e) => setDaily(Number(e.target.value))}
                className="mt-1 h-8 w-full rounded border border-input bg-background/60 px-2 text-sm" />
            </label>
            <label className="block text-xs">{t("lib.goal.weekly")}
              <input type="number" min={1} max={100} value={weekly} onChange={(e) => setWeekly(Number(e.target.value))}
                className="mt-1 h-8 w-full rounded border border-input bg-background/60 px-2 text-sm" />
            </label>
            <div className="flex gap-2"><Button size="sm" onClick={save}>{t("lib.save")}</Button><Button size="sm" variant="ghost" onClick={() => setEditing(false)}>{t("lib.cancel")}</Button></div>
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">{g.daily_chapters} {t("lib.goal.daily")} · {g.weekly_chapters} {t("lib.goal.weekly")}</div>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => { setDaily(g.daily_chapters); setWeekly(g.weekly_chapters); setEditing(true); }}>{t("lib.edit")}</Button>
          </>
        )}
      </div>
    </div>
  );
}
