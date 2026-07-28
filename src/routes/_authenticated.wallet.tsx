import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Coins,
  CreditCard,
  Gift,
  TicketPercent,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useTimeAgo } from "@/lib/format";
import { fetchMyCoinHistory } from "@/lib/monetization-api";
import { fetchCoinPackages, fetchCurrencySettings, formatMoney } from "@/lib/pricing-api";
import { BuyCoinsDialog, MyPurchasesList } from "@/components/wallet/buy-coins-dialog";
import { WalletGiftDialog } from "@/components/wallet/wallet-gift-dialog";
import { useT, usePreferences } from "@/i18n/provider";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "Wallet — FAVNOL" }, { name: "robots", content: "noindex" }] }),
  component: WalletPage,
});

function WalletPage() {
  const t = useT();
  const { lang } = usePreferences();
  const locale = lang === "en" ? "en-US" : "ar-EG";
  const timeAgo = useTimeAgo();
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [buying, setBuying] = useState<{
    coins: number;
    usdCents: number | null;
    egpCents: number | null;
  } | null>(null);
  const [giftOpen, setGiftOpen] = useState(false);
  const packagesQ = useQuery({
    queryKey: ["coin-packages"],
    queryFn: () => fetchCoinPackages(false),
  });
  const currencyQ = useQuery({ queryKey: ["currency-settings"], queryFn: fetchCurrencySettings });

  const walletQ = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallets")
        .select("coins,updated_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data ?? { coins: 0, updated_at: null };
    },
    enabled: !!user,
  });

  const txQ = useQuery({
    queryKey: ["payment-tx", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_transactions")
        .select("id,amount_cents,currency,status,provider,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as unknown as {
        id: string;
        amount_cents: number;
        currency: string;
        status: string;
        provider: string | null;
        created_at: string;
      }[];
    },
    enabled: !!user,
  });

  const coinHistoryQ = useQuery({
    queryKey: ["coin-history", user?.id],
    queryFn: () => fetchMyCoinHistory(50),
    enabled: !!user,
  });

  const subQ = useQuery({
    queryKey: ["my-vip", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("vip_subscriptions")
        .select("status,expires_at,plan:vip_plans(name_ar,name_en,price_usd_cents)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  async function redeemCoupon() {
    const c = code.trim().toUpperCase();
    if (!c) return;
    const { data, error } = await supabase
      .from("coupons")
      .select("code,discount_percent,bonus_coins,uses_left,expires_at")
      .eq("code", c)
      .maybeSingle();
    if (error) return toast.error(t("wallet.coupon.checkError"));
    if (!data) return toast.error(t("wallet.coupon.invalid"));
    if (data.uses_left <= 0) return toast.error(t("wallet.coupon.exhausted"));
    if (data.expires_at && new Date(data.expires_at) < new Date())
      return toast.error(t("wallet.coupon.expired"));
    toast.success(
      t("wallet.coupon.valid", { pct: data.discount_percent, bonus: data.bonus_coins }),
    );
    setCode("");
  }

  const sub = subQ.data as null | {
    status: string;
    expires_at: string | null;
    plan: { name_ar: string; name_en: string | null } | null;
  };
  const planName = sub?.plan
    ? lang === "en"
      ? sub.plan.name_en || sub.plan.name_ar
      : sub.plan.name_ar
    : t("wallet.subUnknownPlan");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-black md:text-4xl">{t("wallet.title")}</h1>

      <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/25 via-surface-elevated to-surface p-6 shadow-elevated">
        <div className="absolute -end-6 -top-6 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <div className="mb-1 text-xs uppercase tracking-widest text-primary">
            {t("wallet.balance")}
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="break-all text-4xl font-black tabular-nums sm:text-5xl">
              {(walletQ.data?.coins ?? 0).toLocaleString(locale)}
            </span>
            <Coins className="h-6 w-6 shrink-0 text-primary" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link to="/vip">
                <CreditCard className="me-1 h-4 w-4" />
                {t("vip.title")}
              </Link>
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setGiftOpen(true)}>
              <Gift className="me-1 h-4 w-4" />
              {t("wallet.gift")}
            </Button>
            {giftOpen && <WalletGiftDialog onClose={() => setGiftOpen(false)} />}
          </div>
        </div>
      </div>

      {sub && (
        <div className="mt-4 rounded-2xl border border-border/40 bg-surface/40 p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {t("wallet.subscription")}
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold">{planName}</div>
            <div className="text-xs text-muted-foreground">
              {sub.status} —{" "}
              {t("wallet.subExpiresAt", {
                d: sub.expires_at ? new Date(sub.expires_at).toLocaleDateString(locale) : "—",
              })}
            </div>
          </div>
        </div>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-black">{t("wallet.buy")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(packagesQ.data ?? []).map((p) => {
            const totalCoins = p.coins + p.bonus_coins;
            const usd = p.price_usd_cents;
            const egp = p.price_egp_cents;
            const rate = currencyQ.data?.egp_per_usd ?? 50;
            const primary = usd != null ? formatMoney(usd, "USD") : formatMoney(egp, "EGP");
            const secondary =
              usd != null && egp != null
                ? formatMoney(egp, "EGP")
                : usd != null
                  ? formatMoney(Math.round(usd * rate), "EGP")
                  : egp != null
                    ? formatMoney(Math.round(egp / rate), "USD")
                    : null;
            return (
              <div
                key={p.id}
                className={`relative rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:border-primary ${p.is_popular ? "border-primary bg-primary/[0.06]" : "border-border/40 bg-surface/40"}`}
              >
                {p.is_popular && (
                  <span className="absolute -top-2 end-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {t("wallet.mostPopular")}
                  </span>
                )}
                <div className="flex items-baseline gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-black">{p.coins.toLocaleString(locale)}</span>
                  {p.bonus_coins > 0 && (
                    <span className="text-xs text-primary">
                      +{p.bonus_coins} {t("wallet.gift")}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm font-bold">{primary}</div>
                {secondary && <div className="text-xs text-muted-foreground">≈ {secondary}</div>}
                <Button
                  className="mt-3 w-full"
                  size="sm"
                  onClick={() => setBuying({ coins: totalCoins, usdCents: usd, egpCents: egp })}
                >
                  {t("wallet.buyBtn")}
                </Button>
              </div>
            );
          })}
          {(packagesQ.data?.length ?? 0) === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
              {t("wallet.noPackages")}
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-border/40 bg-surface/40 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
          <TicketPercent className="h-5 w-5 text-primary" />
          {t("wallet.coupon.title")}
        </h2>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t("wallet.coupon.placeholder")}
            className="h-10 flex-1 rounded-md border border-input bg-background/60 px-3 text-sm tracking-widest outline-none focus:border-primary"
          />
          <Button size="sm" onClick={redeemCoupon}>
            {t("wallet.coupon.apply")}
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {t("wallet.coupon.refer")}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-black">{t("wallet.txHistory")}</h2>
        {(txQ.data?.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-surface/30 p-12 text-center text-sm text-muted-foreground">
            {t("wallet.txEmpty")}
          </div>
        ) : (
          <div className="divide-y divide-border/40 rounded-2xl border border-border/40 bg-surface/40">
            {(txQ.data ?? []).map((t2) => (
              <div
                key={t2.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3"
              >
                <div
                  className={`grid h-9 w-9 place-items-center rounded-full ${t2.status === "completed" ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"}`}
                >
                  {t2.status === "completed" ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownLeft className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">
                    {t2.provider ?? t("wallet.txPayment")}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {timeAgo(t2.created_at)}
                  </div>
                </div>
                <div className="text-sm font-black tabular-nums">
                  {(Number(t2.amount_cents) / 100).toFixed(2)} {t2.currency}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-xl font-black">
          <History className="h-5 w-5 text-primary" />
          {t("wallet.coinHistory")}
        </h2>
        {(coinHistoryQ.data?.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-surface/30 p-12 text-center text-sm text-muted-foreground">
            {t("wallet.coinHistoryEmpty")}
          </div>
        ) : (
          <div className="divide-y divide-border/40 rounded-2xl border border-border/40 bg-surface/40">
            {(coinHistoryQ.data ?? []).map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3"
              >
                <div
                  className={`grid h-9 w-9 place-items-center rounded-full ${r.amount > 0 ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"}`}
                >
                  {r.amount > 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownLeft className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{coinTxTitle(r, t, lang)}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {timeAgo(r.created_at)}
                  </div>
                </div>
                <div
                  className={`text-sm font-black tabular-nums ${r.amount > 0 ? "text-emerald-500" : "text-red-500"}`}
                >
                  {r.amount > 0 ? "+" : ""}
                  {r.amount.toLocaleString(locale)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <MyPurchasesList />

      {buying && (
        <BuyCoinsDialog
          coins={buying.coins}
          priceUsdCents={buying.usdCents}
          priceEgpCents={buying.egpCents}
          onClose={() => setBuying(null)}
        />
      )}
    </div>
  );
}

function isRewardCode(value: string | null | undefined): boolean {
  return normalizeRewardCode(value).length > 0;
}

function normalizeRewardCode(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  const match = trimmed.match(/\b(gm|mission):[a-z0-9_:-]+/i);
  return match ? match[0].toLowerCase() : "";
}

function humanizeRewardCode(value: string, lang: string): string {
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
}

function rewardLabel(value: string, t: (key: string) => string, lang: string): string {
  const rewardCode = normalizeRewardCode(value) || value.trim().toLowerCase();
  const key = `tx.kind.${rewardCode}`;
  const label = t(key);
  return label !== key ? label : humanizeRewardCode(rewardCode, lang);
}

function coinTxTitle(
  row: { kind: string; note: string | null },
  t: (key: string) => string,
  lang: string,
): string {
  if (row.note && isRewardCode(row.note)) return rewardLabel(row.note, t, lang);
  if (isRewardCode(row.kind)) return rewardLabel(row.kind, t, lang);
  return row.note || kindLabel(row.kind, t, lang);
}

function kindLabel(k: string, t: (key: string) => string, lang: string): string {
  const rewardCode = normalizeRewardCode(k);
  if (rewardCode) return rewardLabel(rewardCode, t, lang);

  const txKey = `tx.kind.${k}`;
  const txLabel = t(txKey);
  if (txLabel !== txKey) return txLabel;

  const map: Record<string, string> = {
    purchase: "wallet.kind.purchase",
    unlock: "wallet.kind.unlock",
    gift_sent: "wallet.kind.gift_sent",
    gift_received: "wallet.kind.gift_received",
    refund: "wallet.kind.refund",
    bonus: "wallet.kind.bonus",
    coupon: "wallet.kind.coupon",

    admin: "wallet.kind.admin",
    admin_credit: "wallet.kind.admin_credit",
    admin_debit: "wallet.kind.admin_debit",
  };
  if (map[k]) return t(map[k]);

  const cleaned = k.replace(/[_:]+/g, " ").trim();
  return cleaned || k;
}
