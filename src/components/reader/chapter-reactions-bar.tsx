import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/i18n/provider";
import {
  CHAPTER_EMOJIS,
  fetchChapterReactionCounts,
  fetchMyChapterReactions,
  toggleChapterReaction,
} from "@/lib/enterprise-api";
import { showError } from "@/lib/errors";

export function ChapterReactionsBar({ chapterId }: { chapterId: string }) {
  const { user } = useAuth();
  const t = useT();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [c, m] = await Promise.all([
        fetchChapterReactionCounts(chapterId),
        fetchMyChapterReactions(chapterId),
      ]);
      if (!alive) return;
      setCounts(c);
      setMine(m);
    })();
    return () => {
      alive = false;
    };
  }, [chapterId]);

  async function react(emoji: string) {
    if (!user) {
      toast.error(t("common.loginRequired"));
      return;
    }
    setBusy(emoji);
    const on = !mine.has(emoji);
    try {
      await toggleChapterReaction(chapterId, emoji, on);
      setMine((prev) => {
        const s = new Set(prev);
        if (on) s.add(emoji);
        else s.delete(emoji);
        return s;
      });
      setCounts((prev) => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] ?? 0) + (on ? 1 : -1)) }));
    } catch (e) {
      showError(e);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="my-6 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-border/40 bg-surface/40 p-3">
      <span className="me-2 text-xs font-semibold text-muted-foreground">
        {t("reactions.title")}
      </span>
      {CHAPTER_EMOJIS.map((e) => (
        <button
          key={e}
          onClick={() => react(e)}
          disabled={busy === e}
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors ${
            mine.has(e)
              ? "border-primary bg-primary/10"
              : "border-border/60 bg-background/60 hover:bg-secondary/60"
          }`}
        >
          <span>{e}</span>
          <span className="text-xs font-bold">{counts[e] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}
