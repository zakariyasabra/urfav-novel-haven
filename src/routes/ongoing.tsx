import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchNovels } from "@/lib/api";
import { NovelGrid } from "@/components/novel-card";
import { useT } from "@/i18n/provider";

export const Route = createFileRoute("/ongoing")({
  head: () => ({ meta: [{ title: "Ongoing — FAVNOL" }, { name: "description", content: "Ongoing novels." }] }),
  component: OngoingPage,
});

function OngoingPage() {
  const t = useT();
  const q = useQuery({ queryKey: ["novels", "ongoing"], queryFn: () => fetchNovels({ status: "ongoing" }) });
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-black md:text-4xl">{t("listing.ongoing.title")}</h1>
      <NovelGrid novels={q.data ?? []} />
    </div>
  );
}
