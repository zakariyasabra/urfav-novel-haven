import { createFileRoute } from "@tanstack/react-router";
import { ChapterEditor } from "@/components/chapter-editor";
import { ChapterVersionHistory } from "@/components/author/creator-studio";
import { useT } from "@/i18n/provider";

export const Route = createFileRoute("/_authenticated/author/novels/$id/chapters/$chapterId")({
  head: () => ({ meta: [{ title: "تعديل فصل — FAVNOL" }, { name: "robots", content: "noindex" }] }),
  component: EditChapter,
});

function EditChapter() {
  const t = useT();
  const { id, chapterId } = Route.useParams();
  return (
    <>
      <ChapterEditor novelId={id} chapterId={chapterId} />
      <section className="mx-auto mb-8 max-w-4xl px-4">
        <div className="mb-3 text-sm font-bold text-muted-foreground">{t("studio.versions")}</div>
        <div className="rounded-2xl border border-border/40 bg-surface/40 p-4">
          <ChapterVersionHistory chapterId={chapterId} />
        </div>
      </section>
    </>
  );
}
