import { Link } from "@tanstack/react-router";
import { useGamification } from "@/hooks/use-gamification";
import { levelProgress } from "@/lib/gamification-api";

export function LevelBadge() {
  const { profile } = useGamification();
  if (!profile) return null;
  const { pct } = levelProgress(profile.total_xp, profile.level);
  return (
    <Link
      to="/profile"
      className="group hidden items-center gap-2 rounded-full border border-primary/30 bg-background/60 px-3 py-1.5 text-xs font-medium transition hover:border-primary hover:bg-primary/10 sm:flex"
      title={`المستوى ${profile.level} • ${profile.total_xp} XP`}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
        {profile.level}
      </span>
      <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <span
          className="absolute inset-y-0 start-0 bg-gradient-to-r from-primary to-amber-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="text-muted-foreground group-hover:text-foreground">{profile.total_xp} XP</span>
    </Link>
  );
}
