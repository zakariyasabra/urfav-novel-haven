import { createFileRoute } from "@tanstack/react-router";

import { GamificationProfile } from "@/components/gamification/profile-panel";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/achievements")({
  ssr: false,
  component: AchievementsPage,
  head: () => ({ meta: [{ title: "الإنجازات والشارات — FAVNOL" }] }),
});

function AchievementsPage() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-black">الإنجازات والشارات</h1>
      {user ? (
        <GamificationProfile />
      ) : (
        <div className="rounded-xl border border-border/40 bg-card/60 p-8 text-center text-muted-foreground">
          سجّل الدخول لعرض إنجازاتك
        </div>
      )}
    </div>
  );
}
