import { useEffect, useState } from "react";
import { Check, Gift, Loader2 } from "lucide-react";
import { gmClaimMission, gmMyMissions, type GmMission } from "@/lib/gamification-api";
import { toast } from "sonner";

export function DailyMissionsWidget() {
  const [items, setItems] = useState<GmMission[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => { void gmMyMissions().then(setItems); };
  useEffect(() => { load(); }, []);

  async function claim(code: string) {
    setBusy(code);
    try {
      await gmClaimMission(code);
      toast.success("تم استلام المكافأة");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Gift className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">المهام اليومية</h3>
      </div>
      <ul className="space-y-2">
        {items.map((m) => {
          const pct = Math.min(100, Math.round((m.progress / m.target_value) * 100));
          return (
            <li key={m.code} className="flex items-center gap-3 rounded-lg bg-background/60 p-3">
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{m.title_ar}</span>
                  <span className="text-muted-foreground">{m.progress}/{m.target_value}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">+{m.xp} XP • +{m.coins} 🪙</div>
              </div>
              {m.claimed ? (
                <Check className="h-5 w-5 text-emerald-400" />
              ) : m.completed ? (
                <button
                  disabled={busy === m.code}
                  onClick={() => claim(m.code)}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {busy === m.code ? <Loader2 className="h-3 w-3 animate-spin" /> : "استلم"}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
