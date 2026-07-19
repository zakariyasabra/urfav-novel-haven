import { createFileRoute, Link } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site-config";
import { useQuery } from "@tanstack/react-query";
import { Crown, Check, Zap, BookOpen, Star, ShieldCheck } from "lucide-react";
import { fetchVipPlans } from "@/lib/site-api";
import { fetchPaymentMethods } from "@/lib/admin-api";
import { fetchCurrencySettings, formatMoney, priceInCurrency } from "@/lib/pricing-api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useState } from "react";
import { useT, usePreferences } from "@/i18n/provider";
import { SubscribeVipDialog } from "@/components/vip/subscribe-vip-dialog";


export const Route = createFileRoute("/vip")({
  head: () => ({
    meta: [
      { title: "VIP — FAVNOL" },
      { name: "description", content: "Ad-free reading, early chapters and exclusive content." },
      { property: "og:title", content: "VIP — FAVNOL" },
      {
        property: "og:description",
        content: "Flexible plans: monthly, quarterly, semi-annual, and annual.",
      },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/vip` }],
  }),
  component: VipPage,
});

function VipPage() {
  const t = useT();
  const { lang } = usePreferences();
  const { user } = useAuth();
  const { data: plans } = useQuery({ queryKey: ["vip-plans"], queryFn: fetchVipPlans });
  const { data: currency } = useQuery({
    queryKey: ["currency-settings"],
    queryFn: fetchCurrencySettings,
  });
  const [displayCurrency, setDisplayCurrency] = useState<"USD" | "EGP">("USD");
  const rate = currency?.egp_per_usd ?? 50;
  const { data: methods } = useQuery({
    queryKey: ["pay-methods"],
    queryFn: () => fetchPaymentMethods(false),
  });
  const [subscribeFor, setSubscribeFor] = useState<{ id: string; name: string } | null>(null);

  function subscribe(planId: string, planName: string) {
    if (!user) return toast.info(t("vip.mustSignIn"));
    if (!methods || methods.length === 0) return toast.info(t("vip.footerNoMethods"));
    setSubscribeFor({ id: planId, name: planName });
  }


  const planName = (p: { name_ar: string; name_en?: string | null }) =>
    lang === "en" ? p.name_en || p.name_ar : p.name_ar;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary-glow">
          <Crown className="h-4 w-4" /> {t("vip.badge")}
        </div>
        <h1 className="text-4xl font-black md:text-6xl">
          <span className="text-gradient-primary">{t("vip.title")}</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{t("vip.subtitle")}</p>
        <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-border/60 bg-surface/60 p-1">
          {(["USD", "EGP"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setDisplayCurrency(c)}
              className={`rounded-full px-4 py-1 text-xs font-bold transition-colors ${displayCurrency === c ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {c === "USD" ? "USD $" : lang === "en" ? "EGP £" : "EGP ج.م"}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-12 grid gap-4 md:grid-cols-4">
        <Perk
          icon={<ShieldCheck />}
          title={t("vip.perk.adFree.title")}
          desc={t("vip.perk.adFree.desc")}
        />
        <Perk icon={<Zap />} title={t("vip.perk.early.title")} desc={t("vip.perk.early.desc")} />
        <Perk
          icon={<BookOpen />}
          title={t("vip.perk.exclusive.title")}
          desc={t("vip.perk.exclusive.desc")}
        />
        <Perk icon={<Star />} title={t("vip.perk.badge.title")} desc={t("vip.perk.badge.desc")} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {(plans ?? []).map((p) => {
          const priceCents =
            priceInCurrency(
              { price_usd_cents: p.price_usd_cents, price_egp_cents: p.price_egp_cents },
              displayCurrency,
              rate,
            ) || (displayCurrency === "USD" ? p.price_cents : Math.round(p.price_cents * rate));
          const isBest = p.is_recommended;
          const monthlyCents = Math.round(priceCents / Math.max(1, p.duration_days / 30));
          return (
            <div
              key={p.id}
              className={`relative rounded-2xl border p-6 ${isBest ? "border-primary bg-gradient-to-b from-primary/10 to-transparent shadow-glow" : "border-border/60 bg-surface/40"}`}
            >
              {isBest && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-primary-glow px-3 py-1 text-xs font-black text-primary-foreground">
                  {t("vip.bestValue")}
                </div>
              )}
              {p.discount_percent > 0 && (
                <div className="absolute -top-3 start-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-white">
                  {t("vip.discount", { p: p.discount_percent })}
                </div>
              )}
              <div className="mb-2 text-sm font-semibold text-muted-foreground">{planName(p)}</div>
              <div className="mb-1 flex items-baseline gap-1">
                <span className="text-4xl font-black">
                  {formatMoney(priceCents, displayCurrency)}
                </span>
                <span className="text-sm text-muted-foreground">
                  /{" "}
                  {p.duration_days === 30
                    ? t("vip.perMonthShort")
                    : t("vip.perDays", { d: p.duration_days })}
                </span>
              </div>
              <div className="mb-4 text-xs text-muted-foreground">
                ≈ {formatMoney(monthlyCents, displayCurrency)} {t("vip.perMonth")}
              </div>
              <ul className="mb-6 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    {t(`vip.feature.${f}`) || f}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => subscribe(p.id, planName(p))}
                className={`h-11 w-full font-bold ${isBest ? "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground" : ""}`}
                variant={isBest ? "default" : "outline"}
              >
                {t("vip.subscribe")}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-16 rounded-2xl border border-border/60 bg-surface/40 p-6 text-center text-sm text-muted-foreground">

        {(methods?.length ?? 0) === 0 ? (
          <p>{t("vip.footerNoMethods")}</p>
        ) : (
          <>
            <p className="mb-3">{t("vip.footerHint")}</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {methods!.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-bold text-foreground"
                >
                  {lang === "en" ? m.name_en || m.name_ar : m.name_ar}
                  <span className="rounded-md bg-surface/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {m.currency}
                  </span>
                </span>
              ))}
            </div>
          </>
        )}
        {!user && (
          <p className="mt-4">
            <Link to="/auth" className="font-bold text-primary hover:underline">
              {t("vip.footerCreate")}
            </Link>{" "}
            {t("vip.footerToSub")}
          </p>
        )}
      </div>

      {subscribeFor && (
        <SubscribeVipDialog
          planId={subscribeFor.id}
          planName={subscribeFor.name}
          methods={methods ?? []}
          onClose={() => setSubscribeFor(null)}
        />
      )}

    </div>
  );
}

function Perk({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface/40 p-4 text-center">
      <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="font-bold">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}
