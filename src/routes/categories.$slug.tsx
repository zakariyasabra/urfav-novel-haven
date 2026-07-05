import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchNovelsByGenre, fetchGenres } from "@/lib/api";
import { NovelGrid } from "@/components/novel-card";

export const Route = createFileRoute("/categories/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — تصنيف — UR Fav Novel` }] }),
  component: GenrePage,
});

function GenrePage() {
  const { slug } = Route.useParams();
  const genresQ = useQuery({ queryKey: ["genres"], queryFn: fetchGenres });
  const novelsQ = useQuery({ queryKey: ["novels-by-genre", slug], queryFn: () => fetchNovelsByGenre(slug) });
  const g = genresQ.data?.find((x) => x.slug === slug);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-black md:text-4xl">تصنيف: <span className="text-gradient-primary">{g?.name_ar ?? slug}</span></h1>
      <NovelGrid novels={novelsQ.data ?? []} />
    </div>
  );
}
