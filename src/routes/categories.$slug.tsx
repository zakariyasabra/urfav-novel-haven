import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchNovelsByGenre, fetchGenres } from "@/lib/api";
import { NovelGrid } from "@/components/novel-card";
import { usePreferences, useT } from "@/i18n/provider";

export const Route = createFileRoute("/categories/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — FAVNOL` }] }),
  component: GenrePage,
});

function GenrePage() {
  const { slug } = Route.useParams();
  const { lang } = usePreferences();
  const t = useT();
  const genresQ = useQuery({ queryKey: ["genres"], queryFn: fetchGenres });
  const novelsQ = useQuery({
    queryKey: ["novels-by-genre", slug, lang],
    queryFn: () => fetchNovelsByGenre(slug),
  });
  const g = genresQ.data?.find((x) => x.slug === slug);
  const name = g ? (lang === "en" ? g.name_en || g.name_ar : g.name_ar) : slug;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-black md:text-4xl">
        {t("categories.title")}: <span className="text-gradient-primary">{name}</span>
      </h1>
      <NovelGrid novels={novelsQ.data ?? []} />
    </div>
  );
}
