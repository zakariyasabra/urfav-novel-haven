import { useEffect, useState } from "react";
import { gmUserRank, RANK_STYLES, type GmRank } from "@/lib/gamification-api";

interface Props { userId?: string; compact?: boolean }

export function RankBadge({ userId, compact }: Props) {
  const [rank, setRank] = useState<GmRank | null>(null);
  useEffect(() => { void gmUserRank(userId).then(setRank); }, [userId]);
  if (!rank) return null;
  const s = RANK_STYLES[rank.tier] ?? RANK_STYLES.bronze;
  const score = Number(rank.score ?? 0);
  const nextAt = Number(rank.next_at ?? 0);
  const xp = Number(rank.xp ?? 0);
  const achievements = Number(rank.achievements ?? 0);
  const chapters = Number(rank.chapters ?? 0);
  const pct = nextAt > 0 ? Math.min(100, Math.round((score / nextAt) * 100)) : 100;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${s.ring} ${s.text} ${s.bg}`}
        title={`${s.label_ar} — ${rank.score.toLocaleString()} نقطة`}
      >
        <span>{s.icon}</span>
        <span>{s.label_ar}</span>
      </span>
    );
  }

  return (
    <div className={`rounded-2xl border p-4 ${s.ring} ${s.bg}`}>
      <div className="mb-2 flex items-center gap-3">
        <span className="text-3xl">{s.icon}</span>
        <div>
          <div className={`text-lg font-black ${s.text}`}>{s.label_ar}</div>
          <div className="text-[11px] text-muted-foreground">
            {rank.score.toLocaleString()} نقطة إجمالية
          </div>
        </div>
      </div>
      {rank.next_tier && rank.next_at > 0 ? (
        <>
          <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
            <span>التقدّم للرتبة التالية</span>
            <span>{rank.score.toLocaleString()} / {rank.next_at.toLocaleString()}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-background/60">
            <div className="h-full bg-gradient-to-r from-primary to-orange-400" style={{ width: `${pct}%` }} />
          </div>
        </>
      ) : (
        <div className="text-[11px] font-bold text-primary">أعلى رتبة!</div>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] text-muted-foreground">
        <div><div className="text-sm font-bold text-foreground">{rank.xp.toLocaleString()}</div>XP</div>
        <div><div className="text-sm font-bold text-foreground">{rank.achievements}</div>إنجازات</div>
        <div><div className="text-sm font-bold text-foreground">{rank.chapters}</div>فصول</div>
      </div>
    </div>
  );
}
