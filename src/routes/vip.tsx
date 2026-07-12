import { showError } from "@/lib/errors";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site-config";
import { useQuery } from "@tanstack/react-query";
import { Crown, Check, Zap, BookOpen, Star, ShieldCheck } from "lucide-react";
import { fetchVipPlans } from "@/lib/site-api";
import { fetchCurrencySettings, formatMoney, priceInCurrency } from "@/lib/pricing-api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/vip")({
  head: () => ({
    meta: [
      { title: "اشتراك VIP — UR Fav Novel" },
      { name: "description", content: "استمتع بتجربة قراءة بلا إعلانات، فصول مبكرة، ومحتوى حصري." },
      { property: "og:title", content: "اشتراك VIP — UR Fav Novel" },
      { property: "og:description", content: "خطط اشتراك مرنة: شهري، ربع سنوي، نصف سنوي، وسنوي." },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/vip` }],
  }),
  component: VipPage,
});

const FEATURE_LABELS: Record<string, string> = {
  ad_free: "بدون إعلانات",
  early_access: "فصول مبكرة قبل الجميع",
  vip_badge: "شارة VIP مميزة",
  discount: "خصم على الاشتراكات القادمة",
  exclusive_content: "محتوى حصري للأعضاء",
  priority_support: "دعم أولوي على مدار الساعة",
};

function VipPage() {
  const { user } = useAuth();
  const { data: plans } = useQuery({ queryKey: ["vip-plans"], queryFn: fetchVipPlans });

  async function subscribe(planId: string, planName: string) {
    if (!user) {
      toast.info("يجب تسجيل الدخول للاشتراك");
      return;
    }
    // Create a pending subscription — payment gateway will complete it via webhook.
    const { error } = await supabase.from("vip_subscriptions").insert({
      user_id: user.id, plan_id: planId, status: "pending",
    });
    if (error) return showError(error);
    toast.success(`تم إنشاء طلب اشتراك ${planName}. سيتم تفعيله بعد الدفع.`, { duration: 6000 });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary-glow">
          <Crown className="h-4 w-4" /> عضوية VIP الحصرية
        </div>
        <h1 className="text-4xl font-black md:text-6xl">
          <span className="text-gradient-primary">اقرأ بلا حدود</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          احصل على تجربة قراءة نقية بدون إعلانات، مع وصول مبكر للفصول الجديدة ومحتوى حصري للأعضاء فقط.
        </p>
      </div>

      <div className="mb-12 grid gap-4 md:grid-cols-4">
        <Perk icon={<ShieldCheck />} title="بدون إعلانات" desc="تجربة قراءة نقية بالكامل" />
        <Perk icon={<Zap />} title="فصول مبكرة" desc="اقرأ الفصول قبل الجميع" />
        <Perk icon={<BookOpen />} title="محتوى حصري" desc="روايات ومحتوى للأعضاء فقط" />
        <Perk icon={<Star />} title="شارة VIP" desc="ظهور مميز في التعليقات" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {(plans ?? []).map((p, i) => {
          const isBest = i === 3;
          const monthly = ((p.price_cents / 100) / (p.duration_days / 30)).toFixed(2);
          return (
            <div key={p.id} className={`relative rounded-2xl border p-6 ${isBest ? "border-primary bg-gradient-to-b from-primary/10 to-transparent shadow-glow" : "border-border/60 bg-surface/40"}`}>
              {isBest && (
                <div className="absolute -top-3 right-1/2 translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-primary-glow px-3 py-1 text-xs font-black text-primary-foreground">
                  الأفضل قيمة
                </div>
              )}
              <div className="mb-2 text-sm font-semibold text-muted-foreground">{p.name_ar}</div>
              <div className="mb-1 flex items-baseline gap-1">
                <span className="text-4xl font-black">${(p.price_cents / 100).toFixed(2)}</span>
                <span className="text-sm text-muted-foreground">/ {p.duration_days === 30 ? "شهر" : `${p.duration_days} يوم`}</span>
              </div>
              <div className="mb-4 text-xs text-muted-foreground">≈ ${monthly} شهرياً</div>
              <ul className="mb-6 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{FEATURE_LABELS[f] ?? f}</li>
                ))}
              </ul>
              <Button
                onClick={() => subscribe(p.id, p.name_ar)}
                className={`h-11 w-full font-bold ${isBest ? "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground" : ""}`}
                variant={isBest ? "default" : "outline"}
              >
                اشترك الآن
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-16 rounded-2xl border border-border/60 bg-surface/40 p-6 text-center text-sm text-muted-foreground">
        <p>💳 سيتم تفعيل بوابات الدفع (Stripe / PayPal) قريباً. سجل اهتمامك الآن وستحصل على خصم خاص عند الإطلاق.</p>
        {!user && (
          <p className="mt-2">
            <Link to="/auth" className="font-bold text-primary hover:underline">أنشئ حساباً</Link> للاشتراك.
          </p>
        )}
      </div>
    </div>
  );
}

function Perk({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface/40 p-4 text-center">
      <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div className="font-bold">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}
