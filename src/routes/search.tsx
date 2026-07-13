import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, X, TrendingUp, History } from "lucide-react";
import { searchNovels, fetchGenres } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { NovelGrid } from "@/components/novel-card";
import { useAuth } from "@/hooks/use-auth";
import { logSearch, fetchMySearchHistory, fetchTrendingSearches } from "@/lib/admin-api";
import { useT, usePreferences } from "@/i18n/provider";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: (s.q as string) ?? "",
    genre: (s.genre as string) ?? "",
    status: (s.status as string) ?? "",
    tag: (s.tag as string) ?? "",
    sort: (s.sort as string) ?? "latest",
    author: (s.author as string) ?? "",
    tier: (s.tier as string) ?? "",
  }),
  head: () => ({ meta: [{ title: "Search — UR Fav Novel" }, { name: "description", content: "Search by genre, status, tag and more." }] }),
  component: SearchPage,
});

function SearchPage() {
  const t = useT();
  const { lang } = usePreferences();
  const initial = Route.useSearch();
  const { user } = useAuth();
  const [q, setQ] = useState(initial.q);
  const [genre, setGenre] = useState(initial.genre);
  const [status, setStatus] = useState(initial.status);
  const [tag, setTag] = useState(initial.tag);
  const [author, setAuthor] = useState(initial.author);
  const [tier, setTier] = useState(initial.tier);
  const [sort, setSort] = useState(initial.sort);
  const [openFilters, setOpenFilters] = useState(false);

  const trendingQ = useQuery({ queryKey: ["trending-searches"], queryFn: () => fetchTrendingSearches(8) });
  const historyQ = useQuery({ queryKey: ["my-search-history", user?.id], queryFn: () => fetchMySearchHistory(8), enabled: !!user });

  useEffect(() => {
    if (!q.trim() || q.trim().length < 2) return;
    const timer = setTimeout(() => { logSearch(q.trim()).catch(() => {}); }, 1200);
    return () => clearTimeout(timer);
  }, [q]);

  const genresQ = useQuery({ queryKey: ["genres"], queryFn: fetchGenres });
  const tagsQ = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data } = await supabase.from("tags").select("slug,name_ar,name_en").order("name_ar").limit(50);
      return (data ?? []) as { slug: string; name_ar: string; name_en: string | null }[];
    },
  });

  const results = useQuery({
    queryKey: ["search-adv", q, genre, status, tag, author, tier, sort],
    queryFn: async () => {
      let base = await searchNovels(q, { genre: genre || undefined, status: status || undefined, sort });
      if (author.trim()) {
        const a = author.trim().toLowerCase();
        base = base.filter((n) => n.author.toLowerCase().includes(a));
      }
      if (tag) {
        const { data: gtag } = await supabase.from("tags").select("id").eq("slug", tag).maybeSingle();
        if (gtag) {
          const { data: nt } = await supabase.from("novel_tags").select("novel_id").eq("tag_id", (gtag as { id: string }).id);
          const allow = new Set((nt ?? []).map((r: { novel_id: string }) => r.novel_id));
          base = base.filter((n) => allow.has(n.id));
        } else base = [];
      }
      return base;
    },
  });

  function clearFilters() {
    setGenre(""); setStatus(""); setTag(""); setAuthor(""); setTier(""); setSort("latest");
  }
  const activeCount = [genre, status, tag, author, tier].filter(Boolean).length + (sort !== "latest" ? 1 : 0);
  const localizedName = (r: { name_ar: string; name_en?: string | null }) => lang === "en" ? (r.name_en || r.name_ar) : r.name_ar;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-black md:text-4xl">{t("search.title")}</h1>

      <div className="rounded-2xl border border-border/40 bg-gradient-to-b from-surface/60 to-surface/30 p-4 shadow-elevated">
        <div className="relative">
          <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={t("search.placeholder")}
            className="h-12 w-full rounded-xl border border-input bg-background/60 ps-4 pe-10 text-base outline-none transition-colors focus:border-primary" />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button onClick={() => setOpenFilters((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${openFilters || activeCount ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"}`}>
            <SlidersHorizontal className="h-4 w-4" />{t("search.filters")} {activeCount ? <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">{activeCount}</span> : null}
          </button>
          {activeCount > 0 && (
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground">
              <X className="me-1 inline h-3 w-3" />{t("search.clearFilters")}
            </button>
          )}
          <div className="ms-auto">
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="h-9 rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary">
              <option value="latest">{t("search.sort.latest")}</option>
              <option value="popular">{t("search.sort.popular")}</option>
              <option value="rating">{t("search.sort.rating")}</option>
              <option value="newest">{t("search.sort.newest")}</option>
            </select>
          </div>
        </div>

        {openFilters && (
          <div className="mt-4 grid gap-3 border-t border-border/40 pt-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
            <Field label={t("search.field.genre")}>
              <select value={genre} onChange={(e) => setGenre(e.target.value)} className="field">
                <option value="">{t("search.opt.allGenres")}</option>
                {(genresQ.data ?? []).map((g) => <option key={g.slug} value={g.slug}>{localizedName(g)}</option>)}
              </select>
            </Field>
            <Field label={t("search.field.status")}>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="field">
                <option value="">{t("search.opt.allStatuses")}</option>
                <option value="ongoing">{t("novel.status.ongoing")}</option>
                <option value="completed">{t("novel.status.completed")}</option>
                <option value="hiatus">{t("novel.status.hiatus")}</option>
              </select>
            </Field>
            <Field label={t("search.field.tag")}>
              <select value={tag} onChange={(e) => setTag(e.target.value)} className="field">
                <option value="">{t("search.opt.allTags")}</option>
                {(tagsQ.data ?? []).map((tg) => <option key={tg.slug} value={tg.slug}>{localizedName(tg)}</option>)}
              </select>
            </Field>
            <Field label={t("search.field.author")}>
              <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder={t("search.opt.authorPh")} className="field" />
            </Field>
            <Field label={t("search.field.tier")}>
              <select value={tier} onChange={(e) => setTier(e.target.value)} className="field">
                <option value="">{t("search.opt.all")}</option>
                <option value="free">{t("search.opt.free")}</option>
                <option value="vip">{t("search.opt.vip")}</option>
              </select>
            </Field>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {results.isLoading ? t("common.searching") : t("common.results", { count: results.data?.length ?? 0 })}
        </div>
      </div>

      {!q.trim() && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(trendingQ.data?.length ?? 0) > 0 && (
            <div className="rounded-2xl border border-border/40 bg-surface/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-black"><TrendingUp className="h-4 w-4 text-primary" />{t("search.trending")}</div>
              <div className="flex flex-wrap gap-2">
                {(trendingQ.data ?? []).map((tr) => (
                  <button key={tr.query} onClick={() => setQ(tr.query)}
                    className="rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs hover:border-primary hover:text-primary">
                    {tr.query} <span className="text-[10px] text-muted-foreground">({tr.hits})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {user && (historyQ.data?.length ?? 0) > 0 && (
            <div className="rounded-2xl border border-border/40 bg-surface/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-black"><History className="h-4 w-4 text-primary" />{t("search.myHistory")}</div>
              <div className="flex flex-wrap gap-2">
                {(historyQ.data ?? []).map((h) => (
                  <button key={h} onClick={() => setQ(h)}
                    className="rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs hover:border-primary hover:text-primary">
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        {results.isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="aspect-[2/3] rounded-lg bg-surface" />
                <div className="h-3 w-3/4 rounded bg-surface" />
              </div>
            ))}
          </div>
        ) : (results.data?.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-surface/30 p-16 text-center">
            <div className="text-lg font-bold">{t("search.noResults")}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t("search.noResultsHint")}</div>
          </div>
        ) : (
          <NovelGrid novels={results.data ?? []} />
        )}
      </div>

      <style>{`.field{width:100%;height:2.5rem;padding:0 0.75rem;border-radius:0.5rem;border:1px solid var(--input);background:color-mix(in oklab, var(--background) 60%, transparent);font-size:0.875rem;outline:none;color:inherit}.field:focus{border-color:var(--primary)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
