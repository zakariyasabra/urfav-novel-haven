import { Flame } from "lucide-react";
import { useGamification } from "@/hooks/use-gamification";

export function StreakWidget() {
  const { profile } = useGamification();
  if (!profile || profile.streak_current === 0) return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2">
      <Flame className="h-5 w-5 text-orange-500" />
      <span className="text-sm font-bold text-orange-500">{profile.streak_current} يوم متتالي</span>
      {profile.streak_longest > profile.streak_current ? (
        <span className="text-[10px] text-muted-foreground">أطول: {profile.streak_longest}</span>
      ) : null}
    </div>
  );
}
