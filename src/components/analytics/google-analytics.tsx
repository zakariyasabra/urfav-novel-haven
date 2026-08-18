import { useEffect } from "react";

const GA_ID = "G-TSHB4HKGWH";

declare global {
  interface Window {
    dataLayer: any[];
  }
}

export default function GoogleAnalytics() {
  useEffect(() => {
    if (document.querySelector(`script[src*="googletagmanager.com/gtag"]`)) {
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;

    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];

    const gtag = (...args: any[]) => {
      window.dataLayer.push(args);
    };

    gtag("js", new Date());
    gtag("config", GA_ID);
  }, []);

  return null;
}
