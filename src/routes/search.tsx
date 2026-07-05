import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { searchNovels, fetchGenres } from "@/lib/api";
import { NovelGrid } from "@/components/novel-card";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: (s.q as string) ?? "",
    genre: (s.genre as string) ?? "",
    status: (s.status as string) ?? "",
    sort: (s.sort as string) ?? "latest",
  }),
  head: () => ({ meta: [{ title: "البحث — UR Fav Novel" }, { name: "description", content: "ابحث عن رواياتك المفضلة." }] }),
  component: SearchPage,
});

function SearchPage() {
  const initial = Route.useSearch();
  const [q, setQ] = useState(initial.q);
  const [genre, setGenre] = useState(initial.genre);
  const [status, setStatus] = useState(initial.status);
  const [sort, setSort] = useState(initial.sort);

  const genresQ = useQuery({ queryKey: ["genres"], queryFn: fetchGenres });
  const results = useQuery({
    queryKey: ["search", q, genre, status, sort],
    queryFn: () => searchNovels(q, { genre: genre || undefined, status: status || undefined, sort }),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-black md:text-4xl">البحث في المكتبة</h1>

      <div className="rounded-2xl border border-border/40 bg-surface/40 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالعنوان أو المؤلف..."
            className="h-12 w-full rounded-md border border-input bg-background/60 ps-4 pe-10 text-base outline-none focus:border-primary"
          />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <select value={genre} onChange={(e) => setGenre(e.target.value)} className="h-10 rounded-md border border-input bg-background/60 px-3 text-sm">
            <option value="">جميع التصنيفات</option>
            {(genresQ.data ?? []).map((g) => <option key={g.slug} value={g.slug}>{g.name_ar}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-md border border-input bg-background/60 px-3 text-sm">
            <option value="">جميع الحالات</option>
            <option value="ongoing">مستمرة</option>
            <option value="completed">مكتملة</option>
            <option value="hiatus">متوقفة</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-md border border-input bg-background/60 px-3 text-sm">
            <option value="latest">آخر تحديث</option>
            <option value="popular">الأكثر مشاهدة</option>
            <option value="rating">الأعلى تقييماً</option>
          </select>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4 text-sm text-muted-foreground">{results.data?.length ?? 0} نتيجة</div>
        <NovelGrid novels={results.data ?? []} />
      </div>
    </div>
  );
}
