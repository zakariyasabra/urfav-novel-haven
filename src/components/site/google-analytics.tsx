import { useEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";

export const GA_MEASUREMENT_ID = "G-TSHB4HKGWH";

type GtagWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

/**
 * The gtag.js snippet itself is server-rendered from the root route `head()`
 * (see src/routes/__root.tsx) so it is present in the initial HTML in
 * production. This component only reports the SPA route changes, because
 * gtag's automatic page_view fires once per full document load.
 */
export function GoogleAnalytics() {
  const router = useRouter();
  const firstRun = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as GtagWindow;

    const send = () => {
      // The initial page_view is sent by gtag('config', ...) on load.
      if (firstRun.current) {
        firstRun.current = false;
        return;
      }
      w.gtag?.("event", "page_view", {
        page_path: window.location.pathname + window.location.search,
        page_location: window.location.href,
        page_title: document.title,
      });
    };

    send();
    return router.subscribe("onResolved", send);
  }, [router]);

  return null;
}
