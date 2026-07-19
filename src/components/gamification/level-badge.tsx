import { Link } from "@tanstack/react-router";
import { Coins } from "lucide-react";
import { useGamification } from "@/hooks/use-gamification";
import { levelProgress } from "@/lib/gamification-api";

export function LevelBadge() {
  const { profile } = useGamification();
  if (!profile) return null;
  const { pct } = levelProgress(profile.total_xp, profile.level);
  return (
    <Link
      to="/profile"
      className="group flex items-center gap-1.5 rounded-full border border-primary/30 bg-background/60 px-2 py-1 text-xs font-medium transition hover:border-primary hover:bg-primary/10 sm:gap-2 sm:px-3 sm:py-1.5"
      title={`المستوى ${profile.level} • ${profile.total_xp} XP • ${profile.coins} 🪙`}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary sm:h-6 sm:w-6 sm:text-xs">
        {profile.level}
      </span>
      <span className="relative hidden h-1.5 w-14 overflow-hidden rounded-full bg-muted sm:block md:w-16">
        <span
          className="absolute inset-y-0 start-0 bg-gradient-to-r from-primary to-amber-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="hidden text-muted-foreground group-hover:text-foreground md:inline">
        {profile.total_xp} XP
      </span>
      <span className="inline-flex items-center gap-0.5 text-amber-400">
        <Coins className="h-3 w-3" />
        <span className="text-[10px] font-semibold tabular-nums sm:text-xs">{profile.coins}</span>
      </span>
    </Link>
  );
}
