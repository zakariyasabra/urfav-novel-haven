import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchGenres } from "@/lib/api";

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [{ title: "التصنيفات — UR Fav Novel" }, { name: "description", content: "تصفح روايات UR Fav Novel حسب التصنيف." }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const q = useQuery({ queryKey: ["genres"], queryFn: fetchGenres });
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-black md:text-4xl">التصنيفات</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {(q.data ?? []).map((g) => (
          <Link
            key={g.slug}
            to="/categories/$slug"
            params={{ slug: g.slug }}
            className="group rounded-2xl border border-border/40 bg-surface/40 p-6 text-center transition-all hover:border-primary hover:bg-primary/10 hover:shadow-glow"
          >
            <div className="text-lg font-black group-hover:text-primary">{g.name_ar}</div>
            {g.name_en && <div className="mt-1 text-xs text-muted-foreground">{g.name_en}</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}
