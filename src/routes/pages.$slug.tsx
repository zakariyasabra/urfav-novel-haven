import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchStaticPage } from "@/lib/monetization-api";
import { useT } from "@/i18n/provider";

export const Route = createFileRoute("/pages/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — UR Fav Novel` }] }),
  component: PageView,
  notFoundComponent: NotFound,
  errorComponent: ErrorView,
});

function NotFound() {
  const t = useT();
  return <div className="mx-auto max-w-3xl px-4 py-16 text-center">{t("common.notFound")}</div>;
}
function ErrorView() {
  const t = useT();
  return <div className="mx-auto max-w-3xl px-4 py-16 text-center">{t("common.error")}</div>;
}

function PageView() {
  const t = useT();
  const { slug } = Route.useParams();
  const q = useQuery({ queryKey: ["static-page", slug], queryFn: () => fetchStaticPage(slug) });
  if (q.isLoading) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">{t("common.loading")}</div>;
  if (!q.data || !q.data.is_published) throw notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-black md:text-4xl">{q.data.title}</h1>
      <div className="prose prose-invert max-w-none text-foreground/90"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: q.data.body_html }} />
    </article>
  );
}
