import { useEffect } from "react";
import { useAds } from "@/components/ad-slot";
import { useCanShowAds } from "@/hooks/use-can-show-ads";
import { injectAdMarkup, isAdActive, passesFrequency } from "@/lib/ads";

/**
 * Loads container-less ad scripts (Adsterra Popunder / Social Bar / interstitials).
 *
 * Mounted once in the root layout. Nothing is injected until we positively know
 * the visitor is not an active VIP (`useCanShowAds()`), so the Adsterra file is
 * never requested for VIP members — it is prevented, not hidden.
 *
 * For every enabled, in-schedule ad of kind "popunder" (or slot
 * "popunder"/"global"), the stored <script src="..."> is re-created with
 * document.createElement and appended to <head>. Injection is de-duplicated by
 * script src, so re-renders and client-side route changes never add a second tag.
 */
export function GlobalAdScripts() {
  const canShowAds = useCanShowAds();
  const { data: ads } = useAds();

  useEffect(() => {
    if (!canShowAds || !ads?.length) return;
    const globals = ads.filter(
      (a) =>
        (a.kind === "popunder" || a.slot === "popunder" || a.slot === "global") &&
        isAdActive(a) &&
        passesFrequency(a),
    );
    // `once: true` keeps the script alive for the whole session (a popunder
    // handler must outlive React unmounts) and prevents duplicate tags.
    for (const ad of globals) injectAdMarkup(ad, null, { once: true });
  }, [ads, canShowAds]);

  return null;
}

