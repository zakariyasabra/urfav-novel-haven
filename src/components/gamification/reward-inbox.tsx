import { useEffect, useState } from "react";
import { Gift, Loader2, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { gmMyBoxes, gmOpenBox } from "@/lib/gamification-api";

interface Box {
  id: string;
  source: string;
  opened: boolean;
  reward: Record<string, unknown> | null;
  created_at: string;
  opened_at: string | null;
}

function rewardText(r: Record<string, unknown> | null | undefined): string {
  if (!r) return "";
  const parts: string[] = [];
  if (typeof r.coins === "number") parts.push(`+${r.coins} 🪙`);
  if (typeof r.xp === "number") parts.push(`+${r.xp} XP`);
  if (typeof r.badge === "string") parts.push(`شارة: ${r.badge}`);
  if (typeof r.vip_days === "number") parts.push(`+${r.vip_days} يوم VIP`);
  return parts.join(" • ") || "مكافأة";
}

export function RewardInbox() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    void gmMyBoxes().then((r) => {
      setBoxes(r as Box[]);
      setLoading(false);
    });
  };
  useEffect(load, []);

  async function open(id: string) {
    setBusy(id);
    try {
      const r = await gmOpenBox(id);
      toast.success(`تم الفتح: ${rewardText(r.reward)}`);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const pending = boxes.filter((b) => !b.opened);
  const history = boxes.filter((b) => b.opened);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/60 p-6 text-center text-sm text-muted-foreground">
        جاري التحميل…
      </div>
    );
  }
  if (boxes.length === 0) return null;

  return (
    <div className="space-y-4">
      {pending.length > 0 ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">مكافآت في انتظارك ({pending.length})</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {pending.map((b) => (
              <button
                key={b.id}
                onClick={() => open(b.id)}
                disabled={busy === b.id}
                className="group flex items-center gap-3 rounded-xl border border-primary/40 bg-background/60 p-3 text-start transition hover:bg-primary/10 disabled:opacity-60"
              >
                <span className="text-3xl transition group-hover:scale-110">🎁</span>
                <div className="flex-1">
                  <div className="text-xs font-bold">صندوق مكافأة</div>
                  <div className="text-[10px] text-muted-foreground">من: {b.source}</div>
                </div>
                {busy === b.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <PackageOpen className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {history.length > 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
          <h3 className="mb-3 text-sm font-bold text-muted-foreground">سجل المكافآت</h3>
          <ul className="space-y-1.5">
            {history.slice(0, 10).map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2 text-xs"
              >
                <span>{rewardText(b.reward)}</span>
                <span className="text-[10px] text-muted-foreground">
                  {b.opened_at ? new Date(b.opened_at).toLocaleDateString("ar") : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
