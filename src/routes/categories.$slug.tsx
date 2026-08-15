import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Sparkles, Flame, Clock, ArrowLeft } from "lucide-react";
import { fetchNovelsByGenre } from "@/lib/api";
import { getCategoryBySlug } from "@/lib/categories-api";
import { NovelGrid } from "@/components/novel-card";
import { usePreferences, useT } from "@/i18n/provider";
import { getTaxonomyCategory, pickLocalized } from "@/lib/taxonomy";
import { fetchCategoryTags, fetchNovelIdsByTags } from "@/lib/novel-taxonomy-api";

export const Route = createFileRoute("/categories/$slug")({
  head: ({ params }) => {
    const tax = getTaxonomyCategory(params.slug);
    const title = tax ? `${tax.name_ar} — FAVNOL` : `${params.slug} — FAVNOL`;
    const description =
      tax?.description_ar || `تصفح روايات تصنيف ${params.slug} على FAVNOL.`;
    const meta: Array<{ title?: string; name?: string; property?: string; content?: string }> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ];
    if (tax?.cover_url) {
      meta.push({ property: "og:image", content: tax.cover_url });
      meta.push({ name: "twitter:image", content: tax.cover_url });
    }
    return { meta };
  },
  component: GenrePage,
});

const PAGE_SIZE = 24;

function GenrePage() {
  const { slug } = Route.useParams();
  const { lang } = usePreferences();
  const t = useT();
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const [page, setPage] = useState(1);
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const catQ = useQuery({
    queryKey: ["category", slug],
    queryFn: () => getCategoryBySlug(slug),
    staleTime: 60_000,
  });
  const novelsQ = useQuery({
    queryKey: ["novels-by-genre", slug, lang],
    queryFn: () => fetchNovelsByGenre(slug),
  });

  const catTagsQ = useQuery({
    queryKey: ["category-tags", catQ.data?.id],
    queryFn: () => fetchCategoryTags(catQ.data!.id),
    enabled: !!catQ.data?.id,
    staleTime: 300_000,
  });
  const taggedNovelsQ = useQuery({
    queryKey: ["novels-by-tags", activeTags],
    queryFn: () => fetchNovelIdsByTags(activeTags),
    enabled: activeTags.length > 0,
  });

  const dbCat = catQ.data;
  const tax = getTaxonomyCategory(slug);

  // Prefer taxonomy for display; fall back to DB category values.
  const localized = tax
    ? pickLocalized(tax, lang)
    : {
        name: dbCat
          ? lang === "en"
            ? dbCat.name_en || dbCat.name_ar
            : dbCat.name_ar
          : slug,
        description: dbCat
          ? lang === "en"
            ? dbCat.description_en || dbCat.description_ar || ""
            : dbCat.description_ar || dbCat.description_en || ""
          : "",
      };
  const name = localized.name;
  const description = localized.description;
  const color = tax?.color || dbCat?.color || "hsl(var(--primary))";
  const coverUrl = tax?.cover_url || dbCat?.cover_url || "";
  const icon = tax?.icon || dbCat?.icon || "";
  const emoji = tax?.emoji || "";

  const sorted = useMemo(() => {
    let all = [...(novelsQ.data ?? [])];
    if (activeTags.length > 0) {
      const allowed = taggedNovelsQ.data;
      all = allowed ? all.filter((n) => allowed.has(n.id)) : [];
    }
    if (sort === "popular") all.sort((a, b) => b.views_count - a.views_count);
    else
      all.sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime(),
      );
    return all;
  }, [novelsQ.data, sort, activeTags, taggedNovelsQ.data]);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-10">
      <Link
        to="/categories"
        className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("categories.title")}
      </Link>

      {/* Header */}
      <header
        className="relative overflow-hidden rounded-3xl border border-border/60 bg-surface/40 p-6 md:p-8"
        style={{
          backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderColor: tax ? `${color}55` : undefined,
        }}
      >
        {coverUrl && (
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        )}
        {!coverUrl && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage: `linear-gradient(135deg, ${color}33, transparent 70%)`,
            }}
          />
        )}
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2">
            <span
              className="grid h-11 w-11 place-items-center rounded-2xl text-2xl"
              style={{ background: `${color}22`, color }}
              aria-hidden
            >
              {emoji ? (
                <span>{emoji}</span>
              ) : icon.trim() ? (
                icon
              ) : (
                <BookOpen className="h-5 w-5" />
              )}
            </span>
            <div className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
              <Sparkles className="me-1 inline h-3.5 w-3.5" />
              {t("categories.title")}
            </div>
          </div>
          <h1 className="text-3xl font-black leading-tight md:text-5xl">
            <span className="text-gradient-primary" style={{ color }}>
              {name}
            </span>
          </h1>
          {description && (
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
              {description}
            </p>
          )}

          {/* Tags of this category — used to filter the novels */}
          {(catTagsQ.data ?? []).length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {(catTagsQ.data ?? []).map((tag) => {
                const on = activeTags.includes(tag.id);
                const label = lang === "en" ? tag.name_en || tag.name_ar : tag.name_ar;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      setPage(1);
                      setActiveTags((prev) =>
                        prev.includes(tag.id)
                          ? prev.filter((x) => x !== tag.id)
                          : [...prev, tag.id],
                      );
                    }}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      on
                        ? "border-primary bg-primary/20 text-primary"
                        : "bg-surface/60 text-foreground/80 hover:border-primary hover:text-primary"
                    }`}
                    style={on ? undefined : { borderColor: `${color}55` }}
                  >
                    #{label}
                  </button>
                );
              })}
              {activeTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTags([]);
                    setPage(1);
                  }}
                  className="inline-flex items-center rounded-full border border-border/60 px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  مسح الفلاتر
                </button>
              )}
            </div>
          )}

          <div className="mt-3 text-xs font-semibold text-muted-foreground">
            {t("common.results", { count: total })}
          </div>
        </div>
      </header>

      {/* Sort */}
      <div className="my-6 flex items-center gap-2">
        <button
          onClick={() => {
            setSort("latest");
            setPage(1);
          }}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            sort === "latest"
              ? "bg-primary text-primary-foreground"
              : "bg-surface/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          {t("home.latest") ?? "الأحدث"}
        </button>
        <button
          onClick={() => {
            setSort("popular");
            setPage(1);
          }}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            sort === "popular"
              ? "bg-primary text-primary-foreground"
              : "bg-surface/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Flame className="h-3.5 w-3.5" />
          {t("home.popular") ?? "الأكثر شعبية"}
        </button>
      </div>

      {novelsQ.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-surface/60" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-surface/30 p-16 text-center text-sm text-muted-foreground">
          {t("search.noResults")}
        </div>
      ) : (
        <>
          <NovelGrid novels={pageItems} />
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-border/60 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                {t("common.previous") ?? "السابق"}
              </button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md border border-border/60 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                {t("common.next") ?? "التالي"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
