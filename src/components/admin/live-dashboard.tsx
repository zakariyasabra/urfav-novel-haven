import { useEffect, useState } from "react";
import { Activity, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/i18n/provider";

/**
 * Live presence widget. Counts unique connected users via Supabase Realtime presence.
 * Every signed-in user's Layout mounts this via the AdminPage header when admin visits /admin.
 */
export function LivePresence() {
  const t = useT();
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const channel = supabase.channel("presence:online", {
      config: { presence: { key: user?.id ?? crypto.randomUUID() } },
    });
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      setCount(Object.keys(state).length);
    });
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ at: Date.now() });
      }
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-500">
      <span className="relative flex h-2 w-2">
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative rounded-full bg-emerald-500 h-2 w-2" />
      </span>
      <Activity className="h-3.5 w-3.5" />
      <Users className="h-3.5 w-3.5" />
      <span>{t("live.online", { n: String(count) })}</span>
    </div>
  );
}
