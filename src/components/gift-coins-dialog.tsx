import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Coins, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchMyWallet, giftCoinsToAuthor } from "@/lib/monetization-api";
import { useAuth } from "@/hooks/use-auth";

const PRESETS = [50, 100, 500, 1000];

export function GiftCoinsButton({
  authorId,
  novelId,
  authorName,
}: {
  authorId: string;
  novelId?: string;
  authorName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Gift className="me-1 h-4 w-4" />
        إهداء عملات
      </Button>
      {open && (
        <GiftDialog
          authorId={authorId}
          novelId={novelId}
          authorName={authorName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function GiftDialog({
  authorId,
  novelId,
  authorName,
  onClose,
}: {
  authorId: string;
  novelId?: string;
  authorName?: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [amount, setAmount] = useState(100);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const walletQ = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: fetchMyWallet,
    enabled: !!user,
  });
  const balance = walletQ.data?.coins ?? 0;
  const canAfford = balance >= amount;

  async function send() {
    if (!user) {
      toast.error("سجل الدخول");
      return;
    }
    setBusy(true);
    try {
      await giftCoinsToAuthor({
        author_id: authorId,
        amount,
        novel_id: novelId,
        message: message.trim() || null,
      });
      toast.success("تم إرسال الهدية 🎁");
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["coin-history"] });
      onClose();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? "خطأ";
      if (msg.includes("insufficient")) toast.error("رصيدك غير كافٍ");
      else if (msg.includes("cannot gift to self")) toast.error("لا يمكن إهداء نفسك");
      else toast.error(msg);
    }
    setBusy(false);
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border/60 bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xl font-black">
            <Gift className="h-5 w-5 text-primary" />
            إهداء عملات {authorName && `لـ ${authorName}`}
          </h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-border/40 bg-background/50 p-3 text-sm">
          <span className="text-muted-foreground">رصيدك: </span>
          <span className="font-black">{balance.toLocaleString("ar")}</span>
          <Coins className="mb-0.5 ms-1 inline h-4 w-4 text-primary" />
        </div>

        <div className="mb-3 grid grid-cols-4 gap-2">
          {PRESETS.map((n) => (
            <button
              key={n}
              onClick={() => setAmount(n)}
              className={`rounded-lg border p-2 text-center text-sm font-bold transition ${amount === n ? "border-primary bg-primary/15 text-primary" : "border-border/60 hover:border-primary/50"}`}
            >
              {n.toLocaleString("ar")}
            </button>
          ))}
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-semibold">مبلغ مخصص</span>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 0))}
            className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-semibold">رسالة (اختياري)</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            maxLength={200}
            placeholder="شكراً على القصة الرائعة..."
            className="w-full resize-none rounded-md border border-input bg-background/60 p-2 text-sm"
          />
        </label>

        {!user ? (
          <Button asChild className="w-full">
            <Link to="/auth">سجل الدخول لإرسال هدية</Link>
          </Button>
        ) : canAfford ? (
          <Button
            onClick={send}
            disabled={busy || amount < 1}
            className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
          >
            {busy ? "جارٍ الإرسال..." : `إرسال ${amount.toLocaleString("ar")} عملة`}
          </Button>
        ) : (
          <Button asChild variant="outline" className="w-full">
            <Link to="/wallet">شحن العملات</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
