import { useEffect, useMemo, useState } from "react";
import { Lock, Trophy } from "lucide-react";
import {
  gmAchievementProgress,
  CATEGORY_LABELS_AR,
  RARITY_STYLES,
  type GmAchievementProgress,
} from "@/lib/gamification-api";

const CATEGORIES = ["all", "reading", "community", "author", "social", "vip", "events"] as const;
type Cat = (typeof CATEGORIES)[number];

export function AchievementsGrid() {
  const [items, setItems] = useState<GmAchievementProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<Cat>("all");

  useEffect(() => {
    let cancelled = false;
    void gmAchievementProgress().then((d) => {
      if (!cancelled) {
        setItems(d);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return items.filter((a) => {
      if (a.hidden && !a.unlocked) return false;
      if (cat === "all") return true;
      return a.category === cat;
    });
  }, [items, cat]);

  const unlockedCount = items.filter((i) => i.unlocked).length;

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/60 p-6 text-center text-sm text-muted-foreground">
        …
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Trophy className="h-4 w-4 text-primary" /> الإنجازات ({unlockedCount}/{items.length})
        </h3>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              cat === c
                ? "bg-primary text-primary-foreground"
                : "border border-border/40 bg-card/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            {c === "all" ? "الكل" : (CATEGORY_LABELS_AR[c] ?? c)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {filtered.map((a) => {
          const style = RARITY_STYLES[a.rarity] ?? RARITY_STYLES.common;
          const pct = Math.min(100, Math.round((a.progress / a.threshold_value) * 100));
          return (
            <div
              key={a.code}
              className={`relative flex items-start gap-3 rounded-xl border p-3 transition ${
                a.unlocked
                  ? `${style.ring} bg-card/70 ${style.glow}`
                  : "border-border/40 bg-muted/20"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-2xl ${a.unlocked ? "" : "opacity-40 grayscale"}`}
              >
                {a.icon ?? "🏆"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`truncate text-sm font-bold ${a.unlocked ? "" : "text-muted-foreground"}`}
                  >
                    {a.title_ar}
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${style.ring} ${style.text}`}
                  >
                    {style.label_ar}
                  </span>
                </div>
                {a.description_ar ? (
                  <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                    {a.description_ar}
                  </div>
                ) : null}
                <div className="mt-2">
                  <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="tabular-nums">
                      {a.progress}/{a.threshold_value}
                    </span>
                    <span>
                      +{a.xp} XP • +{a.coins} 🪙
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${a.unlocked ? "bg-gradient-to-r from-primary to-amber-400" : "bg-primary/60"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
              {!a.unlocked && a.progress === 0 ? (
                <Lock className="absolute end-2 top-2 h-3 w-3 text-muted-foreground/40" />
              ) : null}
            </div>
          );
        })}
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed border-border/40 p-8 text-center text-sm text-muted-foreground">
            لا توجد إنجازات في هذه الفئة بعد.
          </div>
        ) : null}
      </div>
    </section>
  );
}
