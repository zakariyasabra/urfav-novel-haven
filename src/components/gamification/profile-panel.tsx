import { useEffect, useState } from "react";
import { Sparkles, Trophy, Coins, Star } from "lucide-react";
import { useGamification } from "@/hooks/use-gamification";
import { gmListBadges, gmMyBoxes, gmOpenBox, levelProgress, RARITY_STYLES } from "@/lib/gamification-api";
import { ReadingStatsPanel } from "@/components/gamification/reading-stats-panel";
import { AchievementsGrid } from "@/components/gamification/achievements-grid";
import { toast } from "sonner";

interface Badge { code: string; title_ar: string; icon: string | null; rarity: string }

export function GamificationProfile() {
  const { profile, refresh } = useGamification();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [boxes, setBoxes] = useState<Array<{ id: string; opened: boolean; source: string }>>([]);

  useEffect(() => {
    void gmListBadges().then((d) => setBadges(d as Badge[]));
    void gmMyBoxes().then((d) => setBoxes(d as never));
  }, [profile]);

  if (!profile) return null;
  const { into, needed, pct } = levelProgress(profile.total_xp, profile.level);
  const badgeSet = new Set(profile.badges.map((b) => b.code));
  const unopened = boxes.filter((b) => !b.opened);

  async function openBox(id: string) {
    try {
      const r = await gmOpenBox(id);
      const reward = r.reward as Record<string, unknown>;
      const parts: string[] = [];
      if (reward.xp) parts.push(`+${reward.xp} XP`);
      if (reward.coins) parts.push(`+${reward.coins} 🪙`);
      if (reward.badge) parts.push(`شارة: ${reward.badge}`);
      if (reward.vip_days) parts.push(`VIP ${reward.vip_days} يوم`);
      toast.success("فتحت الصندوق: " + parts.join(" • "));
      void refresh();
      void gmMyBoxes().then((d) => setBoxes(d as never));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Level Card */}
      <section className="overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-background p-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-primary/20 text-primary">
            <span className="text-[10px] uppercase tracking-widest">Level</span>
            <span className="text-3xl font-black">{profile.level}</span>
          </div>
          <div className="min-w-[220px] flex-1">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-bold">{profile.total_xp} XP</span>
              <span className="text-muted-foreground">{into}/{needed} للمستوى التالي</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-gradient-to-r from-primary to-amber-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-amber-400">
                <Coins className="h-3.5 w-3.5" /> {profile.coins}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-3 py-1 text-orange-400">
                🔥 {profile.streak_current}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-primary">
                <Trophy className="h-3.5 w-3.5" /> {profile.achievements.length}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Unopened boxes */}
      {unopened.length > 0 ? (
        <section className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Sparkles className="h-4 w-4 text-amber-400" /> صناديق مكافآت بانتظارك ({unopened.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {unopened.map((b) => (
              <button
                key={b.id}
                onClick={() => openBox(b.id)}
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm hover:scale-105 transition-transform"
              >
                🎁 افتح
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Badges */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Star className="h-4 w-4 text-primary" /> الشارات ({profile.badges.length}/{badges.length})
        </h3>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-7">
          {badges.map((b) => {
            const owned = badgeSet.has(b.code);
            return (
              <div
                key={b.code}
                className={`aspect-square flex flex-col items-center justify-center rounded-xl border p-2 text-center transition ${owned ? "border-primary/40 bg-primary/10" : "border-border/40 bg-muted/30 opacity-40 grayscale"}`}
                title={b.title_ar}
              >
                <div className="text-3xl">{b.icon ?? "🏅"}</div>
                <div className="mt-1 text-[10px] font-medium">{b.title_ar}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Achievements */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Trophy className="h-4 w-4 text-primary" /> الإنجازات ({profile.achievements.length}/{achievements.length})
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {achievements.map((a) => {
            const owned = achSet.has(a.code);
            return (
              <div
                key={a.code}
                className={`flex items-center gap-3 rounded-lg border p-3 ${owned ? "border-primary/40 bg-primary/5" : "border-border/40 bg-muted/20 opacity-60"}`}
              >
                <div className="text-2xl">{a.icon ?? "🏆"}</div>
                <div className="flex-1">
                  <div className="text-sm font-bold">{a.title_ar}</div>
                  {a.description_ar ? <div className="text-xs text-muted-foreground">{a.description_ar}</div> : null}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  +{a.xp} XP<br />+{a.coins} 🪙
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
