import { useQuery } from "@tanstack/react-query";
import { fetchAdPlacements } from "@/lib/site-api";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function AdSlot({ slot, className = "" }: { slot: string; className?: string }) {
  const { user } = useAuth();
  const { data: vip } = useQuery({
    queryKey: ["is-vip", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("is_vip", { _user_id: user.id });
      return !!data;
    },
    enabled: !!user,
  });
  const { data } = useQuery({ queryKey: ["ad-placements"], queryFn: fetchAdPlacements, staleTime: 60_000 });
  if (vip) return null;
  const ad = data?.find((a) => a.slot === slot);
  if (!ad || !ad.enabled || !ad.script_html) return null;
  return (
    <div
      className={`ad-slot mx-auto my-4 max-w-full text-center text-xs text-muted-foreground ${className}`}
      data-slot={slot}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: ad.script_html }}
    />
  );
}
