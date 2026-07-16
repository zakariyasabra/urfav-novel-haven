import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, Sparkles, TrendingUp, Star, Clock } from "lucide-react";
import { fetchNovels, fetchLatestChapters, fetchGenres } from "@/lib/api";
import { fetchHomepageSections } from "@/lib/monetization-api";
import { NovelCard } from "@/components/novel-card";
import { heroes, coverUrl } from "@/lib/covers";
import { useTimeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { DynamicHomeSections } from "@/components/home/dynamic-sections";
import { ContinueReadingHome } from "@/components/home/continue-reading";
import { useT, usePreferences } from "@/i18n/provider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UR Fav Novel — منصة قراءة الروايات " },
      { name: "description", content: "اقرأ آلاف الروايات  : فانتازيا، أكشن، رومانسي، تنمية ذاتية، خيال علمي وأكثر." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const t = useT();
  const { lang } = usePreferences();
  const timeAgo = useTimeAgo();
  const [slide, setSlide] = useState(0);

  const heroSlides = [
    { img: heroes[0], title: t("home.hero1.title"), subtitle: t("home.hero1.subtitle") },
    { img: heroes[1], title: t("home.hero2.title"), subtitle: t("home.hero2.subtitle") },
    { img: heroes[2], title: t("home.hero3.title"), subtitle: t("home.hero3.subtitle") },
  ];

  useEffect(() => {
    const tm = setInterval(() => setSlide((s) => (s + 1) % heroSlides.length), 6000);
    return () => clearInterval(tm);
  }, [heroSlides.length]);

  const dynamicSections = useQuery({ queryKey: ["homepage-sections"], queryFn: () => fetchHomepageSections(false), staleTime: 60_000 });
  const useDynamic = (dynamicSections.data?.length ?? 0) > 0;

  const trending = useQuery({ queryKey: ["novels", "popular", 6], queryFn: () => fetchNovels({ sort: "popular", limit: 6 }), enabled: !useDynamic });
  const latest = useQuery({ queryKey: ["novels", "latest", 12], queryFn: () => fetchNovels({ sort: "latest", limit: 12 }), enabled: !useDynamic });
  const recent = useQuery({ queryKey: ["novels", "newest", 6], queryFn: () => fetchNovels({ sort: "newest", limit: 6 }), enabled: !useDynamic });
  const topRated = useQuery({ queryKey: ["novels", "rating", 6], queryFn: () => fetchNovels({ sort: "rating", limit: 6 }), enabled: !useDynamic });
  const latestChapters = useQuery({ queryKey: ["latest-chapters", 10], queryFn: () => fetchLatestChapters(10) });
  const genres = useQuery({ queryKey: ["genres"], queryFn: fetchGenres });

  const s = heroSlides[slide];

  return (
    <div>
      <section className="relative h-[460px] w-full overflow-hidden sm:h-[520px] md:h-[620px]">
        {heroSlides.map((hs, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === slide ? "opacity-100" : "opacity-0"}`}
          >
            <img src={hs.img} alt="" className="h-full w-full object-cover" width={1920} height={1080} />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
            <div className="absolute inset-0 bg-gradient-to-l from-background/80 via-transparent to-transparent" />
          </div>
        ))}
        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-12 sm:pb-16">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
              <Sparkles className="h-3.5 w-3.5" /> {t("home.badge")}
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl md:text-6xl">
              <span className="text-gradient-primary">{s.title}</span>
            </h1>
            <p className="mt-3 text-base text-muted-foreground sm:mt-4 sm:text-lg md:text-xl">{s.subtitle}</p>
            <div className="mt-5 flex flex-wrap gap-2 sm:mt-6 sm:gap-3">
              <Button asChild size="lg" className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:opacity-90">
                <Link to="/latest">{t("home.startReading")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary/40">
                <Link to="/categories">{t("home.browseCategories")}</Link>
              </Button>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 sm:mt-8">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`h-1.5 rounded-full transition-all ${i === slide ? "w-8 bg-primary" : "w-4 bg-white/30 hover:bg-white/60"}`}
                aria-label={t("home.slide", { n: i + 1 })}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:space-y-16 sm:py-16">
        <ContinueReadingHome />
        {useDynamic && <DynamicHomeSections />}
        {!useDynamic && (<>
          <Section title={t("home.section.trending")} icon={<Flame className="text-primary" />} viewAll="/popular" viewAllLabel={t("common.viewAll")}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
              {(trending.data ?? []).map((n) => <NovelCard key={n.slug} novel={n} priority />)}
            </div>
          </Section>

          <Section title={t("home.section.latestChapters")} icon={<Clock className="text-primary" />} viewAll="/latest" viewAllLabel={t("common.viewAll")}>
            <div className="grid gap-3 md:grid-cols-2">
              {(latestChapters.data ?? []).map((c) => (
                <Link
                  key={c.id}
                  to="/novels/$slug/$chapter"
                  params={{ slug: c.novel.slug, chapter: String(c.chapter_number) }}
                  className="group flex items-center gap-3 rounded-xl border border-border/40 bg-surface/40 p-3 transition-colors hover:border-primary/50 hover:bg-surface"
                >
                  <img src={coverUrl(c.novel.cover_url)} alt="" className="h-16 w-12 rounded object-cover" loading="lazy" width={48} height={64} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold group-hover:text-primary">{c.novel.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{t("novel.chapter", { n: c.chapter_number })} — {c.title}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</div>
                </Link>
              ))}
            </div>
          </Section>

          <Section title={t("home.section.recentlyAdded")} icon={<Sparkles className="text-primary" />} viewAllLabel={t("common.viewAll")}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
              {(recent.data ?? []).map((n) => <NovelCard key={n.slug} novel={n} />)}
            </div>
          </Section>

          <div className="grid gap-10 lg:grid-cols-2">
            <Section title={t("home.section.mostViewed")} icon={<TrendingUp className="text-primary" />} viewAll="/popular" viewAllLabel={t("common.viewAll")}>
              <div className="grid grid-cols-3 gap-4">
                {(trending.data ?? []).slice(0, 3).map((n) => <NovelCard key={n.slug} novel={n} />)}
              </div>
            </Section>
            <Section title={t("home.section.topRated")} icon={<Star className="text-primary" />} viewAllLabel={t("common.viewAll")}>
              <div className="grid grid-cols-3 gap-4">
                {(topRated.data ?? []).slice(0, 3).map((n) => <NovelCard key={n.slug} novel={n} />)}
              </div>
            </Section>
          </div>

          <Section title={t("home.section.byCategory")} icon={<ChevronLeft className="text-primary" />} viewAll="/categories" viewAllLabel={t("common.viewAll")}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8">
              {(genres.data ?? []).map((g) => (
                <Link
                  key={g.slug}
                  to="/categories/$slug"
                  params={{ slug: g.slug }}
                  className="group rounded-xl border border-border/40 bg-surface/60 p-4 text-center transition-all hover:border-primary hover:bg-primary/10"
                >
                  <div className="text-sm font-bold group-hover:text-primary">{lang === "en" ? (g.name_en || g.name_ar) : g.name_ar}</div>
                </Link>
              ))}
            </div>
          </Section>

          <Section title={t("home.section.allNovels")} icon={<Clock className="text-primary" />} viewAllLabel={t("common.viewAll")}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {(latest.data ?? []).map((n) => <NovelCard key={n.slug} novel={n} />)}
            </div>
          </Section>
        </>)}
      </div>
    </div>
  );
}

function Section({ title, icon, viewAll, viewAllLabel, children }: { title: string; icon: React.ReactNode; viewAll?: string; viewAllLabel: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:mb-5">
        <h2 className="flex min-w-0 items-center gap-2 text-xl font-black sm:text-2xl md:text-3xl">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10">{icon}</span>
          <span className="truncate">{title}</span>
        </h2>
        {viewAll && (
          <Link to={viewAll as "/"} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:text-primary-glow sm:text-sm">
            {viewAllLabel} <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
