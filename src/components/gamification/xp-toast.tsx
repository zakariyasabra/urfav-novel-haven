import { useEffect, useState } from "react";
import { Sparkles, TrendingUp } from "lucide-react";
import { onGmAward } from "@/hooks/use-gamification";
import type { GmAwardResult } from "@/lib/gamification-api";

interface Toast { id: number; result: GmAwardResult }

export function XpToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let seq = 0;
    return onGmAward((result) => {
      const id = ++seq;
      setToasts((t) => [...t, { id, result }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-24 start-4 z-[9999] flex flex-col gap-2 sm:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto animate-fade-in rounded-xl border border-primary/40 bg-background/95 px-4 py-3 shadow-2xl backdrop-blur"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
              {t.result.leveled_up ? (
                <TrendingUp className="h-5 w-5 text-primary" />
              ) : (
                <Sparkles className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="text-sm">
              {t.result.leveled_up ? (
                <div className="font-semibold text-primary">مستوى جديد! {t.result.level}</div>
              ) : (
                <div className="font-semibold">
                  {t.result.xp ? <span className="text-primary">+{t.result.xp} XP</span> : null}
                  {t.result.xp && t.result.coins ? <span className="mx-1 text-muted-foreground">•</span> : null}
                  {t.result.coins ? <span className="text-amber-400">+{t.result.coins} 🪙</span> : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
