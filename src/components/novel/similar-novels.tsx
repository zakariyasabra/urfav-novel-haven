import { useQuery } from "@tanstack/react-query";
import { fetchSimilarNovels } from "@/lib/social-api";
import { NovelCard } from "@/components/novel-card";

export function SimilarNovels({ novelId, currentSlug }: { novelId: string; currentSlug: string }) {
  const q = useQuery({ queryKey: ["similar", novelId], queryFn: () => fetchSimilarNovels(novelId, 8) });
  const list = (q.data ?? []).filter((n) => n.slug !== currentSlug);
  if (list.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-2xl font-black">روايات مشابهة</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {list.map((n) => <NovelCard key={n.slug} novel={n as never} />)}
      </div>
    </section>
  );
}
