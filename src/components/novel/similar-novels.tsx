import { useQuery } from "@tanstack/react-query";
import { fetchMoreLikeThis } from "@/lib/recommendations-api";
import { NovelCard } from "@/components/novel-card";
import { useT } from "@/i18n/provider";

export function SimilarNovels({ novelId, currentSlug }: { novelId: string; currentSlug: string }) {
  const t = useT();
  const q = useQuery({
    queryKey: ["more-like-this", novelId],
    queryFn: () => fetchMoreLikeThis(novelId, 10),
    staleTime: 60_000,
  });
  const list = (q.data ?? []).filter((r) => r.novel.slug !== currentSlug).slice(0, 8);
  if (list.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-2xl font-black">{t("home.section.moreLikeThis")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {list.map((r) => (
          <div key={r.novel.id}>
            <NovelCard novel={r.novel} />
            <p className="mt-1 line-clamp-2 px-1 text-[11px] text-muted-foreground">
              {(() => {
                try {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  return t(r.reason_key, (r.reason_params ?? {}) as any);
                } catch {
                  return "";
                }
              })()}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
