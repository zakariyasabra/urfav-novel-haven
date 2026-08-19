import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdSlot } from "@/components/ad-slot";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Flame, Sparkles, TrendingUp, Star, Clock } from "lucide-react";
import { fetchNovels, fetchLatestChapters, fetchGenres } from "@/lib/api";
import { fetchHomepageSections } from "@/lib/monetization-api";
import { fetchRecommendationSection } from "@/lib/recommendations-api";
import { NovelCard } from "@/components/novel-card";
import { coverUrl, heroes } from "@/lib/covers";
import { useTimeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { DynamicHomeSections } from "@/components/home/dynamic-sections";
import { ContinueReadingHome } from "@/components/home/continue-reading";
import { RecommendationRow } from "@/components/recommendations/recommendation-row";
import { useAuth } from "@/hooks/use-auth";
import { useT, usePreferences } from "@/i18n/provider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FAVNOL — منصة قراءة الروايات العربية والمترجمة" },
      {
        name: "description",
        content:
          "اقرأ الروايات المترجمة والعربية مع فصول جديدة كل يوم: فانتازيا، أكشن، رومانسي، خيال علمي وأكثر — مع حفظ تقدّمك ووضع ليلي مريح.",
      },
      { property: "og:title", content: "FAVNOL — منصة قراءة الروايات العربية والمترجمة" },
      {
        property: "og:description",
        content: "فصول جديدة كل يوم، تصنيفات متنوعة، وقراءة مريحة بالعربية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      // Preload the first existing hero image as the LCP candidate.
      {
        rel: "preload",
        as: "image",
        href: heroes[0],
        fetchPriority: "high",
      },
    ],
  }),
  // Warm the public homepage queries on the server so the first paint already
  // contains the content (keeps CLS at 0). The wait is capped: previously the
  // HTML response waited on all 7 round-trips, which is what pushed mobile FCP
  // to 8.6s. Anything slower than the cap simply hydrates on the client into
  // its already-sized skeleton, so layout stability is unaffected.
  loader: async ({ context: { queryClient } }) => {
    // Above-the-fold / early sections — worth a short wait.
    const critical = [
      queryClient.prefetchQuery({
        queryKey: ["homepage-sections"],
        queryFn: () => fetchHomepageSections(false),
        staleTime: 60_000,
      }),
      ...(["trending_today", "recently_updated"] as const).map((s) =>
        queryClient.prefetchQuery({
          queryKey: ["rec", s, 12, "anon"],
          queryFn: () => fetchRecommendationSection(s, 12),
          staleTime: 60_000,
        }),
      ),
    ];
    // Far-below-the-fold sections stay client-side: warming them here mutated
    // the cache after the HTML was rendered, which produced hydration
    // mismatches (server skeleton vs. client data) and cost nothing visually.
    await Promise.race([
      Promise.all(critical.map((p) => p.catch(() => undefined))),
      new Promise((r) => setTimeout(r, 1200)),
    ]);

  },
  component: HomePage,
});

/**
 * Signed-in readers don't need the marketing hero: we detect a stored session
 * right after hydration (no network wait) so the hero doesn't flash before the
 * auth context resolves. Guests keep the exact same experience as before.
 */
function useHasStoredSession() {
  const [has, setHas] = useState(false);
  useEffect(() => {
    try {
      const found = Object.keys(window.localStorage).some(
        (k) => k.startsWith("sb-") && k.endsWith("-auth-token"),
      );
      if (found) setHas(true);
    } catch {
      /* storage blocked */
    }
  }, []);
  return has;
}

