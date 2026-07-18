import { levelProgress } from "@/lib/gamification-api";

interface Props {
  totalXp: number;
  level: number;
  showLabel?: boolean;
  className?: string;
}

/** Reusable XP progress bar — used in header badge, profile panel, and library. */
export function XpProgressBar({ totalXp, level, showLabel = true, className = "" }: Props) {
  const { into, needed, pct } = levelProgress(totalXp, level);
  return (
    <div className={className}>
      {showLabel ? (
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="font-bold">Lv {level}</span>
          <span className="text-muted-foreground">{into}/{needed} XP</span>
        </div>
      ) : null}
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-gradient-to-r from-primary to-amber-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
