import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { coverUrl } from "@/lib/covers";
import { formatViews, timeAgoAr, statusLabel } from "@/lib/format";
import { NovelCard, type NovelCardData } from "@/components/novel-card";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "مكتبتي — UR Fav Novel" }, { name: "robots", content: "noindex" }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"favorites" | "history">("favorites");

  const favQ = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("favorites")
        .select("created_at, novel:novels(id,slug,title,author,cover_url,status,views_count,rating_avg)")
        .eq("user_id", user!.id).order("created_at", { ascending: false });
      return ((data ?? []) as unknown as { novel: NovelCardData }[]).map((r) => r.novel);
    },
    enabled: !!user,
  });

  const histQ = useQuery({
    queryKey: ["history", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("reading_history")
        .select("last_read_at, chapter:chapters(chapter_number, title), novel:novels(slug,title,cover_url,author,status,views_count,rating_avg)")
        .eq("user_id", user!.id).order("last_read_at", { ascending: false });
      return (data ?? []) as unknown as {
        last_read_at: string;
        chapter: { chapter_number: number; title: string } | null;
        novel: { slug: string; title: string; cover_url: string | null; author: string; status: string; views_count: number; rating_avg: number };
      }[];
    },
    enabled: !!user,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-black md:text-4xl">مكتبتي</h1>

      <div className="mb-6 inline-flex rounded-lg border border-border/60 bg-surface/40 p-1">
        {(["favorites", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {t === "favorites" ? "المفضلة" : "سجل القراءة"}
          </button>
        ))}
      </div>

      {tab === "favorites" ? (
        (favQ.data?.length ?? 0) === 0 ? (
          <Empty message="لم تُضف أي رواية إلى المفضلة بعد" />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {(favQ.data ?? []).map((n) => <NovelCard key={n.slug} novel={n} />)}
          </div>
        )
      ) : (
        (histQ.data?.length ?? 0) === 0 ? <Empty message="لا يوجد سجل قراءة بعد" /> : (
          <div className="space-y-3">
            {(histQ.data ?? []).map((h) => (
              <Link
                key={h.novel.slug}
                to="/novels/$slug/$chapter"
                params={{ slug: h.novel.slug, chapter: String(h.chapter?.chapter_number ?? 1) }}
                className="flex items-center gap-4 rounded-xl border border-border/40 bg-surface/40 p-4 transition-colors hover:border-primary/50"
              >
                <img src={coverUrl(h.novel.cover_url)} alt="" className="h-24 w-16 rounded object-cover" loading="lazy" width={64} height={96} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{h.novel.title}</div>
                  <div className="text-sm text-muted-foreground">آخر قراءة: الفصل {h.chapter?.chapter_number} — {h.chapter?.title}</div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{statusLabel(h.novel.status)}</span>
                    <span>{formatViews(h.novel.views_count)} مشاهدة</span>
                    <span>{timeAgoAr(h.last_read_at)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-border/60 bg-surface/40 p-16 text-center text-muted-foreground">{message}</div>;
}
