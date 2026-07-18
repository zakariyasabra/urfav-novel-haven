import { useEffect, useState } from "react";
import { Trophy, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

interface UnlockPayload {
  id: string;
  title: string;
  body: string | null;
  icon?: string | null;
  xp?: number;
  coins?: number;
  badge?: string | null;
}

/**
 * Listens to notifications realtime stream and shows a premium unlock toast
 * whenever an `achievement` notification arrives. Non-blocking — auto-dismisses.
 */
export function AchievementUnlockToast() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<UnlockPayload[]>([]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`ach-unlock-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as {
            id: string;
            type: string;
            title_ar: string | null;
            title: string;
            body_ar: string | null;
            body: string | null;
            meta: Record<string, unknown> | null;
          };
          if (row.type !== "achievement") return;
          const meta = row.meta ?? {};
          setQueue((q) => [
            ...q,
            {
              id: row.id,
              title: row.title_ar ?? row.title ?? "إنجاز جديد!",
              body: row.body_ar ?? row.body,
              icon: (meta.icon as string | undefined) ?? "🏆",
              xp: meta.xp as number | undefined,
              coins: meta.coins as number | undefined,
              badge: meta.badge as string | null | undefined,
            },
          ]);
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (queue.length === 0) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), 6000);
    return () => clearTimeout(t);
  }, [queue]);

  if (queue.length === 0) return null;
  const current = queue[0];

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[9999] flex justify-center px-4">
      <div className="pointer-events-auto relative w-full max-w-sm animate-scale-in overflow-hidden rounded-2xl border-2 border-amber-400/60 bg-gradient-to-br from-amber-500/20 via-background/95 to-primary/20 p-4 shadow-2xl backdrop-blur">
        {/* Sparkle background */}
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
          <div className="absolute -end-4 -top-4 h-16 w-16 rounded-full bg-amber-400/40 blur-2xl" />
          <div className="absolute -start-4 -bottom-4 h-16 w-16 rounded-full bg-primary/40 blur-2xl" />
        </div>

        <button
          onClick={() => setQueue((q) => q.slice(1))}
          className="absolute end-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          aria-label="dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-3xl shadow-lg ring-2 ring-amber-400/40">
            {current.icon ?? "🏆"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400">
              <Trophy className="h-3 w-3" /> إنجاز جديد!
            </div>
            <div className="mt-0.5 truncate text-base font-black">{current.title}</div>
            {current.body ? <div className="mt-0.5 truncate text-xs text-muted-foreground">{current.body}</div> : null}
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              {current.xp ? <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">+{current.xp} XP</span> : null}
              {current.coins ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-400">+{current.coins} 🪙</span> : null}
              {current.badge ? <span className="rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-fuchsia-300">🎖 شارة</span> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
