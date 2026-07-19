import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Coins, Crown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { fetchMyWallet, unlockChapter } from "@/lib/monetization-api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function ChapterLock({
  chapterId,
  price,
  isVip,
  onUnlocked,
}: {
  chapterId: string;
  price: number;
  isVip: boolean;
  onUnlocked: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const walletQ = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: fetchMyWallet,
    enabled: !!user,
  });

  async function doUnlock() {
    if (!user) {
      toast.error("سجل الدخول للاستكمال");
      return;
    }
    try {
      const res = await unlockChapter(chapterId);
      if (res.already) toast.info("سبق فتح هذا الفصل");
      else toast.success("تم فتح الفصل ✨");
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["coin-history"] });
      onUnlocked();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? "خطأ";
      if (msg.includes("insufficient")) toast.error("رصيدك غير كافٍ — اشحن عملات");
      else toast.error(msg);
    }
  }

  const balance = walletQ.data?.coins ?? 0;
  const canAfford = balance >= price;

  return (
    <div className="mx-auto my-10 max-w-lg rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 via-surface-elevated to-surface p-6 text-center shadow-elevated">
      <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-primary/20 text-primary">
        {isVip ? <Crown className="h-7 w-7" /> : <Lock className="h-7 w-7" />}
      </div>
      <h3 className="mb-1 text-xl font-black">{isVip ? "فصل VIP" : "فصل مقفل"}</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        {isVip
          ? "هذا الفصل متاح لأعضاء VIP أو بالفتح بالعملات."
          : "افتح هذا الفصل باستخدام عملاتك."}
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/40 bg-background/40 p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">السعر</div>
          <div className="mt-0.5 flex items-center justify-center gap-1 text-lg font-black">
            <Coins className="h-4 w-4 text-primary" />
            {price.toLocaleString("ar")}
          </div>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/40 p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">رصيدك</div>
          <div className="mt-0.5 flex items-center justify-center gap-1 text-lg font-black">
            <Coins className="h-4 w-4 text-primary" />
            {balance.toLocaleString("ar")}
          </div>
        </div>
      </div>

      {!user ? (
        <Button asChild className="w-full">
          <Link to="/auth">سجل الدخول للاستمرار</Link>
        </Button>
      ) : canAfford ? (
        <Button
          onClick={doUnlock}
          className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
        >
          <Lock className="me-1 h-4 w-4" />
          فتح الفصل ({price.toLocaleString("ar")} عملة)
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline">
            <Link to="/wallet">شحن العملات</Link>
          </Button>
          {isVip && (
            <Button
              asChild
              className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
            >
              <Link to="/vip">
                <Crown className="me-1 h-4 w-4" />
                اشتراك VIP
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
