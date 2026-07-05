import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchNovels } from "@/lib/api";
import { NovelGrid } from "@/components/novel-card";

export const Route = createFileRoute("/popular")({
  head: () => ({ meta: [{ title: "الأكثر شعبية — UR Fav Novel" }, { name: "description", content: "الروايات الأكثر مشاهدة على UR Fav Novel." }] }),
  component: () => {
    const q = useQuery({ queryKey: ["novels", "popular", "all"], queryFn: () => fetchNovels({ sort: "popular" }) });
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="mb-6 text-3xl font-black md:text-4xl">الأكثر شعبية</h1>
        <NovelGrid novels={q.data ?? []} />
      </div>
    );
  },
});
