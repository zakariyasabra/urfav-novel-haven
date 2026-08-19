import { showError } from "@/lib/errors";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  List,
  Settings2,
  Bookmark,
  BookmarkCheck,
  X,
  MessageCircle,
  Home,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { fetchChapter, fetchChapters, incrementChapterView } from "@/lib/api";
import { addBookmark, removeBookmark } from "@/lib/reader-api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useReaderSettings, readerThemeClass, readerFontFamily } from "@/hooks/use-reader-settings";
import { ReaderSettingsPanel } from "@/components/reader/reader-settings-drawer";
import { TextSelectionToolbar } from "@/components/reader/text-selection-toolbar";
import { TextReactionsBar } from "@/components/reader/text-reactions-bar";
import { ChapterReactionsBar } from "@/components/reader/chapter-reactions-bar";
import { ThreadedComments } from "@/components/reader/threaded-comments";
import { ChapterLock } from "@/components/reader/chapter-lock";
import { ShareChapter } from "@/components/novel/share-chapter";
import { AdSlot } from "@/components/ad-slot";
import {
  isChapterUnlocked,
  isCurrentUserVip,
  bumpMyStreak,
  isNovelOwned,
} from "@/lib/monetization-api";
import { SITE_URL, SITE_NAME, canonicalUrl } from "@/lib/site-config";
import { usePreferences } from "@/i18n/provider";
import { pickText } from "@/lib/i18n-content";
import { useAutoTranslate } from "@/hooks/use-auto-translate";

async function saveReadingProgress(input: {
  userId: string;
  novelId: string;
  chapterId: string;
  progress: number;
}) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(input.progress)));
  const now = new Date().toISOString();

  await Promise.all([
    supabase.from("reading_history").upsert({
      user_id: input.userId,
      novel_id: input.novelId,
      chapter_id: input.chapterId,
      last_read_at: now,
      progress: safeProgress,
    }),
    supabase.from("reading_progress").upsert({
      user_id: input.userId,
      novel_id: input.novelId,
      chapter_id: input.chapterId,
      scroll_pct: safeProgress,
      updated_at: now,
    }),
  ]);
}

export const Route = createFileRoute("/novels/$slug/$chapter")({
  component: ReaderPage,
  // SSR data: the chapter (and its novel + chapter list) are warmed into the
  // React Query cache on the server, so the server-rendered HTML already
  // contains the chapter text, novel title and prev/next links. The cache is
  // dehydrated to the client (see src/router.tsx), so the component's
  // useQuery calls reuse it without a duplicate request.
  loader: async ({ params, context: { queryClient } }) => {
    try {
      const chNum = parseInt(params.chapter, 10);
      const data = await queryClient.ensureQueryData({
        queryKey: ["chapter", params.slug, chNum],
        queryFn: () => fetchChapter(params.slug, chNum),
        staleTime: 60_000,
      });
      if (!data) return { seo: null };
      await queryClient
        .ensureQueryData({
          queryKey: ["chapters", data.novel.id],
          queryFn: () => fetchChapters(data.novel.id),
          staleTime: 60_000,
        })
        .catch(() => undefined);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nAny = data.novel as any;
      return {
        seo: {
          novelTitle: data.novel.title,
          novelSlug: data.novel.slug,
          novelAuthor: nAny.author_profile?.display_name || data.novel.author,
          authorUsername: (nAny.author_profile?.username as string | undefined) ?? null,
          cover: data.novel.cover_url,
          chapterNum: chNum,
          chapterTitle: data.chapter.title,
          isVip: !!data.chapter.is_vip || Number(nAny.coin_price ?? 0) > 0,
          created_at: data.chapter.created_at,
          updated_at: data.chapter.updated_at ?? data.chapter.created_at,
        },
      };
    } catch {
      return { seo: null };
    }
  },

  head: ({ params, loaderData }) => {
    const seo = loaderData?.seo;
    const url = canonicalUrl(`/novels/${params.slug}/${params.chapter}`);
    const title = seo
      ? `${seo.novelTitle} — الفصل ${seo.chapterNum}: ${seo.chapterTitle} | ${SITE_NAME}`
      : `الفصل ${params.chapter} — ${SITE_NAME}`;
    const desc = seo
      ? `اقرأ الفصل ${seo.chapterNum} من رواية ${seo.novelTitle} للكاتب ${seo.novelAuthor} على ${SITE_NAME}.`
      : `اقرأ الفصل ${params.chapter} على ${SITE_NAME}.`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:type", content: "article" },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: desc },
    ];
    if (seo?.isVip) meta.push({ name: "robots", content: "noindex, follow" });
    if (seo?.cover) {
      meta.push({ property: "og:image", content: seo.cover });
      meta.push({ name: "twitter:image", content: seo.cover });
    }
    const scripts: Array<{ type: string; children: string }> = [];
    if (seo) {
      scripts.push({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: `${seo.novelTitle} — الفصل ${seo.chapterNum}: ${seo.chapterTitle}`,
          author: { "@type": "Person", name: seo.novelAuthor },
          datePublished: seo.created_at,
          dateModified: seo.updated_at,
          image: seo.cover ?? undefined,
          inLanguage: "ar",
          isPartOf: {
            "@type": "Book",
            name: seo.novelTitle,
            url: `${SITE_URL}/novels/${seo.novelSlug}`,
          },
          mainEntityOfPage: url,
        }),
      });
      scripts.push({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "الرئيسية", item: SITE_URL },
            {
              "@type": "ListItem",
              position: 2,
              name: seo.novelTitle,
              item: `${SITE_URL}/novels/${seo.novelSlug}`,
            },
            { "@type": "ListItem", position: 3, name: `الفصل ${seo.chapterNum}`, item: url },
          ],
        }),
      });
    }
    return {
      meta,
      links: [
        { rel: "canonical", href: url },
      ],
      scripts,
    };
  },
});

