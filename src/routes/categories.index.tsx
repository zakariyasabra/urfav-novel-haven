import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchGenres } from "@/lib/api";
import { useT, usePreferences } from "@/i18n/provider";

export const Route = createFileRoute("/categories/")({
  head: () => ({ meta: [{ title: "Categories — UR Fav Novel" }, { name: "description", content: "Browse novels by category." }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const t = useT();
  const { lang } = usePreferences();
  const q = useQuery({ queryKey: ["genres"], queryFn: fetchGenres });
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-black md:text-4xl">{t("categories.title")}</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {(q.data ?? []).map((g) => {
          const primary = lang === "en" ? (g.name_en || g.name_ar) : g.name_ar;
          const secondary = lang === "en" ? g.name_ar : g.name_en;
          return (
            <Link
              key={g.slug}
              to="/categories/$slug"
              params={{ slug: g.slug }}
              className="group rounded-2xl border border-border/40 bg-surface/40 p-6 text-center transition-all hover:border-primary hover:bg-primary/10 hover:shadow-glow"
            >
              <div className="text-lg font-black group-hover:text-primary">{primary}</div>
              {secondary && secondary !== primary && <div className="mt-1 text-xs text-muted-foreground">{secondary}</div>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
