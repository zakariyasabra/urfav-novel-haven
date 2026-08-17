import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fetchActiveAds, injectAdMarkup, pickAdForSlot, type AdRecord } from "@/lib/ads";

/** Shared query for all ad slots — one network request per page/session. */
export function useAds() {
  return useQuery({
    queryKey: ["ad-placements"],
    queryFn: fetchActiveAds,
    staleTime: 5 * 60_000,
  });
}

/** VIP members never see ads. */
export function useIsVip() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["is-vip", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("is_vip", { _user_id: user.id });
      return !!data;
    },
    enabled: !!user,
  });
}

export function AdSlot({ slot, className = "" }: { slot: string; className?: string }) {
  const { data: vip } = useIsVip();
  const { data: ads } = useAds();
  const ad = pickAdForSlot(ads, slot);
  if (vip) return null;
  // Popunder ads have no visible container — they are handled globally by <GlobalAdScripts />.
  if (!ad || ad.kind === "popunder") return null;

  if (ad.kind === "image" || (ad.kind === "native" && ad.image_url)) {
    return <ImageAd ad={ad} className={className} />;
  }
  return <ScriptAd ad={ad} className={className} />;
}

function ImageAd({ ad, className }: { ad: AdRecord; className: string }) {
  const img = (
    <img
      src={ad.image_url ?? ""}
      alt=""
      loading="lazy"
      className="mx-auto max-w-full rounded-xl"
    />
  );
  return (
    <div className={`ad-slot mx-auto my-4 max-w-full text-center ${className}`} data-slot={ad.slot}>
      {ad.link_url ? (
        <a href={ad.link_url} target="_blank" rel="noopener noreferrer sponsored">
          {img}
        </a>
      ) : (
        img
      )}
    </div>
  );
}

/**
 * Renders admin-authored ad markup (AdSense / custom HTML / native / banner).
 * Scripts inside the markup are re-created as real <script> elements so they run.
 */
function ScriptAd({ ad, className }: { ad: AdRecord; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const cleanup = injectAdMarkup(ad, ref.current);
    return cleanup;
    // Re-inject only when the ad itself changes, not on every re-render.
  }, [ad.id, ad.script_html]);

  if (!ad.script_html) return null;
  return (
    <div
      ref={ref}
      className={`ad-slot mx-auto my-4 max-w-full text-center text-xs text-muted-foreground ${className}`}
      data-slot={ad.slot}
    />
  );
}
