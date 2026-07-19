import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Crown, Coins, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyWallet, purchaseNovel, isNovelOwned } from "@/lib/monetization-api";

interface Props {
  novelId: string;
  novelTitle: string;
  price: number;
  isPremium: boolean;
}

/**
 * Premium Content — 7C
 * Whole-novel purchase entry point. Reuses wallet + coin_transactions via the
 * `purchase_novel` RPC. Shown only when the novel has a positive coin_price.
 */
export function BuyNovelDialog({ novelId, novelTitle, price, isPremium }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const walletQ = useQuery({ queryKey: ["wallet", user?.id], queryFn: fetchMyWallet, enabled: !!user && open });
  const ownedQ = useQuery({
    queryKey: ["novel-owned", novelId, user?.id],
    queryFn: () => isNovelOwned(novelId),
    enabled: !!user && !!novelId,
  });

  const balance = walletQ.data?.coins ?? 0;
  const canAfford = balance >= price;

  if (price <= 0) return null;
  if (ownedQ.data) {
    return (
      <Button size="lg" variant="outline" disabled className="border-primary/40">
        <Crown className="me-2 h-4 w-4 text-primary" />
        تمتلك هذه الرواية
      </Button>
    );
  }

  async function confirm() {
    if (!user) return;
    setBusy(true);
    try {
      const res = await purchaseNovel(novelId);
      if (res.already) toast.info("تمتلك هذه الرواية بالفعل");
      else toast.success("تم شراء الرواية بالكامل ✨");
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["coin-history"] });
      qc.invalidateQueries({ queryKey: ["novel-owned", novelId] });
      setOpen(false);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? "خطأ";
      if (msg.includes("insufficient")) toast.error("رصيدك غير كافٍ — اشحن عملات");
      else toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline" className="border-primary/60 text-primary hover:bg-primary/10">
          <ShoppingCart className="me-2 h-4 w-4" />
          شراء الرواية ({price.toLocaleString("ar")} عملة)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPremium && <Crown className="h-5 w-5 text-primary" />}
            شراء الرواية بالكامل
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            سيمنحك هذا الشراء وصولاً دائماً إلى جميع فصول <span className="font-bold text-foreground">{novelTitle}</span> — الحالية والمستقبلية — دون الحاجة لفتح كل فصل على حدة.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/40 bg-background/40 p-3 text-center">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">السعر</div>
              <div className="mt-0.5 flex items-center justify-center gap-1 text-lg font-black">
                <Coins className="h-4 w-4 text-primary" />{price.toLocaleString("ar")}
              </div>
            </div>
            <div className="rounded-xl border border-border/40 bg-background/40 p-3 text-center">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">رصيدك</div>
              <div className="mt-0.5 flex items-center justify-center gap-1 text-lg font-black">
                <Coins className="h-4 w-4 text-primary" />{balance.toLocaleString("ar")}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          {!user ? (
            <Button asChild className="w-full"><Link to="/auth">سجل الدخول للاستمرار</Link></Button>
          ) : canAfford ? (
            <Button onClick={confirm} disabled={busy} className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
              {busy ? "جارٍ الشراء..." : `تأكيد الشراء (${price.toLocaleString("ar")} عملة)`}
            </Button>
          ) : (
            <Button asChild variant="outline" className="w-full">
              <Link to="/wallet">شحن العملات</Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
