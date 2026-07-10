import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { searchNovels, fetchGenres } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { NovelGrid } from "@/components/novel-card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: (s.q as string) ?? "",
    genre: (s.genre as string) ?? "",
    status: (s.status as string) ?? "",
    tag: (s.tag as string) ?? "",
    sort: (s.sort as string) ?? "latest",
    author: (s.author as string) ?? "",
    tier: (s.tier as string) ?? "", // vip | free
  }),
  head: () => ({ meta: [{ title: "البحث المتقدم — UR Fav Novel" }, { name: "description", content: "ابحث بالتصنيف، الحالة، الوسم، والمزيد." }] }),
  component: SearchPage,
});

function SearchPage() {
  const initial = Route.useSearch();
  const [q, setQ] = useState(initial.q);
  const [genre, setGenre] = useState(initial.genre);
  const [status, setStatus] = useState(initial.status);
  const [tag, setTag] = useState(initial.tag);
  const [author, setAuthor] = useState(initial.author);
  const [tier, setTier] = useState(initial.tier);
  const [sort, setSort] = useState(initial.sort);
  const [openFilters, setOpenFilters] = useState(false);

  const genresQ = useQuery({ queryKey: ["genres"], queryFn: fetchGenres });
  const tagsQ = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data } = await supabase.from("tags").select("slug,name_ar").order("name_ar").limit(50);
      return (data ?? []) as { slug: string; name_ar: string }[];
    },
  });

  const results = useQuery({
    queryKey: ["search-adv", q, genre, status, tag, author, tier, sort],
    queryFn: async () => {
      let base = await searchNovels(q, { genre: genre || undefined, status: status || undefined, sort });
      if (author.trim()) {
        const a = author.trim().toLowerCase();
        base = base.filter((n) => n.author.toLowerCase().includes(a));
      }
      if (tag) {
        const { data: gtag } = await supabase.from("tags").select("id").eq("slug", tag).maybeSingle();
        if (gtag) {
          const { data: nt } = await supabase.from("novel_tags").select("novel_id").eq("tag_id", (gtag as { id: string }).id);
          const allow = new Set((nt ?? []).map((r: { novel_id: string }) => r.novel_id));
          base = base.filter((n) => allow.has(n.id));
        } else base = [];
      }
      // tier: needs chapters with is_vip flag — approximate via novels flag: for now, tag-based; skip if no meta.
      return base;
    },
  });

  function clearFilters() {
    setGenre(""); setStatus(""); setTag(""); setAuthor(""); setTier(""); setSort("latest");
  }
  const activeCount = [genre, status, tag, author, tier].filter(Boolean).length + (sort !== "latest" ? 1 : 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-black md:text-4xl">البحث المتقدم</h1>

      <div className="rounded-2xl border border-border/40 bg-gradient-to-b from-surface/60 to-surface/30 p-4 shadow-elevated">
        <div className="relative">
          <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالعنوان..."
            className="h-12 w-full rounded-xl border border-input bg-background/60 ps-4 pe-10 text-base outline-none transition-colors focus:border-primary" />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button onClick={() => setOpenFilters((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${openFilters || activeCount ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"}`}>
            <SlidersHorizontal className="h-4 w-4" />فلاتر {activeCount ? <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">{activeCount}</span> : null}
          </button>
          {activeCount > 0 && (
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground">
              <X className="me-1 inline h-3 w-3" />مسح
            </button>
          )}
          <div className="ms-auto">
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="h-9 rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary">
              <option value="latest">آخر تحديث</option>
              <option value="popular">الأكثر مشاهدة</option>
              <option value="rating">الأعلى تقييماً</option>
              <option value="newest">الأحدث نشراً</option>
            </select>
          </div>
        </div>

        {openFilters && (
          <div className="mt-4 grid gap-3 border-t border-border/40 pt-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
            <Field label="التصنيف">
              <select value={genre} onChange={(e) => setGenre(e.target.value)} className="field">
                <option value="">كل التصنيفات</option>
                {(genresQ.data ?? []).map((g) => <option key={g.slug} value={g.slug}>{g.name_ar}</option>)}
              </select>
            </Field>
            <Field label="الحالة">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="field">
                <option value="">جميع الحالات</option>
                <option value="ongoing">مستمرة</option>
                <option value="completed">مكتملة</option>
                <option value="hiatus">متوقفة</option>
              </select>
            </Field>
            <Field label="الوسم">
              <select value={tag} onChange={(e) => setTag(e.target.value)} className="field">
                <option value="">كل الوسوم</option>
                {(tagsQ.data ?? []).map((t) => <option key={t.slug} value={t.slug}>{t.name_ar}</option>)}
              </select>
            </Field>
            <Field label="المؤلف">
              <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="اسم المؤلف..." className="field" />
            </Field>
            <Field label="الوصول">
              <select value={tier} onChange={(e) => setTier(e.target.value)} className="field">
                <option value="">الكل</option>
                <option value="free">مجاني</option>
                <option value="vip">VIP فقط</option>
              </select>
            </Field>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {results.isLoading ? "جاري البحث..." : `${results.data?.length ?? 0} نتيجة`}
        </div>
      </div>

      <div className="mt-4">
        {results.isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="aspect-[2/3] rounded-lg bg-surface" />
                <div className="h-3 w-3/4 rounded bg-surface" />
              </div>
            ))}
          </div>
        ) : (results.data?.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-surface/30 p-16 text-center">
            <div className="text-lg font-bold">لا نتائج</div>
            <div className="mt-1 text-sm text-muted-foreground">جرّب تعديل المرشحات أو استخدم كلمات مختلفة.</div>
          </div>
        ) : (
          <NovelGrid novels={results.data ?? []} />
        )}
      </div>

      <style>{`.field{width:100%;height:2.5rem;padding:0 0.75rem;border-radius:0.5rem;border:1px solid hsl(var(--input));background:hsl(var(--background)/.6);font-size:0.875rem;outline:none}.field:focus{border-color:hsl(var(--primary))}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
