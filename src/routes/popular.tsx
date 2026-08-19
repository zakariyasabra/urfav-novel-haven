import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchNovels } from "@/lib/api";
import { NovelGrid } from "@/components/novel-card";
import { AdSlot } from "@/components/ad-slot";
import { useT } from "@/i18n/provider";
import { canonicalUrl } from "@/lib/site-config";

const TITLE = "أشهر الروايات | FAVNOL";
const DESC = "أكثر الروايات قراءةً ومشاهدةً على FAVNOL، مرتّبة حسب عدد المشاهدات.";

export const Route = createFileRoute("/popular")({
  loader: async ({ context: { queryClient } }) => {
    await queryClient
      .prefetchQuery({
        queryKey: ["novels", "popular", "all"],
        queryFn: () => fetchNovels({ sort: "popular" }),
        staleTime: 60_000,
      })
      .catch(() => undefined);
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: canonicalUrl("/popular") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/popular") }],
  }),
  component: PopularPage,
});


function PopularPage() {
  const t = useT();
  const q = useQuery({
    queryKey: ["novels", "popular", "all"],
    queryFn: () => fetchNovels({ sort: "popular" }),
  });
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-black md:text-4xl">{t("listing.popular.title")}</h1>
      <AdSlot slot="list" />
      <NovelGrid novels={q.data ?? []} />
    </div>
  );
}
