import { useQuery } from "@tanstack/react-query";
import {
  Eye, Users, Star, Heart, MessageSquare, Coins, Gift, BookOpen,
  Layers, UserCheck, Crown, TrendingUp, Wallet, CheckCircle2,
} from "lucide-react";
import { formatViews } from "@/lib/format";
import { fetchNovelAnalytics, fetchAuthorAnalytics } from "@/lib/analytics-api";

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
  const { data, isLoading, error } = useQuery({
    queryKey: ["novel-analytics", novelId],
    queryFn: () => fetchNovelAnalytics(novelId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return <div className="rounded-xl border border-border/40 bg-surface/30 p-6 text-center text-sm text-muted-foreground">جاري تحميل الإحصائيات…</div>;
  }
  if (error || !data) {
    return <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">تعذّر تحميل الإحصائيات</div>;
  }

  const completion = data.chapters_total > 0
    ? Math.round((data.chapters_published / data.chapters_total) * 100)
    : 0;

  const items: Item[] = [
    { icon: <Eye />, label: "مشاهدات الرواية", value: formatViews(data.views_total) },
    { icon: <Eye />, label: "مشاهدات الفصول", value: formatViews(data.chapter_views) },
    { icon: <Users />, label: "قراء فريدون", value: formatViews(data.unique_readers) },
    { icon: <Heart />, label: "المفضلة", value: formatViews(data.favorites) },
    { icon: <MessageSquare />, label: "تعليقات", value: formatViews(data.comments) },
    { icon: <Star />, label: "التقييم", value: `${Number(data.rating_avg).toFixed(2)} (${data.rating_count})` },
    { icon: <Layers />, label: "نسبة النشر", value: `${completion}%` },
    { icon: <BookOpen />, label: "فصول منشورة", value: `${data.chapters_published}/${data.chapters_total}` },
    { icon: <CheckCircle2 />, label: "فتح فصول مدفوعة", value: formatViews(data.unlocks) },
    { icon: <Coins />, label: "عملات مكتسبة", value: formatViews(data.coins_earned) },
    { icon: <Gift />, label: "هدايا مستلمة", value: formatViews(data.gifts_received) },
    { icon: <Coins />, label: "عملات الهدايا", value: formatViews(data.gift_coins) },
  ];

  return <Grid items={items} />;
}

export function AuthorAnalyticsPanel({ authorId }: { authorId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["author-analytics", authorId],
    queryFn: () => fetchAuthorAnalytics(authorId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return <div className="rounded-xl border border-border/40 bg-surface/30 p-6 text-center text-sm text-muted-foreground">جاري تحميل الإحصائيات…</div>;
  }
  if (error || !data) {
    return <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">تعذّر تحميل الإحصائيات</div>;
  }

  const items: Item[] = [
    { icon: <BookOpen />, label: "روايات", value: `${data.novels_published}/${data.novels_total}` },
    { icon: <Layers />, label: "فصول منشورة", value: `${data.chapters_published}/${data.chapters_total}` },
    { icon: <Eye />, label: "إجمالي المشاهدات", value: formatViews(data.views_total) },
    { icon: <UserCheck />, label: "متابعون", value: formatViews(data.followers) },
    { icon: <Heart />, label: "مفضلة", value: formatViews(data.favorites) },
    { icon: <Users />, label: "قراء فريدون", value: formatViews(data.unique_readers) },
    { icon: <Crown />, label: "قراء VIP", value: formatViews(data.vip_readers) },
    { icon: <Coins />, label: "عملات مكتسبة", value: formatViews(data.coins_total) },
    { icon: <TrendingUp />, label: "معلّق", value: formatViews(data.coins_pending) },
    { icon: <Wallet />, label: "مسحوب", value: formatViews(data.coins_paid_out) },
    { icon: <Gift />, label: "هدايا", value: formatViews(data.gifts_received) },
    { icon: <Coins />, label: "عملات الهدايا", value: formatViews(data.gift_coins) },
  ];

  return <Grid items={items} />;
}
