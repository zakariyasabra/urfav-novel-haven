import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyAuthorNovels } from "@/lib/author-api";
import { CreatorStudio } from "@/components/author/creator-studio";
import { useT } from "@/i18n/provider";

export const Route = createFileRoute("/_authenticated/author/studio")({
  head: () => ({
    meta: [{ title: "Creator Studio — FAVNOL" }, { name: "robots", content: "noindex" }],
  }),
  component: StudioPage,
});

function StudioPage() {
  const t = useT();
  const { isAuthor, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && !isAuthor) nav({ to: "/author/apply" });
  }, [loading, isAuthor, nav]);

  const novelsQ = useQuery({
    queryKey: ["my-author-novels"],
    queryFn: fetchMyAuthorNovels,
    enabled: isAuthor,
  });

  if (!isAuthor) return null;

  const novels = (novelsQ.data ?? []).map((n) => ({ id: n.id, title: n.title }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black md:text-3xl">{t("author.studio")}</h1>
          <p className="text-sm text-muted-foreground">{t("author.dash.subtitle")}</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/author">
            <ArrowLeft className="me-1 h-4 w-4" />
            {t("author.dash.title")}
          </Link>
        </Button>
      </header>
      <CreatorStudio novels={novels} />
    </div>
  );
}
