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

export const Route = createFileRoute("/_authenticated/wallet/history")({
  ssr: false,
  component: WalletHistoryPage,
  head: () => ({ meta: [{ title: "سجل المحفظة — FAVNOL" }] }),
});

const KIND_LABELS: Record<string, string> = {
  purchase: "شراء عملات",
  gift_sent: "إهداء",
  gift_received: "هدية مستلمة",
  admin_grant: "منح إدارة",
  admin_deduct: "خصم إدارة",
  marketplace_spend: "شراء متجر",
  chapter_unlock: "فتح فصل",
  mission_reward: "مكافأة مهمة",
  refund: "استرداد",
  expire: "انتهاء صلاحية",
};

function WalletHistoryPage() {
  const { user } = useAuth();
  const { profile } = useGamification();
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <Coins className="h-6 w-6 text-primary" /> سجل المحفظة
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
          حركات العملات
        </button>
        <button
          onClick={() => setTab("purchases")}
          className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${tab === "purchases" ? "border-primary bg-primary text-primary-foreground" : "border-border/50 bg-card/50"}`}
        >
          المشتريات
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
          <Empty text="لا توجد حركات بعد" />
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
                  <div className="text-sm font-semibold">{KIND_LABELS[c.kind] ?? c.kind}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {c.note ?? ""} — {new Date(c.created_at).toLocaleString("ar-EG")}
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
        <Empty text="لا توجد مشتريات" />
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
                  {new Date(p.created_at).toLocaleString("ar-EG")}
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