function HomePage() {
  const t = useT();
  const { lang } = usePreferences();
  const { user } = useAuth();
  const isAuthed = !!user;
  const timeAgo = useTimeAgo();
  const hasStoredSession = useHasStoredSession();
  const showHero = !isAuthed && !hasStoredSession;

  const dynamicSections = useQuery({
    queryKey: ["homepage-sections"],
    queryFn: () => fetchHomepageSections(false),
    staleTime: 60_000,
  });
  const useDynamic = (dynamicSections.data?.length ?? 0) > 0;

  const trending = useQuery({
    queryKey: ["novels", "popular", 6],
    queryFn: () => fetchNovels({ sort: "popular", limit: 6 }),
    enabled: !useDynamic,
  });
  const latest = useQuery({
    queryKey: ["novels", "latest", 12],
    queryFn: () => fetchNovels({ sort: "latest", limit: 12 }),
    enabled: !useDynamic,
  });
  const recent = useQuery({
    queryKey: ["novels", "newest", 6],
    queryFn: () => fetchNovels({ sort: "newest", limit: 6 }),
    enabled: !useDynamic,
  });
  const topRated = useQuery({
    queryKey: ["novels", "rating", 6],
    queryFn: () => fetchNovels({ sort: "rating", limit: 6 }),
    enabled: !useDynamic,
  });
  const latestChapters = useQuery({
    queryKey: ["latest-chapters", 10],
    queryFn: () => fetchLatestChapters(10),
  });
  const genres = useQuery({ queryKey: ["genres"], queryFn: fetchGenres });

  return (
    <div>
      {showHero && <HeroCarousel />}

      <div
        className={`mx-auto max-w-7xl space-y-12 px-4 sm:space-y-16 ${
          showHero ? "py-10 sm:py-16" : "pb-10 pt-6 sm:pb-16 sm:pt-8"
        }`}
      >
        <AdSlot slot="homepage_top" />
        <AdSlot slot="home_top" />
        <ContinueReadingHome />


        {/* Phase 5A — Personalized recommendation rows */}
        <RecommendationRow
          section="for_you"
          titleKey="home.section.forYou"
          requiresAuth
          isAuthed={isAuthed}
        />
        <RecommendationRow
          section="because_you_read"
          titleKey="home.section.becauseYouRead"
          requiresAuth
          isAuthed={isAuthed}
        />
        <AdSlot slot="home_mid" />
        <AdSlot slot="home_middle" />
        <RecommendationRow
          section="trending_today"
          titleKey="home.section.trendingToday"
          viewAll="/popular"
        />
        <RecommendationRow
          section="recently_updated"
          titleKey="home.section.recentlyUpdated"
          viewAll="/latest"
        />
        <RecommendationRow
          section="from_followed_authors"
          titleKey="home.section.fromFollowedAuthors"
          requiresAuth
          isAuthed={isAuthed}
        />
        <RecommendationRow
          section="readers_like_you"
          titleKey="home.section.readersLikeYou"
          requiresAuth
          isAuthed={isAuthed}
        />
        <RecommendationRow
          section="popular_week"
          titleKey="home.section.popularWeek"
          viewAll="/popular"
        />
        <RecommendationRow section="hidden_gems" titleKey="home.section.hiddenGems" />

        {useDynamic && <DynamicHomeSections />}
        {!useDynamic && (
          <>
            <Section
              title={t("home.section.trending")}
              icon={<Flame className="text-primary" />}
              viewAll="/popular"
              viewAllLabel={t("common.viewAll")}
            >
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
                {(trending.data ?? []).map((n) => (
                  <NovelCard key={n.slug} novel={n} priority />
                ))}
              </div>
            </Section>

            <Section
              title={t("home.section.latestChapters")}
              icon={<Clock className="text-primary" />}
              viewAll="/latest"
              viewAllLabel={t("common.viewAll")}
            >
              <div className="grid gap-3 md:grid-cols-2">
                {(latestChapters.data ?? []).map((c) => (
                  <Link
                    key={c.id}
                    to="/novels/$slug/$chapter"
                    params={{ slug: c.novel.slug, chapter: String(c.chapter_number) }}
                    className="group flex items-center gap-3 rounded-xl border border-border/40 bg-surface/40 p-3 transition-colors hover:border-primary/50 hover:bg-surface"
                  >
                    <img
                      src={coverUrl(c.novel.cover_url)}
                      alt=""
                      className="h-16 w-12 rounded object-cover"
                      loading="lazy"
                      width={48}
                      height={64}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold group-hover:text-primary">
                        {c.novel.title}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {t("novel.chapter", { n: c.chapter_number })} — {c.title}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</div>
                  </Link>
                ))}
              </div>
            </Section>

            <Section
              title={t("home.section.recentlyAdded")}
              icon={<Sparkles className="text-primary" />}
              viewAllLabel={t("common.viewAll")}
            >
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
                {(recent.data ?? []).map((n) => (
                  <NovelCard key={n.slug} novel={n} />
                ))}
              </div>
            </Section>

            <div className="grid gap-10 lg:grid-cols-2">
              <Section
                title={t("home.section.mostViewed")}
                icon={<TrendingUp className="text-primary" />}
                viewAll="/popular"
                viewAllLabel={t("common.viewAll")}
              >
                <div className="grid grid-cols-3 gap-4">
                  {(trending.data ?? []).slice(0, 3).map((n) => (
                    <NovelCard key={n.slug} novel={n} />
                  ))}
                </div>
              </Section>
              <Section
                title={t("home.section.topRated")}
                icon={<Star className="text-primary" />}
                viewAllLabel={t("common.viewAll")}
              >
                <div className="grid grid-cols-3 gap-4">
                  {(topRated.data ?? []).slice(0, 3).map((n) => (
                    <NovelCard key={n.slug} novel={n} />
                  ))}
                </div>
              </Section>
            </div>

            <Section
              title={t("home.section.byCategory")}
              icon={<ChevronLeft className="text-primary" />}
              viewAll="/categories"
              viewAllLabel={t("common.viewAll")}
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8">
                {(genres.data ?? []).map((g) => (
                  <Link
                    key={g.slug}
                    to="/categories/$slug"
                    params={{ slug: g.slug }}
                    className="group rounded-xl border border-border/40 bg-surface/60 p-4 text-center transition-all hover:border-primary hover:bg-primary/10"
                  >
                    <div className="text-sm font-bold group-hover:text-primary">
                      {lang === "en" ? g.name_en || g.name_ar : g.name_ar}
                    </div>
                  </Link>
                ))}
              </div>
            </Section>

            <Section
              title={t("home.section.allNovels")}
              icon={<Clock className="text-primary" />}
              viewAllLabel={t("common.viewAll")}
            >
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {(latest.data ?? []).map((n) => (
                  <NovelCard key={n.slug} novel={n} />
                ))}
              </div>
            </Section>
            <AdSlot slot="home_bottom" />
          </>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  viewAll,
  viewAllLabel,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  viewAll?: string;
  viewAllLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:mb-5">
        <h2 className="flex min-w-0 items-center gap-2 text-xl font-black sm:text-2xl md:text-3xl">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10">
            {icon}
          </span>
          <span className="truncate">{title}</span>
        </h2>
        {viewAll && (
          <Link
            to={viewAll as "/"}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:text-primary-glow sm:text-sm"
          >
            {viewAllLabel} <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
