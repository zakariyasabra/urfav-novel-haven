import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Single source of truth for "is this visitor allowed to load ads?".
 *
 * VIP state comes from the existing `is_vip(_user_id)` database function, which
 * already treats an expired/cancelled subscription as NOT VIP:
 *   status = 'active' AND (expires_at IS NULL OR expires_at > now())
 * So nothing about payments/subscriptions is duplicated or changed here.
 */
export function useVipStatus() {
  const { user, loading } = useAuth();
  const query = useQuery({
    queryKey: ["is-vip", user?.id ?? null],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase.rpc("is_vip", { _user_id: user.id });
      if (error) throw error;
      return !!data;
    },
    enabled: !loading && !!user,
    // Re-check so a renewal starts blocking ads and an expiry restores them
    // without the user re-creating the account or hard-reloading.
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  // Anonymous visitors are never VIP → resolved immediately.
  const resolved = loading ? false : !user ? true : query.isSuccess || query.isError;
  const isVip = !!query.data;
  return { isVip, resolved };
}

/**
 * `true` only when we positively know the visitor is not an active VIP.
 * While auth/VIP state is still unknown we return `false`, so no ad markup and
 * no external ad script is ever injected "first and hidden later".
 */
export function useCanShowAds(): boolean {
  const { isVip, resolved } = useVipStatus();
  return resolved && !isVip;
}
