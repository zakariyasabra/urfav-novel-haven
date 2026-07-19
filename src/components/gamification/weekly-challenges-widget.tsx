import { useEffect, useState } from "react";
import { Trophy, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

import {
  gmClaimChallenge,
  gmMyChallenges,
  DIFFICULTY_LABELS_AR,
  type GmChallenge,
} from "@/lib/gamification-api";

function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "منتهي";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (d > 0) return `${d} ي ${h} س`;
  return `${h} س`;
}

const DIFF_STYLES: Record<string, string> = {
  easy: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  hard: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  extreme: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
};

export function WeeklyChallengesWidget() {
  const [items, setItems] = useState<GmChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    void gmMyChallenges().then((r) => {
      setItems(r);
      setLoading(false);
    });
  };
  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("gm:refresh", handler);
    return () => window.removeEventListener("gm:refresh", handler);
  }, []);

  async function claim(id: string) {
    setBusy(id);
    try {
      await gmClaimChallenge(id);
      toast.success("تم استلام مكافأة التحدي");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/60 p-6 text-center text-sm text-muted-foreground">
        جاري تحميل التحديات…
      </div>
    );
  }
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">التحديات الأسبوعية</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((c) => {
          const pct = Math.min(100, Math.round((c.progress / c.target_value) * 100));
          const diffCls = DIFF_STYLES[c.difficulty] ?? DIFF_STYLES.medium;
          return (
            <div
              key={c.id}
              className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-background/80 to-background/40 p-4 transition hover:border-primary/40"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{c.icon ?? "🎯"}</span>
                  <div>
                    <div className="text-sm font-bold">{c.title_ar}</div>
                    {c.description_ar ? (
                      <div className="text-[11px] text-muted-foreground">{c.description_ar}</div>
                    ) : null}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${diffCls}`}>
                  {DIFFICULTY_LABELS_AR[c.difficulty] ?? c.difficulty}
                </span>
              </div>

              <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{c.progress} / {c.target_value}</span>
                <span>ينتهي خلال {timeLeft(c.ends_at)}</span>
              </div>

              <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gradient-to-r from-primary to-orange-400 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold">
                  <span className="text-primary">+{c.xp} XP</span>
                  <span className="mx-1 text-muted-foreground">•</span>
                  <span className="text-amber-400">+{c.coins} 🪙</span>
                </div>
                {c.claimed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    <Check className="h-3 w-3" /> مستلَم
                  </span>
                ) : c.completed ? (
                  <button
                    onClick={() => claim(c.id)}
                    disabled={busy === c.id}
                    className="rounded-md bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground disabled:opacity-60"
                  >
                    {busy === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "استلم"}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
