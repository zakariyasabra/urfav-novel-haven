import { useEffect } from "react";
import { useAds, useIsVip } from "@/components/ad-slot";
import { injectAdMarkup, isAdActive, passesFrequency } from "@/lib/ads";

/**
 * Loads container-less ad scripts (Adsterra Popunder / Social Bar / interstitials).
 *
 * Mounted once in the root layout. For every enabled, in-schedule ad of kind
 * "popunder" (or slot "popunder"/"global"), the stored <script src="..."> is
 * re-created with document.createElement and appended to <head>, so the browser
 * actually requests the Adsterra file. Injection is de-duplicated by script src,
 * so re-renders and client-side route changes never add a second tag.
 */
export function GlobalAdScripts() {
  const { data: vip } = useIsVip();
  const { data: ads } = useAds();

  useEffect(() => {
    if (vip || !ads?.length) return;
    const globals = ads.filter(
      (a) =>
        (a.kind === "popunder" || a.slot === "popunder" || a.slot === "global") &&
        isAdActive(a) &&
        passesFrequency(a),
    );
    // `once: true` keeps the script alive for the whole session (a popunder
    // handler must outlive React unmounts) and prevents duplicate tags.
    for (const ad of globals) injectAdMarkup(ad, null, { once: true });
  }, [ads, vip]);

  return null;
}
