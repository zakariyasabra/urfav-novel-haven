import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChapterEditor } from "@/components/chapter-editor";

export const Route = createFileRoute("/_authenticated/author/novels/$id/chapters/new")({
  head: () => ({ meta: [{ title: "فصل جديد — FAVNOL" }, { name: "robots", content: "noindex" }] }),
  component: NewChapter,
});

function NewChapter() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  return <ChapterEditor novelId={id} onSaved={(cid) => nav({ to: "/author/novels/$id/chapters/$chapterId", params: { id, chapterId: cid } })} />;
}
