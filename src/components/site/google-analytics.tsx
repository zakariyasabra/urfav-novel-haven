import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

export const GA_MEASUREMENT_ID = "G-TSHB4HKGWH";

type GtagWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

/**
 * Loads Google Analytics (GA4) after the app is interactive so it never blocks
 * FCP/LCP, and reports a page_view on every client-side route change (the SPA
 * router does not trigger GA's automatic pageview).
 */
export function GoogleAnalytics() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as GtagWindow;

    if (!document.getElementById("ga4-script")) {
      w.dataLayer = w.dataLayer || [];
      w.gtag = function gtag(...args: unknown[]) {
        w.dataLayer!.push(args);
      };
      w.gtag("js", new Date());
      // We send page_view manually on each route change.
      w.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });

      const s = document.createElement("script");
      s.id = "ga4-script";
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(s);
    }

    const send = () => {
      w.gtag?.("event", "page_view", {
        page_path: window.location.pathname + window.location.search,
        page_location: window.location.href,
        page_title: document.title,
      });
    };

    send();
    const unsub = router.subscribe("onResolved", send);
    return unsub;
  }, [router]);

  return null;
}
