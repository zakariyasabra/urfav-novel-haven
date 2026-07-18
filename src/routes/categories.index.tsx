import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, BookOpen, Search as SearchIcon } from "lucide-react";
import { fetchGenres } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useT, usePreferences } from "@/i18n/provider";

export const Route = createFileRoute("/categories/")({
  head: () => ({
    meta: [
      { title: "التصنيفات — FAVNOL" },
      { name: "description", content: "تصفح الروايات حسب التصنيف: فانتازيا، أكشن، رومانسي، خيال علمي وأكثر." },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const t = useT();
  const { lang } = usePreferences();
  const genresQ = useQuery({ queryKey: ["genres"], queryFn: fetchGenres });

  const countsQ = useQuery({
    queryKey: ["genre-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("novel_genres").select("genre_id");
      const map: Record<string, number> = {};
      for (const row of (data ?? []) as { genre_id: string }[]) {
        map[row.genre_id] = (map[row.genre_id] ?? 0) + 1;
      }
      return map;
    },
    staleTime: 60_000,
  });

  const genres = genresQ.data ?? [];
  const counts = countsQ.data ?? {};
  const totalNovels = Object.values(counts).reduce((a, b) => a + b, 0);

  // Deterministic accent per category (subtle color variation)
  const accents = [
    "from-orange-500/20 to-amber-500/5 border-orange-500/30",
    "from-rose-500/20 to-pink-500/5 border-rose-500/30",
    "from-violet-500/20 to-indigo-500/5 border-violet-500/30",
    "from-cyan-500/20 to-sky-500/5 border-cyan-500/30",
    "from-emerald-500/20 to-teal-500/5 border-emerald-500/30",
    "from-fuchsia-500/20 to-purple-500/5 border-fuchsia-500/30",
    "from-yellow-500/20 to-orange-500/5 border-yellow-500/30",
    "from-blue-500/20 to-indigo-500/5 border-blue-500/30",
  ];

  return (
    <div className="relative">
      {/* Ambient backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] overflow-hidden">
        <div className="absolute -top-32 start-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -top-24 end-10 h-72 w-72 rounded-full bg-primary-glow/15 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        {/* Header */}
        <header className="mb-10 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
            <Sparkles className="h-3.5 w-3.5" /> {t("categories.title")}
          </div>
          <h1 className="text-3xl font-black leading-tight sm:text-4xl md:text-5xl">
            <span className="text-gradient-primary">{t("categories.title")}</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            {t("common.results", { count: totalNovels })} · {genres.length}
          </p>
        </header>

        {/* Grid */}
        {genresQ.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface/60" />
            ))}
          </div>
        ) : genres.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-surface/30 p-16 text-center">
            <SearchIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <div className="text-lg font-bold">{t("search.noResults")}</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {genres.map((g, idx) => {
              const primary = lang === "en" ? (g.name_en || g.name_ar) : g.name_ar;
              const secondary = lang === "en" ? g.name_ar : g.name_en;
              const count = counts[g.id] ?? 0;
              const accent = accents[idx % accents.length];
              return (
                <Link
                  key={g.slug}
                  to="/categories/$slug"
                  params={{ slug: g.slug }}
                  className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${accent} p-5 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                >
                  <div className="mb-8 grid h-10 w-10 place-items-center rounded-xl bg-background/40 backdrop-blur-sm ring-1 ring-border/40 transition-transform group-hover:scale-110">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-base font-black leading-tight group-hover:text-primary sm:text-lg">
                      {primary}
                    </div>
                    {secondary && secondary !== primary && (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">{secondary}</div>
                    )}
                    <div className="mt-2 text-xs font-semibold text-muted-foreground">
                      {t("common.results", { count })}
                    </div>
                  </div>
                  <div aria-hidden className="pointer-events-none absolute -end-6 -bottom-6 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition-opacity group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
