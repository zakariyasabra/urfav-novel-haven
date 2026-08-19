import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Users } from "lucide-react";

import { WeeklyChallengesWidget } from "@/components/gamification/weekly-challenges-widget";
import { RewardInbox } from "@/components/gamification/reward-inbox";
import { RankBadge } from "@/components/gamification/rank-badge";
import { useAuth } from "@/hooks/use-auth";
import { gmGetReferralCode } from "@/lib/gamification-api";
import { toast } from "sonner";

export const Route = createFileRoute("/missions")({
  ssr: false,
  component: MissionsPage,
  head: () => ({ meta: [{ title: "المهام والمكافآت — FAVNOL" }] }),
});

function MissionsPage() {
  const { user } = useAuth();
  const [ref, setRef] = useState<string | null>(null);
  useEffect(() => {
    if (user) void gmGetReferralCode().then(setRef);
  }, [user]);

  const url = typeof window !== "undefined" && ref ? `${window.location.origin}/r/${ref}` : "";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-black">المهام والمكافآت</h1>
      {user ? (
        <>
          <RankBadge />
          <RewardInbox />
          <WeeklyChallengesWidget />
          <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Users className="h-4 w-4 text-primary" /> ادعُ أصدقاءك
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              اربح 100 XP و 100 عملة عن كل صديق يسجّل من رابطك. صديقك يربح 50 XP و 50 عملة.
            </p>
            {url ? (
              <div className="flex items-center gap-2 rounded-lg bg-background/60 p-2">
                <input readOnly value={url} className="flex-1 bg-transparent px-2 text-xs" />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(url);
                    toast.success("نُسخ الرابط");
                  }}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-border/40 bg-card/60 p-8 text-center text-muted-foreground">
          سجّل الدخول لعرض مهامك اليومية
        </div>
      )}
    </div>
  );
}
