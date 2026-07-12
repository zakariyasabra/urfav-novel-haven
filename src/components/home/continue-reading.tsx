import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { coverUrl } from "@/lib/covers";

type Row = {
  novel_id: string;
  chapter_id: string | null;
  updated_at: string;
  novel: { slug: string; title: string; cover_url: string | null } | null;
  chapter: { chapter_number: number; title: string | null } | null;
};

export function ContinueReadingHome() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["home-continue", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reading_history")
        .select("novel_id, chapter_id, updated_at, novel:novels(slug,title,cover_url), chapter:chapters(chapter_number,title)")
        .order("updated_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  if (!user || !q.data || q.data.length === 0) return null;

  return (
    <section>
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:mb-5">
        <h2 className="flex min-w-0 items-center gap-2 text-xl font-black sm:text-2xl md:text-3xl">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10">
            <Clock className="text-primary" />
          </span>
          <span className="truncate">تابع القراءة</span>
        </h2>
        <Link to="/library" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:text-primary-glow sm:text-sm">
          مكتبتي <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {q.data.filter((r) => r.novel && r.chapter).map((r) => (
          <Link
            key={r.novel_id}
            to="/novels/$slug/$chapter"
            params={{ slug: r.novel!.slug, chapter: String(r.chapter!.chapter_number) }}
            className="group flex items-center gap-3 rounded-xl border border-border/40 bg-surface/40 p-3 transition-colors hover:border-primary/50 hover:bg-surface"
          >
            <img src={coverUrl(r.novel!.cover_url)} alt="" className="h-20 w-14 shrink-0 rounded object-cover" loading="lazy" width={56} height={80} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold group-hover:text-primary">{r.novel!.title}</div>
              <div className="truncate text-xs text-muted-foreground">
                الفصل {r.chapter!.chapter_number}{r.chapter!.title ? ` — ${r.chapter!.title}` : ""}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">اضغط للمتابعة</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
