import { useQuery } from "@tanstack/react-query";
import { Flame, Sparkles, TrendingUp, Star, Clock, BookOpen, CheckCircle, Play, ChevronRight, Shuffle, Tag } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { NovelCard } from "@/components/novel-card";
import { fetchNovels, fetchNovelsByGenre, type Novel } from "@/lib/api";
import { fetchHomepageSections, type HomepageSection } from "@/lib/monetization-api";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  flame: Flame, sparkles: Sparkles, trending: TrendingUp, star: Star, clock: Clock,
  book: BookOpen, completed: CheckCircle, play: Play, shuffle: Shuffle, tag: Tag,
};

function iconFor(section: HomepageSection): React.ReactNode {
  if (section.icon && ICON_MAP[section.icon]) {
    const C = ICON_MAP[section.icon]; return <C className="text-primary" />;
  }
  const byAlgo: Record<string, React.ComponentType<{ className?: string }>> = {
    latest: Clock, popular: Flame, top_rated: Star, completed: CheckCircle,
    ongoing: Play, trending: TrendingUp, upcoming: Sparkles, random: Shuffle, genre: Tag,
  };
  const C = byAlgo[section.algorithm] ?? BookOpen;
  return <C className="text-primary" />;
}

async function fetchForSection(s: HomepageSection): Promise<Novel[]> {
  const lim = s.limit_count;
  switch (s.algorithm) {
    case "latest": return fetchNovels({ sort: "latest", limit: lim });
    case "popular": return fetchNovels({ sort: "popular", limit: lim });
    case "top_rated": return fetchNovels({ sort: "rating", limit: lim });
    case "completed": return fetchNovels({ status: "completed", sort: "popular", limit: lim });
    case "ongoing": return fetchNovels({ status: "ongoing", sort: "latest", limit: lim });
    case "trending": return fetchNovels({ sort: "popular", limit: lim });
    case "upcoming": return fetchNovels({ sort: "newest", limit: lim });
    case "random": {
      const all = await fetchNovels({ sort: "latest", limit: 60 });
      return [...all].sort(() => Math.random() - 0.5).slice(0, lim);
    }
    case "genre": return s.genre_slug ? (await fetchNovelsByGenre(s.genre_slug)).slice(0, lim) : [];
    default: return fetchNovels({ sort: "latest", limit: lim });
  }
}

export function DynamicHomeSections() {
  const q = useQuery({ queryKey: ["homepage-sections"], queryFn: () => fetchHomepageSections(false) });
  const sections = q.data ?? [];
  if (sections.length === 0) return null;
  return (
    <div className="space-y-16">
      {sections.map((s) => <DynamicSection key={s.id} section={s} />)}
    </div>
  );
}

function DynamicSection({ section }: { section: HomepageSection }) {
  const q = useQuery({
    queryKey: ["hp-section", section.id, section.algorithm, section.genre_slug, section.limit_count],
    queryFn: () => fetchForSection(section),
    staleTime: 60_000,
  });
  const items = q.data ?? [];
  if (items.length === 0 && !q.isLoading) return null;
  const viewAll = section.algorithm === "genre" && section.genre_slug ? `/categories/${section.genre_slug}` :
    section.algorithm === "popular" || section.algorithm === "trending" ? "/popular" :
    section.algorithm === "completed" ? "/completed" :
    section.algorithm === "ongoing" ? "/ongoing" : "/latest";
  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-2xl font-black md:text-3xl">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10">{iconFor(section)}</span>
            {section.title}
          </h2>
          {section.subtitle && <p className="mt-1 text-sm text-muted-foreground">{section.subtitle}</p>}
        </div>
        <Link to={viewAll} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:text-primary-glow">
          {t("common.viewAll")} <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((n) => <NovelCard key={n.slug} novel={n} />)}
      </div>
    </section>
  );
}
