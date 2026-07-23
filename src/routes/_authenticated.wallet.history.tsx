import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Coins, ArrowUp, ArrowDown, ShoppingBag } from "lucide-react";

import {
  mkCoinHistory,
  mkPurchaseHistory,
  type CoinHistoryRow,
  type PurchaseRow,
  CATEGORY_LABELS_AR,
  type MarketCategory,
} from "@/lib/marketplace-api";
import { useAuth } from "@/hooks/use-auth";
import { useGamification } from "@/hooks/use-gamification";
import { usePreferences } from "@/i18n/provider";

export const Route = createFileRoute("/_authenticated/wallet/history")({
  ssr: false,
  component: WalletHistoryPage,
  head: () => ({ meta: [{ title: "سجل المحفظة — FAVNOL" }] }),
});

function WalletHistoryPage() {
  const { user } = useAuth();
  const { profile } = useGamification();
  const { t, lang } = usePreferences();
  const [tab, setTab] = useState<"coins" | "purchases">("coins");
  const [coins, setCoins] = useState<CoinHistoryRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    void Promise.all([mkCoinHistory(100), mkPurchaseHistory(50)]).then(([c, p]) => {
      setCoins(c);
      setPurchases(p);
      setLoading(false);
    });
  }, [user]);

  const dateLocale = lang === "ar" ? "ar-EG" : "en-US";
  const normalizeRewardCode = (value: string | null | undefined) => {
    const trimmed = (value ?? "").trim();
    const match = trimmed.match(/\b(gm|mission):[a-z0-9_:-]+/i);
    return match ? match[0].toLowerCase() : "";
  };

  const isRewardCode = (value: string | null | undefined) => normalizeRewardCode(value).length > 0;

  const humanizeRewardCode = (value: string) => {
    const rewardCode = normalizeRewardCode(value) || value.trim().toLowerCase();
    const [prefix = "", rawName = rewardCode] = rewardCode.split(":");
    const words = rawName.split("_").filter(Boolean);

    if (lang === "ar") {
      const prefixLabel = prefix === "mission" ? "مهمة" : "مكافأة";
      const wordMap: Record<string, string> = {
        achievement: "إنجاز",
        author: "كاتب",
        chapter: "فصل",
        comment: "تعليق",
        daily: "يومية",
        finish: "إنهاء",
        first: "أول",
        follow: "متابعة",
        like: "إعجاب",
        login: "دخول",
        level: "مستوى",
        novel: "رواية",
        publish: "نشر",
        rate: "تقييم",
        read: "قراءة",
        share: "مشاركة",
        streak: "سلسلة",
        up: "ترقية",
      };
      const text = words.map((word) => wordMap[word] ?? word).join(" ").trim();
      return text ? `${prefixLabel}: ${text}` : prefixLabel;
    }

    const text = words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
      .trim();
    return prefix === "mission" ? `Mission: ${text}` : text || value;
  };

  const kindLabel = (kind: string) => {
    const rewardCode = normalizeRewardCode(kind);
    const key = `tx.kind.${rewardCode || kind}`;
    const label = t(key);
    if (label !== key) return label;
    if (rewardCode) return humanizeRewardCode(rewardCode);
    const cleaned = kind.replace(/[_:]+/g, " ").trim();
    return cleaned || kind;
  };

  const rowTitle = (row: CoinHistoryRow) => {
    if (isRewardCode(row.note)) return kindLabel(row.note ?? "");
    if (isRewardCode(row.kind)) return kindLabel(row.kind);
    return kindLabel(row.kind);
  };

  const rowNote = (row: CoinHistoryRow) => {
    if (!row.note || isRewardCode(row.note)) return "";
    return row.note;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <Coins className="h-6 w-6 text-primary" /> {t("wallet.coinHistory")}
        </h1>
        <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2">
          <Coins className="h-5 w-5 text-primary" />
          <span className="font-black text-primary">{(profile?.coins ?? 0).toLocaleString()}</span>
        </div>
      </header>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("coins")}
          className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${tab === "coins" ? "border-primary bg-primary text-primary-foreground" : "border-border/50 bg-card/50"}`}
        >
          {t("wallet.coinHistory")}
        </button>
        <button
          onClick={() => setTab("purchases")}
          className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${tab === "purchases" ? "border-primary bg-primary text-primary-foreground" : "border-border/50 bg-card/50"}`}
        >
          {t("wallet.txHistory")}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-card/40" />
          ))}
        </div>
      ) : tab === "coins" ? (
        coins.length === 0 ? (
          <Empty text={t("wallet.coinHistoryEmpty")} />
        ) : (
          <ul className="divide-y divide-border/30 rounded-2xl border border-border/40 bg-card/40">
            {coins.map((c) => (
              <li key={c.id} className="flex items-center gap-3 p-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${c.amount >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}
                >
                  {c.amount >= 0 ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{rowTitle(c)}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {rowNote(c) ? `${rowNote(c)} — ` : ""}
                    {new Date(c.created_at).toLocaleString(dateLocale)}
                  </div>
                </div>
                <div
                  className={`text-sm font-black ${c.amount >= 0 ? "text-emerald-300" : "text-red-300"}`}
                >
                  {c.amount >= 0 ? "+" : ""}
                  {c.amount.toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : purchases.length === 0 ? (
        <Empty text={t("wallet.txEmpty")} />
      ) : (
        <ul className="divide-y divide-border/30 rounded-2xl border border-border/40 bg-card/40">
          {purchases.map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{p.title_ar}</div>
                <div className="text-[11px] text-muted-foreground">
                  {CATEGORY_LABELS_AR[p.category as MarketCategory] ?? p.category} —{" "}
                  {new Date(p.created_at).toLocaleString(dateLocale)}
                </div>
              </div>
              <div className="text-sm font-black text-primary">
                -{p.price_coins.toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 p-10 text-center text-muted-foreground">
      {text}
    </div>
  );
}
