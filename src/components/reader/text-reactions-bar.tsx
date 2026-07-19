import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchChapterReactions } from "@/lib/social-api";

/** Compact strip that shows the top-reacted quotes in a chapter. */
export function TextReactionsBar({ chapterId }: { chapterId: string }) {
  const q = useQuery({
    queryKey: ["text-reactions", chapterId],
    queryFn: () => fetchChapterReactions(chapterId),
  });

  const groups = useMemo(() => {
    const map = new Map<string, { text: string; counts: Record<string, number>; total: number }>();
    (q.data ?? []).forEach((r) => {
      const g = map.get(r.selection_hash) ?? { text: r.selection_text, counts: {}, total: 0 };
      g.counts[r.emoji] = (g.counts[r.emoji] ?? 0) + 1;
      g.total++;
      map.set(r.selection_hash, g);
    });
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [q.data]);

  if (groups.length === 0) return null;

  return (
    <aside className="mt-10 rounded-xl border border-border/40 bg-surface/40 p-4">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        أكثر المقاطع تفاعلاً
      </div>
      <div className="space-y-3">
        {groups.map((g, i) => (
          <div key={i} className="rounded-lg border border-border/40 bg-background/40 p-3">
            <blockquote className="mb-2 border-s-2 border-primary ps-2 text-sm italic text-foreground/85">
              "{g.text.length > 200 ? g.text.slice(0, 200) + "…" : g.text}"
            </blockquote>
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(g.counts).map(([emoji, n]) => (
                <span
                  key={emoji}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs"
                >
                  <span>{emoji}</span>
                  <span className="tabular-nums">{n}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
