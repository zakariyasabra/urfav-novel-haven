import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchNovels } from "@/lib/api";
import { NovelGrid } from "@/components/novel-card";
import { useT } from "@/i18n/provider";

export const Route = createFileRoute("/completed")({
  head: () => ({ meta: [{ title: "Completed — FAVNOL" }, { name: "description", content: "Completed novels." }] }),
  component: CompletedPage,
});

function CompletedPage() {
  const t = useT();
  const q = useQuery({ queryKey: ["novels", "completed"], queryFn: () => fetchNovels({ status: "completed" }) });
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-black md:text-4xl">{t("listing.completed.title")}</h1>
      <NovelGrid novels={q.data ?? []} />
    </div>
  );
}
