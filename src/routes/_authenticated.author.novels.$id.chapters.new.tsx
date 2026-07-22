import { createFileRoute } from "@tanstack/react-router";
import { ChapterEditor } from "@/components/chapter-editor";

export const Route = createFileRoute("/_authenticated/author/novels/$id/chapters/new")({
  head: () => ({ meta: [{ title: "فصل جديد — FAVNOL" }, { name: "robots", content: "noindex" }] }),
  component: NewChapterPage,
});

function NewChapterPage() {
  const { id } = Route.useParams();
  return <ChapterEditor novelId={id} />;
}
