import { useEffect } from "react";
import { toast } from "sonner";
import { Trophy, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to realtime mission/challenge progress for the signed-in user.
 * - Fires an animated toast when a mission or weekly challenge completes.
 * - Broadcasts a global "gm:refresh" event so widgets refetch without polling.
 */
export function MissionRealtime() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`gm-mission-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_daily_missions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRow = payload.new as { completed?: boolean; mission_code?: string } | null;
          const oldRow = payload.old as { completed?: boolean } | null;
          window.dispatchEvent(new CustomEvent("gm:refresh"));
          if (newRow?.completed && !oldRow?.completed) {
            toast.success(
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400 animate-bounce" />
                <div>
                  <div className="font-bold">مهمة مكتملة!</div>
                  <div className="text-xs opacity-80">اذهب إلى /missions لاستلام مكافأتك</div>
                </div>
              </div>,
              { duration: 5000 },
            );
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_weekly_challenges",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRow = payload.new as { completed?: boolean } | null;
          const oldRow = payload.old as { completed?: boolean } | null;
          window.dispatchEvent(new CustomEvent("gm:refresh"));
          if (newRow?.completed && !oldRow?.completed) {
            toast.success(
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-fuchsia-400 animate-pulse" />
                <div>
                  <div className="font-bold">تحدي أسبوعي مكتمل!</div>
                  <div className="text-xs opacity-80">استلم مكافأتك الآن</div>
                </div>
              </div>,
              { duration: 6000 },
            );
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
}
