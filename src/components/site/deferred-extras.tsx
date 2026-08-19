import { lazy, Suspense, useEffect, useState } from "react";

/**
 * Non-critical, fixed/overlay-only widgets. They render nothing in the initial
 * layout flow, so mounting them after the page is interactive costs no UX but
 * removes their JS from the critical path (better FCP/LCP/INP on mobile).
 */
const FeedbackWidget = lazy(() =>
  import("@/components/feedback-widget").then((m) => ({ default: m.FeedbackWidget })),
);
const AnnouncementPopup = lazy(() =>
  import("@/components/site/announcement-banner").then((m) => ({ default: m.AnnouncementPopup })),
);
const XpToast = lazy(() =>
  import("@/components/gamification/xp-toast").then((m) => ({ default: m.XpToast })),
);
const AchievementUnlockToast = lazy(() =>
  import("@/components/gamification/achievement-unlock-toast").then((m) => ({
    default: m.AchievementUnlockToast,
  })),
);
const DailyLoginTrigger = lazy(() =>
  import("@/components/gamification/daily-login-trigger").then((m) => ({
    default: m.DailyLoginTrigger,
  })),
);
const MissionRealtime = lazy(() =>
  import("@/components/gamification/mission-realtime").then((m) => ({
    default: m.MissionRealtime,
  })),
);
const ContentProtection = lazy(() =>
  import("@/components/content-protection").then((m) => ({ default: m.ContentProtection })),
);
const GlobalAdScripts = lazy(() =>
  import("@/components/ads/global-ad-scripts").then((m) => ({ default: m.GlobalAdScripts })),
);

function useAfterInteractive(delay = 1200) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const go = () => !cancelled && setReady(true);
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const timer = window.setTimeout(() => {
      if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(go, { timeout: 2000 });
      else go();
    }, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [delay]);
  return ready;
}

export function DeferredExtras() {
  const ready = useAfterInteractive();
  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <AnnouncementPopup />
      <FeedbackWidget />
      <XpToast />
      <AchievementUnlockToast />
      <DailyLoginTrigger />
      <MissionRealtime />
      <ContentProtection />
      <GlobalAdScripts />
    </Suspense>
  );
}
