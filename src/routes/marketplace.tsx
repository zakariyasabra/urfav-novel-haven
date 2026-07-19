import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Coins, Sparkles, Timer } from "lucide-react";

import {
  mkListCategories, mkListItems, mkDailyShop, mkBuyItem,
  CATEGORY_LABELS_AR, RARITY_STYLES,
  type MarketCategory, type MarketCategoryRow, type MarketItem, type DailyShopItem,
} from "@/lib/marketplace-api";
import { useGamification } from "@/hooks/use-gamification";
import { useAuth } from "@/hooks/use-auth";
import { mapError } from "@/lib/errors";

export const Route = createFileRoute("/marketplace")({
  ssr: false,
  component: MarketplacePage,
  head: () => ({ meta: [{ title: "المتجر — FAVNOL" }, { name: "description", content: "متجر العملات: إطارات، ثيمات، شارات، ألقاب، وصناديق غامضة." }] }),
});

function MarketplacePage() {
  const { user } = useAuth();
  const { profile, refresh } = useGamification();
  const [cats, setCats] = useState<MarketCategoryRow[]>([]);
  const [active, setActive] = useState<MarketCategory | "daily">("daily");
  const [items, setItems] = useState<MarketItem[]>([]);
  const [daily, setDaily] = useState<DailyShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => { void mkListCategories().then(setCats); }, []);

  useEffect(() => {
    setLoading(true);
    if (active === "daily") {
      void mkDailyShop().then((d) => { setDaily(d); setLoading(false); });
    } else {
      void mkListItems(active).then((r) => { setItems(r); setLoading(false); });
    }
  }, [active]);

  const balance = profile?.coins ?? 0;

  async function buy(id: string) {
    if (!user) { toast.error("سجّل الدخول أولاً"); return; }
    setBuying(id);
    try {
      const res = await mkBuyItem(id);
      if (res.ok) {
        toast.success("تم الشراء بنجاح");
        void refresh();
        if (active === "daily") void mkDailyShop().then(setDaily);
        else void mkListItems(active).then(setItems);
      } else {
        const msg: Record<string, string> = {
          insufficient_coins: "رصيدك غير كافٍ",
          out_of_stock: "نفذت الكمية",
          vip_only: "متاح لأعضاء VIP فقط",
          limit_reached: "بلغت الحد الأقصى",
          expired: "انتهى العرض",
          not_started: "لم يبدأ بعد",
        };
        toast.error(msg[res.error ?? ""] ?? res.error ?? "تعذّر الشراء");
      }
    } catch (e) {
      toast.error(mapError(e));
    } finally { setBuying(null); }
  }

  const tabs = useMemo(() => [{ code: "daily" as const, label_ar: "المتجر اليومي", icon: "⏳" }, ...cats.map((c) => ({ code: c.code, label_ar: c.label_ar, icon: c.icon ?? "" }))], [cats]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black">
            <Sparkles className="h-6 w-6 text-primary" /> المتجر
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">اصرف عملاتك على إطارات، ثيمات، ألقاب وصناديق غامضة</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2">
          <Coins className="h-5 w-5 text-primary" />
          <span className="font-black text-primary">{balance.toLocaleString()}</span>
        </div>
      </header>

      <div className="mb-5 flex flex-wrap gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.code}
            onClick={() => setActive(t.code as MarketCategory | "daily")}
            className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
              active === t.code ? "border-primary bg-primary text-primary-foreground" : "border-border/50 bg-card/50 hover:bg-card"
            }`}
          >
            <span className="me-1">{t.icon}</span>{t.label_ar}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-card/40" />
          ))}
        </div>
      ) : active === "daily" ? (
        <DailyGrid items={daily} onBuy={buy} buying={buying} balance={balance} />
      ) : (
        <ItemGrid items={items} onBuy={buy} buying={buying} balance={balance} />
      )}
    </div>
  );
}

function ItemGrid({ items, onBuy, buying, balance }: { items: MarketItem[]; onBuy: (id: string) => void; buying: string | null; balance: number }) {
  if (items.length === 0)
    return <div className="rounded-2xl border border-border/40 bg-card/40 p-10 text-center text-muted-foreground">لا توجد عناصر في هذه الفئة حالياً</div>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {items.map((it) => {
        const r = RARITY_STYLES[it.rarity];
        const canAfford = balance >= it.price_coins;
        return (
          <div key={it.id} className={`group relative flex flex-col rounded-2xl border ${r.ring} bg-card/70 p-4 transition hover:-translate-y-0.5 ${r.glow}`}>
            <div className={`mb-2 flex items-center justify-between text-[10px] font-bold uppercase ${r.text}`}>
              <span>{r.label_ar}</span>
              {it.vip_only && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-300">VIP</span>}
            </div>
            <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-background/60 text-4xl">
              {it.image_url ? <img src={it.image_url} alt="" className="max-h-24" /> : (it.icon ?? "🎁")}
            </div>
            <h3 className="mb-1 line-clamp-1 text-sm font-bold">{it.title_ar}</h3>
            <p className="mb-3 line-clamp-2 min-h-[2.5rem] text-xs text-muted-foreground">{it.description_ar}</p>
            <div className="mt-auto flex items-center justify-between">
              <span className="flex items-center gap-1 text-sm font-black text-primary">
                <Coins className="h-4 w-4" />{it.price_coins.toLocaleString()}
              </span>
              <button
                disabled={buying === it.id || !canAfford}
                onClick={() => onBuy(it.id)}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
              >
                {buying === it.id ? "..." : canAfford ? "شراء" : "غير كافٍ"}
              </button>
            </div>
            {it.duration_days ? <div className="mt-2 text-[10px] text-muted-foreground">مدة: {it.duration_days} يوم</div> : null}
            {it.stock != null ? <div className="mt-1 text-[10px] text-muted-foreground">متبقي: {Math.max(0, it.stock - it.stock_sold)}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

function DailyGrid({ items, onBuy, buying, balance }: { items: DailyShopItem[]; onBuy: (id: string) => void; buying: string | null; balance: number }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    const tick = () => {
      const t = new Date(); t.setHours(24, 0, 0, 0);
      const s = Math.max(0, Math.floor((t.getTime() - Date.now()) / 1000));
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
      setRemaining(`${h}س ${m}د ${ss}ث`);
    };
    tick(); const i = setInterval(tick, 1000); return () => clearInterval(i);
  }, []);
  if (items.length === 0)
    return <div className="rounded-2xl border border-border/40 bg-card/40 p-10 text-center text-muted-foreground">لا توجد عناصر متاحة اليوم</div>;
  return (
    <>
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-xs">
        <Timer className="h-4 w-4 text-primary" />
        <span className="text-muted-foreground">يتجدد المتجر خلال</span>
        <span className="font-bold text-primary">{remaining}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((it) => {
          const r = RARITY_STYLES[it.rarity];
          const price = Math.round(it.price_coins * (1 - it.discount_percent / 100));
          const canAfford = balance >= price;
          return (
            <div key={it.item_id} className={`relative flex flex-col rounded-2xl border ${r.ring} bg-card/70 p-4 ${r.glow}`}>
              {it.discount_percent > 0 && (
                <span className="absolute -top-2 start-3 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">-{it.discount_percent}%</span>
              )}
              <div className={`mb-2 text-[10px] font-bold uppercase ${r.text}`}>{r.label_ar}</div>
              <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-background/60 text-4xl">
                {it.image_url ? <img src={it.image_url} alt="" className="max-h-24" /> : (it.icon ?? "🎁")}
              </div>
              <h3 className="mb-1 line-clamp-1 text-sm font-bold">{it.title_ar}</h3>
              <p className="mb-3 text-xs text-muted-foreground">{CATEGORY_LABELS_AR[it.category]}</p>
              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center gap-1 text-sm font-black text-primary">
                  <Coins className="h-4 w-4" />
                  {it.discount_percent > 0 && <span className="me-1 text-xs text-muted-foreground line-through">{it.price_coins}</span>}
                  {price.toLocaleString()}
                </div>
                <button
                  disabled={buying === it.item_id || !canAfford}
                  onClick={() => onBuy(it.item_id)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
                >
                  {buying === it.item_id ? "..." : canAfford ? "شراء" : "غير كافٍ"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
