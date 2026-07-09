import { createFileRoute } from "@tanstack/react-router";
import { ChapterEditor } from "@/components/chapter-editor";

export const Route = createFileRoute("/_authenticated/author/novels/$id/chapters/$chapterId")({
  head: () => ({ meta: [{ title: "تعديل فصل — UR Fav Novel" }, { name: "robots", content: "noindex" }] }),
  component: EditChapter,
});

function EditChapter() {
  const { id, chapterId } = Route.useParams();
  return <ChapterEditor novelId={id} chapterId={chapterId} />;
}
