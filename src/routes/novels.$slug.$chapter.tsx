import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, List, Settings2, Bookmark, BookmarkCheck, X, MessageCircle, Home, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { fetchChapter, fetchChapters, incrementChapterView, fetchComments } from "@/lib/api";
import { addBookmark, removeBookmark } from "@/lib/reader-api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useReaderSettings, readerThemeClass, readerFontFamily } from "@/hooks/use-reader-settings";
import { ReaderSettingsPanel } from "@/components/reader/reader-settings-drawer";
import { TextSelectionToolbar } from "@/components/reader/text-selection-toolbar";
import { TextReactionsBar } from "@/components/reader/text-reactions-bar";
import { ThreadedComments } from "@/components/reader/threaded-comments";
import { ChapterLock } from "@/components/reader/chapter-lock";
import { isChapterUnlocked, isCurrentUserVip, bumpMyStreak } from "@/lib/monetization-api";

export const Route = createFileRoute("/novels/$slug/$chapter")({
  component: ReaderPage,
  head: ({ params }) => ({
    meta: [{ title: `الفصل ${params.chapter} — UR Fav Novel` }],
  }),
});

function ReaderPage() {
  const { slug, chapter } = Route.useParams();
  const navigate = useNavigate();
  const chapterNum = parseInt(chapter, 10);
  const { user } = useAuth();
  const { settings, update, reset } = useReaderSettings();

  const [panel, setPanel] = useState<null | "settings" | "toc" | "comments">(null);
  const [uiHidden, setUiHidden] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);
  const articleRef = useRef<HTMLDivElement>(null);

  const q = useQuery({ queryKey: ["chapter", slug, chapterNum], queryFn: () => fetchChapter(slug, chapterNum) });
  const chaptersQ = useQuery({
    queryKey: ["chapters", q.data?.novel.id],
    queryFn: () => fetchChapters(q.data!.novel.id),
    enabled: !!q.data?.novel.id,
  });

  const chapterId = q.data?.chapter.id;
  const chVip = q.data?.chapter.is_vip ?? false;
  const price = ((q.data?.chapter as unknown as { coin_price?: number } | undefined)?.coin_price) ?? 0;
  const requiresLock = !!q.data && (chVip || price > 0);

  const vipQ = useQuery({ queryKey: ["is-vip", user?.id], queryFn: isCurrentUserVip, enabled: !!user });
  const unlockedQ = useQuery({
    queryKey: ["chapter-unlocked", chapterId, user?.id],
    queryFn: () => isChapterUnlocked(chapterId!),
    enabled: !!user && !!chapterId && requiresLock,
  });
  const isVipMember = !!vipQ.data;
  const hasUnlocked = !!unlockedQ.data;
  const canRead = !requiresLock || isVipMember || hasUnlocked;

  // View + history
  useEffect(() => {
    if (!q.data) return;
    const chapterId = q.data.chapter.id;
    const novelId = q.data.novel.id;
    incrementChapterView(chapterId);
    window.scrollTo({ top: 0 });
    if (user) {
      supabase.from("reading_history").upsert({
        user_id: user.id, novel_id: novelId, chapter_id: chapterId,
        last_read_at: new Date().toISOString(), progress: 0,
      }).then(() => {});
    }
  }, [q.data?.chapter.id, user?.id]);

  // Existing bookmark?
  useEffect(() => {
    if (!user || !q.data) { setBookmarkId(null); return; }
    supabase.from("bookmarks").select("id")
      .eq("user_id", user.id).eq("chapter_id", q.data.chapter.id).is("paragraph_index", null)
      .maybeSingle().then(({ data }) => setBookmarkId(data?.id ?? null));
  }, [user?.id, q.data?.chapter.id]);

  // Reading progress
  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.scrollHeight - window.innerHeight;
      const scrolled = Math.max(0, -rect.top);
      setProgress(Math.min(100, Math.round((scrolled / Math.max(total, 1)) * 100)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [q.data?.chapter.id]);

  // Save progress %
  useEffect(() => {
    if (!user || !q.data || progress < 5) return;
    const novelId = q.data.novel.id;
    const chapterId = q.data.chapter.id;
    const t = setTimeout(() => {
      supabase.from("reading_history").upsert({
        user_id: user.id, novel_id: novelId, chapter_id: chapterId,
        last_read_at: new Date().toISOString(), progress,
      }).then(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [progress, q.data?.chapter.id, user?.id]);

  const chapters = chaptersQ.data ?? [];
  const idx = chapters.findIndex((c) => c.chapter_number === chapterNum);
  const prev = idx > 0 ? chapters[idx - 1] : null;
  const next = idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : null;

  const goPrev = useCallback(() => {
    if (prev) navigate({ to: "/novels/$slug/$chapter", params: { slug, chapter: String(prev.chapter_number) } });
  }, [prev, slug, navigate]);
  const goNext = useCallback(() => {
    if (next) navigate({ to: "/novels/$slug/$chapter", params: { slug, chapter: String(next.chapter_number) } });
  }, [next, slug, navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowLeft") goNext();          // RTL: left = next
      else if (e.key === "ArrowRight") goPrev();
      else if (e.key === "f") toggleFullscreen();
      else if (e.key === "h") setUiHidden((v) => !v);
      else if (e.key === "s") setPanel((p) => p === "settings" ? null : "settings");
      else if (e.key === "Escape") { setPanel(null); setUiHidden(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  // Swipe navigation (mobile)
  useEffect(() => {
    let sx = 0, sy = 0, tx = 0, ty = 0;
    const onStart = (e: TouchEvent) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
    const onMove = (e: TouchEvent) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; };
    const onEnd = () => {
      const dx = tx - sx, dy = ty - sy;
      if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) goNext(); else goPrev(); // swipe left → next (RTL flow)
      }
      sx = sy = tx = ty = 0;
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [goNext, goPrev]);

  // Auto-scroll
  useEffect(() => {
    if (!settings.autoScroll) return;
    const px = Math.max(1, Math.round(settings.autoScrollSpeed / 30));
    const id = window.setInterval(() => window.scrollBy(0, px), 50);
    return () => window.clearInterval(id);
  }, [settings.autoScroll, settings.autoScrollSpeed]);

  const commentsQ = useQuery({
    queryKey: ["comments", "chapter", q.data?.chapter.id],
    queryFn: () => fetchComments({ chapterId: q.data!.chapter.id }),
    enabled: !!q.data?.chapter.id && panel === "comments",
  });

  const words = useMemo(() => (q.data?.chapter.content ?? "").trim().split(/\s+/).length, [q.data?.chapter.content]);
  const readingMin = Math.max(1, Math.round(words / 220));
  const remainingMin = Math.max(0, Math.round(readingMin * (1 - progress / 100)));

  async function toggleBookmark() {
    if (!user) { toast.error("سجل الدخول لحفظ العلامات"); return; }
    if (!q.data) return;
    try {
      if (bookmarkId) {
        await removeBookmark(bookmarkId);
        setBookmarkId(null);
        toast.success("أُزيلت العلامة");
      } else {
        await addBookmark({ novel_id: q.data.novel.id, chapter_id: q.data.chapter.id });
        toast.success("تم حفظ الفصل في العلامات");
        const { data } = await supabase.from("bookmarks").select("id")
          .eq("user_id", user.id).eq("chapter_id", q.data.chapter.id).is("paragraph_index", null).maybeSingle();
        setBookmarkId(data?.id ?? null);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function bookmarkParagraph(pi: number, text: string) {
    if (!user) { toast.error("سجل الدخول"); return; }
    if (!q.data) return;
    try {
      await addBookmark({ novel_id: q.data.novel.id, chapter_id: q.data.chapter.id, paragraph_index: pi, note: text.slice(0, 120) });
      toast.success("تم حفظ الفقرة");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "خطأ");
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }

  if (q.isLoading) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">جاري التحميل…</div>;
  if (!q.data) return <div className="mx-auto max-w-3xl px-4 py-16 text-center">الفصل غير موجود</div>;

  const { novel, chapter: ch } = q.data;
  const paragraphs = ch.content.split(/\n\s*\n/).filter(Boolean);

  return (
    <div className={`reader-root ${readerThemeClass(settings.theme)}`}>
      {/* Progress bar */}
      <div className="fixed inset-x-0 top-0 z-[60] h-1 bg-transparent">
        <div className="h-full bg-gradient-to-r from-primary to-primary-glow transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>

      {/* Top bar */}
      {!uiHidden && (
        <div className="reader-topbar sticky top-0 z-40 backdrop-blur-xl">
          <div className="mx-auto grid max-w-3xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5">
            <Link to="/novels/$slug" params={{ slug }} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5">
              <Home className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{novel.title}</div>
              <div className="truncate text-[11px] opacity-70">الفصل {chapterNum} — {remainingMin} د متبقية</div>
            </div>
            <div className="flex items-center gap-1">
              <IconBtn onClick={toggleBookmark} label="علامة">
                {bookmarkId ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
              </IconBtn>
              <IconBtn onClick={() => setPanel(panel === "toc" ? null : "toc")} label="الفصول"><List className="h-4 w-4" /></IconBtn>
              <IconBtn onClick={() => setPanel(panel === "settings" ? null : "settings")} label="إعدادات"><Settings2 className="h-4 w-4" /></IconBtn>
              <IconBtn onClick={() => setUiHidden(true)} label="إخفاء"><EyeOff className="h-4 w-4" /></IconBtn>
            </div>
          </div>
        </div>
      )}

      {uiHidden && (
        <button onClick={() => setUiHidden(false)}
          className="fixed end-4 top-4 z-40 grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70">
          <Eye className="h-4 w-4" />
        </button>
      )}

      <article ref={articleRef} className="reader-body mx-auto max-w-3xl px-4 pb-24 pt-8"
        style={{
          fontFamily: readerFontFamily(settings.font),
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
          letterSpacing: `${settings.letterSpacing}px`,
        }}
      >
        <header className="mb-10 text-center">
          <div className="mb-2 text-xs uppercase tracking-widest opacity-60">الفصل {chapterNum}</div>
          <h1 className="text-2xl font-black md:text-3xl">{ch.title}</h1>
          <div className="mt-3 flex items-center justify-center gap-3 text-xs opacity-60">
            <span>{words.toLocaleString("ar")} كلمة</span>
            <span>•</span>
            <span>{readingMin} د قراءة</span>
          </div>
        </header>

        <div className="reader-content space-y-5">
          {paragraphs.map((p, i) => (
            <p key={i} onDoubleClick={() => bookmarkParagraph(i, p)}
              className="whitespace-pre-line select-text cursor-text transition-colors hover:bg-primary/[0.04] rounded-md px-1 py-0.5">
              {p}
            </p>
          ))}
        </div>

        {/* Prev/Next */}
        <div className="mt-14 grid grid-cols-2 gap-3">
          <Button disabled={!prev} variant="outline" onClick={goPrev}
            className="h-auto flex-col items-start py-3">
            <span className="flex items-center gap-1 text-xs opacity-70"><ChevronRight className="h-4 w-4" />السابق</span>
            <span className="truncate text-sm font-bold">{prev ? `الفصل ${prev.chapter_number}` : "لا يوجد"}</span>
          </Button>
          <Button disabled={!next} onClick={goNext}
            className="h-auto flex-col items-start bg-gradient-to-r from-primary to-primary-glow py-3 text-primary-foreground">
            <span className="flex items-center gap-1 text-xs opacity-90">التالي<ChevronLeft className="h-4 w-4" /></span>
            <span className="truncate text-sm font-bold">{next ? `الفصل ${next.chapter_number}` : "النهاية"}</span>
          </Button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs opacity-60">
          <span>اسحب لليسار للفصل التالي • Ctrl+H لإخفاء الواجهة</span>
        </div>
        <TextReactionsBar chapterId={ch.id} />
        <div className="mt-10">
          <h2 className="mb-3 text-lg font-black">التعليقات على الفصل</h2>
          <ThreadedComments chapterId={ch.id} novelId={novel.id} />
        </div>
      </article>
      <TextSelectionToolbar chapterId={ch.id} novelId={novel.id} novelTitle={novel.title} containerRef={articleRef} />

      {/* Bottom action bar (mobile-first) */}
      {!uiHidden && (
        <div className="reader-bottombar fixed inset-x-0 bottom-0 z-40 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto grid max-w-3xl grid-cols-4 items-center gap-2 px-3 py-2">
            <BottomBtn label="السابق" onClick={goPrev} disabled={!prev}><ChevronRight className="h-5 w-5" /></BottomBtn>
            <BottomBtn label="الفصول" onClick={() => setPanel(panel === "toc" ? null : "toc")}><List className="h-5 w-5" /></BottomBtn>
            <BottomBtn label="التعليقات" onClick={() => setPanel(panel === "comments" ? null : "comments")}><MessageCircle className="h-5 w-5" /></BottomBtn>
            <BottomBtn label="التالي" onClick={goNext} disabled={!next}><ChevronLeft className="h-5 w-5" /></BottomBtn>
          </div>
        </div>
      )}

      {/* Slide-in panel */}
      {panel && (
        <>
          <button className="fixed inset-0 z-40 bg-black/50 animate-fade-in" onClick={() => setPanel(null)} aria-label="إغلاق" />
          <aside className="fixed inset-y-0 end-0 z-50 flex w-full max-w-sm flex-col bg-popover text-popover-foreground shadow-2xl animate-slide-in-right pb-[env(safe-area-inset-bottom)]">
            <header className="flex items-center justify-between border-b border-border/60 p-3">
              <div className="text-sm font-bold">
                {panel === "settings" ? "إعدادات القراءة" : panel === "toc" ? `الفصول (${chapters.length})` : "التعليقات"}
              </div>
              <button onClick={() => setPanel(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {panel === "settings" && <ReaderSettingsPanel settings={settings} update={update} reset={reset} onToggleFullscreen={toggleFullscreen} />}
              {panel === "toc" && (
                <div className="p-2">
                  {chapters.map((c) => (
                    <Link key={c.id} to="/novels/$slug/$chapter" params={{ slug, chapter: String(c.chapter_number) }}
                      onClick={() => setPanel(null)}
                      className={`block rounded-md px-3 py-2 text-sm ${c.chapter_number === chapterNum ? "bg-primary text-primary-foreground font-bold" : "hover:bg-secondary"}`}>
                      <div className="truncate">الفصل {c.chapter_number}: {c.title}</div>
                    </Link>
                  ))}
                </div>
              )}
              {panel === "comments" && q.data && (
                <ChapterComments chapterId={ch.id} data={commentsQ.data ?? []} onPosted={() => commentsQ.refetch()} />
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function IconBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} title={label} aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5">
      {children}
    </button>
  );
}

function BottomBtn({ children, onClick, disabled, label }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label}
      className="grid place-items-center gap-0.5 rounded-lg py-2 text-[11px] font-semibold opacity-90 transition hover:bg-white/5 disabled:opacity-30">
      {children}
      <span>{label}</span>
    </button>
  );
}

function ChapterComments({ chapterId, data, onPosted }: {
  chapterId: string;
  data: { id: string; content: string; created_at: string; profile: { username: string; avatar_url: string | null } | null }[];
  onPosted: () => void;
}) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("comments").insert({ user_id: user.id, chapter_id: chapterId, content: text });
    if (error) return toast.error("تعذر النشر");
    setText(""); toast.success("تم النشر"); onPosted();
  }
  return (
    <div className="p-3">
      {user ? (
        <form onSubmit={submit} className="rounded-lg border border-border/40 bg-surface/40 p-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
            placeholder="اكتب تعليقك..."
            className="w-full resize-none rounded-md border border-input bg-background/60 p-2 text-sm outline-none focus:border-primary" />
          <div className="mt-2 flex justify-end">
            <Button size="sm" type="submit" disabled={!text.trim()}>إرسال</Button>
          </div>
        </form>
      ) : (
        <div className="rounded-lg border border-border/40 bg-surface/40 p-3 text-center text-sm text-muted-foreground">
          <Link to="/auth" className="font-bold text-primary">سجل دخول</Link> لإضافة تعليق
        </div>
      )}
      <div className="mt-3 space-y-2">
        {data.length === 0 && <div className="rounded-md border border-dashed border-border/40 p-6 text-center text-xs text-muted-foreground">لا توجد تعليقات بعد</div>}
        {data.map((c) => (
          <div key={c.id} className="rounded-lg border border-border/40 bg-surface/40 p-3 text-sm">
            <div className="mb-1 font-bold text-primary">{c.profile?.username ?? "مستخدم"}</div>
            <div className="text-foreground/90 whitespace-pre-line">{c.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