function ReaderPage() {
  const { slug, chapter } = Route.useParams();
  const navigate = useNavigate();
  const chapterNum = parseInt(chapter, 10);
  const { user } = useAuth();
  const { settings, update, reset } = useReaderSettings();
  const { lang } = usePreferences();

  const [panel, setPanel] = useState<null | "settings" | "toc" | "comments">(null);
  const [uiHidden, setUiHidden] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);
  const [readSeconds, setReadSeconds] = useState(0);
  const awardedRef = useRef<{ read?: boolean; finish?: boolean }>({});
  const articleRef = useRef<HTMLDivElement>(null);


  const q = useQuery({
    queryKey: ["chapter", slug, chapterNum],
    queryFn: () => fetchChapter(slug, chapterNum),
  });
  const chaptersQ = useQuery({
    queryKey: ["chapters", q.data?.novel.id],
    queryFn: () => fetchChapters(q.data!.novel.id),
    enabled: !!q.data?.novel.id,
  });

  const chapterId = q.data?.chapter.id;
  const chVip = q.data?.chapter.is_vip ?? false;
  const price =
    (q.data?.chapter as unknown as { coin_price?: number } | undefined)?.coin_price ?? 0;
  const requiresLock = !!q.data && (chVip || price > 0);

  const vipQ = useQuery({
    queryKey: ["is-vip", user?.id],
    queryFn: isCurrentUserVip,
    enabled: !!user,
  });
  const unlockedQ = useQuery({
    queryKey: ["chapter-unlocked", chapterId, user?.id],
    queryFn: () => isChapterUnlocked(chapterId!),
    enabled: !!user && !!chapterId && requiresLock,
  });
  const novelOwnedQ = useQuery({
    queryKey: ["novel-owned", q.data?.novel.id, user?.id],
    queryFn: () => isNovelOwned(q.data!.novel.id),
    enabled: !!user && !!q.data?.novel.id && requiresLock,
  });
  const isVipMember = !!vipQ.data;
  const hasUnlocked = !!unlockedQ.data;
  const ownsNovel = !!novelOwnedQ.data;
  const canRead = !requiresLock || isVipMember || hasUnlocked || ownsNovel;

  // View + history + streak (only when the user can actually read the chapter)
  // NOTE: no XP here — opening a chapter must not grant XP (see reading-completion effect below).
  useEffect(() => {
    if (!q.data || !canRead) return;
    const cid = q.data.chapter.id;
    const nid = q.data.novel.id;
    incrementChapterView(cid);
    window.scrollTo({ top: 0 });
    setReadSeconds(0);
    awardedRef.current = {};
    if (user) {
      saveReadingProgress({ userId: user.id, novelId: nid, chapterId: cid, progress: 1 }).catch(
        () => {},
      );
      bumpMyStreak().catch(() => {});
    }
  }, [q.data?.chapter.id, user?.id, canRead]);

  // Count active reading time (visible tab only) for the current chapter
  useEffect(() => {
    if (!q.data || !canRead || !user) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") setReadSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [q.data?.chapter.id, canRead, user?.id]);


  // Existing bookmark?
  useEffect(() => {
    if (!user || !q.data) {
      setBookmarkId(null);
      return;
    }
    supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", user.id)
      .eq("chapter_id", q.data.chapter.id)
      .is("paragraph_index", null)
      .maybeSingle()
      .then(({ data }) => setBookmarkId(data?.id ?? null));
  }, [user?.id, q.data?.chapter.id]);

  // Reading progress
  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.scrollHeight - window.innerHeight;
      // Chapter shorter than the viewport: it is fully visible, so it counts as read.
      if (total <= 0) {
        setProgress(100);
        return;
      }
      const scrolled = Math.max(0, -rect.top);
      setProgress(Math.min(100, Math.round((scrolled / total) * 100)));

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
      saveReadingProgress({ userId: user.id, novelId, chapterId, progress }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [progress, q.data?.chapter.id, user?.id]);

  // XP: granted only when the reading conditions are actually met, never on page load.
  // read_chapter  -> read at least 30s of active time AND scrolled past 25%
  // finish_chapter -> reached 90%+ AND read at least 45s of active time
  useEffect(() => {
    if (!user || !q.data || !canRead) return;
    const novelId = q.data.novel.id;
    const chapterId = q.data.chapter.id;
    const meta = { novel_id: novelId, chapter_id: chapterId };
    const readOk = readSeconds >= 30 && progress >= 25;
    const finishOk = readSeconds >= 45 && progress >= 90;
    if (!readOk && !finishOk) return;

    void import("@/hooks/use-gamification")
      .then(({ awardXp }) => {
        if (readOk && !awardedRef.current.read) {
          awardedRef.current.read = true;
          awardXp("read_chapter", `${user.id}:${chapterId}`, meta);
        }
        if (finishOk && !awardedRef.current.finish) {
          awardedRef.current.finish = true;
          awardXp("finish_chapter", `${user.id}:${chapterId}`, meta);
        }
      })
      .catch(() => {});
  }, [readSeconds, progress, q.data?.chapter.id, user?.id, canRead]);


  const chapters = chaptersQ.data ?? [];
  const idx = chapters.findIndex((c) => c.chapter_number === chapterNum);
  const prev = idx > 0 ? chapters[idx - 1] : null;
  const next = idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : null;

  const goPrev = useCallback(() => {
    if (prev)
      navigate({
        to: "/novels/$slug/$chapter",
        params: { slug, chapter: String(prev.chapter_number) },
      });
  }, [prev, slug, navigate]);
  const goNext = useCallback(() => {
    if (next)
      navigate({
        to: "/novels/$slug/$chapter",
        params: { slug, chapter: String(next.chapter_number) },
      });
  }, [next, slug, navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
      )
        return;
      if (e.key === "ArrowLeft")
        goNext(); // RTL: left = next
      else if (e.key === "ArrowRight") goPrev();
      else if (e.key === "f") toggleFullscreen();
      else if (e.key === "h") setUiHidden((v) => !v);
      else if (e.key === "s") setPanel((p) => (p === "settings" ? null : "settings"));
      else if (e.key === "Escape") {
        setPanel(null);
        setUiHidden(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  // Swipe navigation (mobile)
  useEffect(() => {
    let sx = 0,
      sy = 0,
      tx = 0,
      ty = 0;
    const onStart = (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      tx = e.touches[0].clientX;
      ty = e.touches[0].clientY;
    };
    const onEnd = () => {
      const dx = tx - sx,
        dy = ty - sy;
      if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) goNext();
        else goPrev(); // swipe left → next (RTL flow)
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

  const words = useMemo(
    () => (q.data?.chapter.content ?? "").trim().split(/\s+/).length,
    [q.data?.chapter.content],
  );
  const readingMin = Math.max(1, Math.round(words / 220));
  const remainingMin = Math.max(0, Math.round(readingMin * (1 - progress / 100)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chAny = (q.data?.chapter ?? {}) as any;
  useAutoTranslate({
    entityType: "chapter",
    entityId: q.data?.chapter.id ?? "",
    needsTranslation: !!q.data && lang === "en" && (!chAny.title_en || !chAny.content_en),
    invalidateKeys: [["chapter", slug, chapterNum]],
  });

  async function toggleBookmark() {
    if (!user) {
      toast.error("سجل الدخول لحفظ العلامات");
      return;
    }
    if (!q.data) return;
    try {
      if (bookmarkId) {
        await removeBookmark(bookmarkId);
        setBookmarkId(null);
        toast.success("أُزيلت العلامة");
      } else {
        await addBookmark({ novel_id: q.data.novel.id, chapter_id: q.data.chapter.id });
        toast.success("تم حفظ الفصل في العلامات");
        const { data } = await supabase
          .from("bookmarks")
          .select("id")
          .eq("user_id", user.id)
          .eq("chapter_id", q.data.chapter.id)
          .is("paragraph_index", null)
          .maybeSingle();
        setBookmarkId(data?.id ?? null);
      }
    } catch (e: unknown) {
      showError(e);
    }
  }

  async function bookmarkParagraph(pi: number, text: string) {
    if (!user) {
      toast.error("سجل الدخول");
      return;
    }
    if (!q.data) return;
    try {
      await addBookmark({
        novel_id: q.data.novel.id,
        chapter_id: q.data.chapter.id,
        paragraph_index: pi,
        note: text.slice(0, 120),
      });
      toast.success("تم حفظ الفقرة");
    } catch (e: unknown) {
      showError(e);
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }

  if (q.isLoading)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
        جاري التحميل…
      </div>
    );
  if (!q.data)
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center">الفصل غير موجود</div>;

  const { novel, chapter: ch } = q.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nAny = novel as any;
  const chTitle = pickText(chAny.title_ar, chAny.title_en, lang) || ch.title;
  const chContent = pickText(chAny.content_ar, chAny.content_en, lang) || ch.content;
  const novelTitle = pickText(nAny.title_ar, nAny.title_en, lang) || novel.title;
  const authorUsername = (nAny.author_profile?.username as string | undefined) ?? null;
  const authorName =
    (nAny.author_profile?.display_name as string | undefined) || novel.author || "";
  const paragraphs = chContent.split(/\n\s*\n/).filter(Boolean);


  return (
    <div className={`reader-root ${readerThemeClass(settings.theme)}`}>
      {/* Progress bar */}
      <div className="fixed inset-x-0 top-0 z-[60] h-1 bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary-glow transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Top bar */}
      {!uiHidden && (
        <div className="reader-topbar sticky top-0 z-40 backdrop-blur-xl">
          <div className="mx-auto grid max-w-3xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5">
            <Link
              to="/novels/$slug"
              params={{ slug }}
              className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5"
            >
              <Home className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{novelTitle}</div>
              <div className="truncate text-[11px] opacity-70">
                الفصل {chapterNum} — {remainingMin} د متبقية
              </div>
            </div>
            <div className="flex items-center gap-1">
              <IconBtn onClick={toggleBookmark} label="علامة">
                {bookmarkId ? (
                  <BookmarkCheck className="h-4 w-4 text-primary" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </IconBtn>
              <ShareChapter
                slug={slug}
                novelTitle={novelTitle}
                chapterNum={chapterNum}
                chapterTitle={chTitle}
              />
              <IconBtn onClick={() => setPanel(panel === "toc" ? null : "toc")} label="الفصول">
                <List className="h-4 w-4" />
              </IconBtn>
              <IconBtn
                onClick={() => setPanel(panel === "settings" ? null : "settings")}
                label="إعدادات"
              >
                <Settings2 className="h-4 w-4" />
              </IconBtn>
              <IconBtn onClick={() => setUiHidden(true)} label="إخفاء">
                <EyeOff className="h-4 w-4" />
              </IconBtn>
            </div>
          </div>
        </div>
      )}

      {uiHidden && (
        <button
          onClick={() => setUiHidden(false)}
          className="fixed end-4 top-4 z-40 grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70"
        >
          <Eye className="h-4 w-4" />
        </button>
      )}

      <article
        ref={articleRef}
        className="reader-body mx-auto max-w-3xl px-4 pb-24 pt-8"
        style={{
          fontFamily: readerFontFamily(settings.font),
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
          letterSpacing: `${settings.letterSpacing}px`,
        }}
      >
        <AdSlot slot="chapter_top" />
        <AdSlot slot="reader_top" />
        <header className="mb-10 text-center">
          {/* Crawlable breadcrumb: Home → Novel → (Author) → current chapter */}
          <nav
            aria-label="مسار التنقل"
            className="mb-3 flex flex-wrap items-center justify-center gap-1.5 text-xs opacity-70"
          >
            <Link to="/" className="hover:underline">
              الرئيسية
            </Link>
            <span aria-hidden>/</span>
            <Link to="/novels/$slug" params={{ slug }} className="font-semibold hover:underline">
              {novelTitle}
            </Link>
            {authorUsername ? (
              <>
                <span aria-hidden>/</span>
                <Link
                  to="/authors/$username"
                  params={{ username: authorUsername }}
                  className="hover:underline"
                >
                  {authorName}
                </Link>
              </>
            ) : null}
            <span aria-hidden>/</span>
            <span>الفصل {chapterNum}</span>
          </nav>
          <div className="mb-2 text-xs uppercase tracking-widest opacity-60">
            الفصل {chapterNum}
          </div>
          <h1 className="text-2xl font-black md:text-3xl">{chTitle}</h1>
          <div className="mt-3 flex items-center justify-center gap-3 text-xs opacity-60">
            <span>{readingMin} د قراءة</span>
          </div>

        </header>


        {canRead ? (
          <div className="reader-content space-y-5" data-allow-select>
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className="whitespace-pre-line select-text cursor-text rounded-md px-1 py-0.5"
              >
                {p}
              </p>
            ))}

          </div>
        ) : (
          <>
            {/* Free preview: first ~40 words */}
            <div className="reader-content space-y-5 mb-4">
              <p className="whitespace-pre-line opacity-70">
                {paragraphs.join("\n\n").split(/\s+/).slice(0, 40).join(" ")}…
              </p>
            </div>
            <ChapterLock
              chapterId={ch.id}
              price={price > 0 ? price : ch.is_vip ? 30 : 0}
              isVip={ch.is_vip}
              onUnlocked={() => unlockedQ.refetch()}
            />
          </>
        )}

        {/* Prev/Next — real crawlable <a> links (same look as before) */}
        <div className="mt-14 grid grid-cols-2 gap-3">
          {prev ? (
            <Button asChild variant="outline" className="h-auto flex-col items-start py-3">
              <Link
                to="/novels/$slug/$chapter"
                params={{ slug, chapter: String(prev.chapter_number) }}
                rel="prev"
              >
                <span className="flex items-center gap-1 text-xs opacity-70">
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </span>
                <span className="truncate text-sm font-bold">الفصل {prev.chapter_number}</span>
              </Link>
            </Button>
          ) : (
            <Button disabled variant="outline" className="h-auto flex-col items-start py-3">
              <span className="flex items-center gap-1 text-xs opacity-70">
                <ChevronRight className="h-4 w-4" />
                السابق
              </span>
              <span className="truncate text-sm font-bold">لا يوجد</span>
            </Button>
          )}
          {next ? (
            <Button
              asChild
              className="h-auto flex-col items-start bg-gradient-to-r from-primary to-primary-glow py-3 text-primary-foreground"
            >
              <Link
                to="/novels/$slug/$chapter"
                params={{ slug, chapter: String(next.chapter_number) }}
                rel="next"
              >
                <span className="flex items-center gap-1 text-xs opacity-90">
                  التالي
                  <ChevronLeft className="h-4 w-4" />
                </span>
                <span className="truncate text-sm font-bold">الفصل {next.chapter_number}</span>
              </Link>
            </Button>
          ) : (
            <Button
              disabled
              className="h-auto flex-col items-start bg-gradient-to-r from-primary to-primary-glow py-3 text-primary-foreground"
            >
              <span className="flex items-center gap-1 text-xs opacity-90">
                التالي
                <ChevronLeft className="h-4 w-4" />
              </span>
              <span className="truncate text-sm font-bold">النهاية</span>
            </Button>
          )}
        </div>


        <div className="mt-6 flex items-center justify-center gap-2 text-xs opacity-60">
          <span>اسحب لليسار للفصل التالي • Ctrl+H لإخفاء الواجهة</span>
        </div>
        <TextReactionsBar chapterId={ch.id} />
        <AdSlot slot="chapter_bottom" />
        <AdSlot slot="reader_bottom" />
        <ChapterReactionsBar chapterId={ch.id} />
        <div className="mt-10">
          <h2 className="mb-3 text-lg font-black">التعليقات على الفصل</h2>
          <ThreadedComments chapterId={ch.id} novelId={novel.id} />
        </div>
      </article>
      <TextSelectionToolbar
        chapterId={ch.id}
        novelId={novel.id}
        novelTitle={novelTitle}
        containerRef={articleRef}
      />

      {/* Bottom action bar (mobile-first) */}
      {!uiHidden && (
        <div className="reader-bottombar fixed inset-x-0 bottom-0 z-40 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto grid max-w-3xl grid-cols-4 items-center gap-2 px-3 py-2">
            <BottomBtn label="السابق" onClick={goPrev} disabled={!prev}>
              <ChevronRight className="h-5 w-5" />
            </BottomBtn>
            <BottomBtn label="الفصول" onClick={() => setPanel(panel === "toc" ? null : "toc")}>
              <List className="h-5 w-5" />
            </BottomBtn>
            <BottomBtn
              label="التعليقات"
              onClick={() => setPanel(panel === "comments" ? null : "comments")}
            >
              <MessageCircle className="h-5 w-5" />
            </BottomBtn>
            <BottomBtn label="التالي" onClick={goNext} disabled={!next}>
              <ChevronLeft className="h-5 w-5" />
            </BottomBtn>
          </div>
        </div>
      )}

      {/* Slide-in panel */}
      {panel && (
        <>
          <button
            className="fixed inset-0 z-40 bg-black/50 animate-fade-in"
            onClick={() => setPanel(null)}
            aria-label="إغلاق"
          />
          <aside className="fixed inset-y-0 end-0 z-50 flex w-full max-w-sm flex-col bg-popover text-popover-foreground shadow-2xl animate-slide-in-right pb-[env(safe-area-inset-bottom)]">
            <header className="flex items-center justify-between border-b border-border/60 p-3">
              <div className="text-sm font-bold">
                {panel === "settings"
                  ? "إعدادات القراءة"
                  : panel === "toc"
                    ? `الفصول (${chapters.length})`
                    : "التعليقات"}
              </div>
              <button
                onClick={() => setPanel(null)}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {panel === "settings" && (
                <ReaderSettingsPanel
                  settings={settings}
                  update={update}
                  reset={reset}
                  onToggleFullscreen={toggleFullscreen}
                />
              )}
              {panel === "toc" && (
                <div className="p-2">
                  {chapters.map((c) => (
                    <Link
                      key={c.id}
                      to="/novels/$slug/$chapter"
                      params={{ slug, chapter: String(c.chapter_number) }}
                      onClick={() => setPanel(null)}
                      className={`block rounded-md px-3 py-2 text-sm ${c.chapter_number === chapterNum ? "bg-primary text-primary-foreground font-bold" : "hover:bg-secondary"}`}
                    >
                      <div className="truncate">
                        الفصل {c.chapter_number}: {c.title}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {panel === "comments" && q.data && (
                <div className="p-3">
                  <ThreadedComments chapterId={ch.id} novelId={novel.id} />
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5"
    >
      {children}
    </button>
  );
}

function BottomBtn({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid place-items-center gap-0.5 rounded-lg py-2 text-[11px] font-semibold opacity-90 transition hover:bg-white/5 disabled:opacity-30"
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

