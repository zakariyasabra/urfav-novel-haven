import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  Users,
  Star,
  Heart,
  MessageSquare,
  Coins,
  Gift,
  BookOpen,
  Layers,
  UserCheck,
  Crown,
  TrendingUp,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { formatViews } from "@/lib/format";
import { fetchNovelAnalytics, fetchAuthorAnalytics } from "@/lib/analytics-api";
import { useT } from "@/i18n/provider";

type Item = { icon: React.ReactNode; label: string; value: string | number };

function Grid({ items }: { items: Item[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-border/40 bg-surface/40 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-primary [&>svg]:h-3.5 [&>svg]:w-3.5">{it.icon}</span>
            {it.label}
          </div>
          <div className="text-xl font-black tabular-nums">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

export function NovelAnalyticsPanel({ novelId }: { novelId: string }) {
  const t = useT();
  const { data, isLoading, error } = useQuery({
    queryKey: ["novel-analytics", novelId],
    queryFn: () => fetchNovelAnalytics(novelId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/40 bg-surface/30 p-6 text-center text-sm text-muted-foreground">
        {t("an.loading")}
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {t("an.error")}
      </div>
    );
  }

  const completion =
    data.chapters_total > 0 ? Math.round((data.chapters_published / data.chapters_total) * 100) : 0;

  const items: Item[] = [
    { icon: <Eye />, label: t("an.n.views"), value: formatViews(data.views_total) },
    { icon: <Eye />, label: t("an.n.chViews"), value: formatViews(data.chapter_views) },
    { icon: <Users />, label: t("an.n.readers"), value: formatViews(data.unique_readers) },
    { icon: <Heart />, label: t("an.n.favs"), value: formatViews(data.favorites) },
    { icon: <MessageSquare />, label: t("an.n.comments"), value: formatViews(data.comments) },
    {
      icon: <Star />,
      label: t("an.n.rating"),
      value: `${Number(data.rating_avg).toFixed(2)} (${data.rating_count})`,
    },
    { icon: <Layers />, label: t("an.n.publishRatio"), value: `${completion}%` },
    {
      icon: <BookOpen />,
      label: t("an.n.chPublished"),
      value: `${data.chapters_published}/${data.chapters_total}`,
    },
    { icon: <CheckCircle2 />, label: t("an.n.unlocks"), value: formatViews(data.unlocks) },
    { icon: <Coins />, label: t("an.n.coinsEarned"), value: formatViews(data.coins_earned) },
    { icon: <Gift />, label: t("an.n.gifts"), value: formatViews(data.gifts_received) },
    { icon: <Coins />, label: t("an.n.giftCoins"), value: formatViews(data.gift_coins) },
  ];

  return <Grid items={items} />;
}

export function AuthorAnalyticsPanel({ authorId }: { authorId: string }) {
  const t = useT();
  const { data, isLoading, error } = useQuery({
    queryKey: ["author-analytics", authorId],
    queryFn: () => fetchAuthorAnalytics(authorId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/40 bg-surface/30 p-6 text-center text-sm text-muted-foreground">
        {t("an.loading")}
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {t("an.error")}
      </div>
    );
  }

  const items: Item[] = [
    {
      icon: <BookOpen />,
      label: t("an.a.novels"),
      value: `${data.novels_published}/${data.novels_total}`,
    },
    {
      icon: <Layers />,
      label: t("an.a.chPublished"),
      value: `${data.chapters_published}/${data.chapters_total}`,
    },
    { icon: <Eye />, label: t("an.a.views"), value: formatViews(data.views_total) },
    { icon: <UserCheck />, label: t("an.a.followers"), value: formatViews(data.followers) },
    { icon: <Heart />, label: t("an.a.favs"), value: formatViews(data.favorites) },
    { icon: <Users />, label: t("an.a.readers"), value: formatViews(data.unique_readers) },
    { icon: <Crown />, label: t("an.a.vipReaders"), value: formatViews(data.vip_readers) },
    { icon: <Coins />, label: t("an.a.coinsTotal"), value: formatViews(data.coins_total) },
    { icon: <TrendingUp />, label: t("an.a.pending"), value: formatViews(data.coins_pending) },
    { icon: <Wallet />, label: t("an.a.paidOut"), value: formatViews(data.coins_paid_out) },
    { icon: <Gift />, label: t("an.a.gifts"), value: formatViews(data.gifts_received) },
    { icon: <Coins />, label: t("an.a.giftCoins"), value: formatViews(data.gift_coins) },
  ];

  return <Grid items={items} />;
}
