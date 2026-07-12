import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Coins, CreditCard, Gift, TicketPercent, Users, ArrowUpRight, ArrowDownLeft, History } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { timeAgoAr } from "@/lib/format";
import { fetchMyCoinHistory } from "@/lib/monetization-api";
import { fetchCoinPackages, fetchCurrencySettings, formatMoney } from "@/lib/pricing-api";
import { BuyCoinsDialog, MyPurchasesList } from "@/components/wallet/buy-coins-dialog";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "المحفظة — UR Fav Novel" }, { name: "robots", content: "noindex" }] }),
  component: WalletPage,
});

function WalletPage() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [buying, setBuying] = useState<{ coins: number; usdCents: number | null; egpCents: number | null } | null>(null);
  const packagesQ = useQuery({ queryKey: ["coin-packages"], queryFn: () => fetchCoinPackages(false) });
  const currencyQ = useQuery({ queryKey: ["currency-settings"], queryFn: fetchCurrencySettings });

  const walletQ = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("wallets").select("coins,updated_at").eq("user_id", user!.id).maybeSingle();
      return data ?? { coins: 0, updated_at: null };
    },
    enabled: !!user,
  });

  const txQ = useQuery({
    queryKey: ["payment-tx", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("payment_transactions")
        .select("id,amount_cents,currency,status,provider,created_at")
        .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(20);
      return (data ?? []) as unknown as { id: string; amount_cents: number; currency: string; status: string; provider: string | null; created_at: string }[];
    },
    enabled: !!user,
  });

  const coinHistoryQ = useQuery({ queryKey: ["coin-history", user?.id], queryFn: () => fetchMyCoinHistory(50), enabled: !!user });


  const subQ = useQuery({
    queryKey: ["my-vip", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("vip_subscriptions")
        .select("status,expires_at,plan:vip_plans(name_ar,price_usd)")
        .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  async function redeemCoupon() {
    const c = code.trim().toUpperCase();
    if (!c) return;
    const { data, error } = await supabase.from("coupons")
      .select("code,discount_percent,bonus_coins,uses_left,expires_at")
      .eq("code", c).maybeSingle();
    if (error) return toast.error("خطأ في التحقق");
    if (!data) return toast.error("كود غير صالح");
    if (data.uses_left <= 0) return toast.error("انتهت استخدامات هذا الكود");
    if (data.expires_at && new Date(data.expires_at) < new Date()) return toast.error("انتهت صلاحية الكود");
    toast.success(`كود صالح ✅ خصم ${data.discount_percent}% + ${data.bonus_coins} عملة — سيُطبَّق عند الشراء.`);
    setCode("");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-black md:text-4xl">المحفظة</h1>

      {/* Balance card */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/25 via-surface-elevated to-surface p-6 shadow-elevated">
        <div className="absolute -end-6 -top-6 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <div className="mb-1 text-xs uppercase tracking-widest text-primary">رصيد Future Coins</div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="break-all text-4xl font-black tabular-nums sm:text-5xl">{(walletQ.data?.coins ?? 0).toLocaleString("ar")}</span>
            <Coins className="h-6 w-6 shrink-0 text-primary" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link to="/vip"><CreditCard className="me-1 h-4 w-4" />اشتراك VIP</Link>
            </Button>
            <Button size="sm" variant="secondary" onClick={() => toast.info("قريباً")}>
              <Gift className="me-1 h-4 w-4" />إهداء
            </Button>
          </div>
        </div>
      </div>

      {/* VIP status */}
      {subQ.data && (
        <div className="mt-4 rounded-2xl border border-border/40 bg-surface/40 p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">اشتراكك</div>
          <div className="mt-1 flex items-center justify-between">
            <div className="font-bold">{(subQ.data as unknown as { plan: { name_ar: string } | null }).plan?.name_ar ?? "خطة"}</div>
            <div className="text-xs text-muted-foreground">
              {(subQ.data as unknown as { status: string }).status} — ينتهي {(subQ.data as unknown as { expires_at: string | null }).expires_at ? new Date((subQ.data as unknown as { expires_at: string }).expires_at).toLocaleDateString("ar") : "—"}
            </div>
          </div>
        </div>
      )}

      {/* Coin packs */}
      <section className="mt-8">
        <h2 className="mb-3 text-xl font-black">شراء عملات</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(packagesQ.data ?? []).map((p) => {
            const totalCoins = p.coins + p.bonus_coins;
            const usd = p.price_usd_cents;
            const egp = p.price_egp_cents;
            const rate = currencyQ.data?.egp_per_usd ?? 50;
            const primary = usd != null ? formatMoney(usd, "USD") : formatMoney(egp, "EGP");
            const secondary = usd != null && egp != null
              ? formatMoney(egp, "EGP")
              : (usd != null ? formatMoney(Math.round(usd * rate), "EGP") : (egp != null ? formatMoney(Math.round(egp / rate), "USD") : null));
            return (
              <div key={p.id} className={`relative rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:border-primary ${p.is_popular ? "border-primary bg-primary/[0.06]" : "border-border/40 bg-surface/40"}`}>
                {p.is_popular && <span className="absolute -top-2 end-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">الأكثر مبيعاً</span>}
                <div className="flex items-baseline gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-black">{p.coins.toLocaleString("ar")}</span>
                  {p.bonus_coins > 0 && <span className="text-xs text-primary">+{p.bonus_coins} هدية</span>}
                </div>
                <div className="mt-1 text-sm font-bold">{primary}</div>
                {secondary && <div className="text-xs text-muted-foreground">≈ {secondary}</div>}
                <Button className="mt-3 w-full" size="sm" onClick={() => setBuying({ coins: totalCoins, usdCents: usd, egpCents: egp })}>شراء</Button>
              </div>
            );
          })}
          {(packagesQ.data?.length ?? 0) === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">لا توجد باقات متاحة حالياً.</div>
          )}
        </div>
      </section>


      {/* Coupon */}
      <section className="mt-8 rounded-2xl border border-border/40 bg-surface/40 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-black"><TicketPercent className="h-5 w-5 text-primary" />كود خصم / إحالة</h2>
        <div className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="أدخل الكود..."
            className="h-10 flex-1 rounded-md border border-input bg-background/60 px-3 text-sm tracking-widest outline-none focus:border-primary" />
          <Button size="sm" onClick={redeemCoupon}>استخدام</Button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />ادعُ الأصدقاء — تحصل على 100 عملة عن كل اشتراك.
        </div>
      </section>

      {/* Transactions */}
      <section className="mt-8">
        <h2 className="mb-3 text-xl font-black">سجل المدفوعات</h2>
        {(txQ.data?.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-surface/30 p-12 text-center text-sm text-muted-foreground">لا مدفوعات بعد</div>
        ) : (
          <div className="divide-y divide-border/40 rounded-2xl border border-border/40 bg-surface/40">
            {(txQ.data ?? []).map((t) => (
              <div key={t.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3">
                <div className={`grid h-9 w-9 place-items-center rounded-full ${t.status === "completed" ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"}`}>
                  {t.status === "completed" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{t.provider ?? "دفع"}</div>
                  <div className="truncate text-xs text-muted-foreground">{timeAgoAr(t.created_at)}</div>
                </div>
                <div className="text-sm font-black tabular-nums">{(Number(t.amount_cents) / 100).toFixed(2)} {t.currency}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Coin history */}
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-xl font-black"><History className="h-5 w-5 text-primary" />سجل العملات</h2>
        {(coinHistoryQ.data?.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-surface/30 p-12 text-center text-sm text-muted-foreground">لا حركات بعد</div>
        ) : (
          <div className="divide-y divide-border/40 rounded-2xl border border-border/40 bg-surface/40">
            {(coinHistoryQ.data ?? []).map((t) => (
              <div key={t.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3">
                <div className={`grid h-9 w-9 place-items-center rounded-full ${t.amount > 0 ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"}`}>
                  {t.amount > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{t.note ?? kindLabel(t.kind)}</div>
                  <div className="truncate text-xs text-muted-foreground">{timeAgoAr(t.created_at)}</div>
                </div>
                <div className={`text-sm font-black tabular-nums ${t.amount > 0 ? "text-emerald-500" : "text-red-500"}`}>{t.amount > 0 ? "+" : ""}{t.amount.toLocaleString("ar")}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <MyPurchasesList />

      {buying && <BuyCoinsDialog coins={buying.coins} amountUsd={buying.usd} onClose={() => setBuying(null)} />}
    </div>
  );
}

const KIND_AR: Record<string, string> = {
  purchase: "شراء عملات", unlock: "فتح فصل", gift_sent: "إهداء", gift_received: "استلام هدية",
  refund: "استرداد", bonus: "مكافأة", coupon: "كود خصم", admin: "تعديل إداري",
};
function kindLabel(k: string) { return KIND_AR[k] ?? k; }
