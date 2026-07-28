import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, Gift, Loader2, Search, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { fetchMyWallet, giftCoinsToAuthor } from "@/lib/monetization-api";

const PRESETS = [50, 100, 500, 1000];

interface AuthorRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export function WalletGiftDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 300);
  const [selected, setSelected] = useState<AuthorRow | null>(null);
  const [amount, setAmount] = useState(100);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const walletQ = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: fetchMyWallet,
    enabled: !!user,
  });
  const balance = walletQ.data?.coins ?? 0;

  const searchQ = useQuery({
    queryKey: ["gift-author-search", dq],
    enabled: !selected && dq.trim().length >= 2,
    queryFn: async (): Promise<AuthorRow[]> => {
      const term = dq.trim();
      const { data } = await supabase
        .from("profiles_public")
        .select("id,username,display_name,avatar_url")
        .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
        .limit(15);
      return ((data ?? []) as AuthorRow[]).filter((r) => r.id !== user?.id);
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canAfford = balance >= amount;

  async function send() {
    if (!user || !selected) return;
    setBusy(true);
    try {
      await giftCoinsToAuthor({
        author_id: selected.id,
        amount,
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

  const displayName = (a: AuthorRow) => a.display_name || a.username || "مستخدم";

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
            إهداء عملات
          </h3>
          <button
            onClick={onClose}
            aria-label="إغلاق"
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

        {!selected ? (
          <div>
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-semibold">
                ابحث عن مستخدم بالاسم أو المعرّف
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="اكتب حرفين على الأقل..."
                  className="h-10 w-full rounded-md border border-input bg-background/60 ps-9 pe-3 text-sm"
                />
              </div>
            </label>

            <div className="max-h-72 overflow-y-auto rounded-lg border border-border/40 bg-background/40">
              {dq.trim().length < 2 ? (
                <p className="p-4 text-center text-xs text-muted-foreground">
                  ابدأ بالبحث لعرض النتائج
                </p>
              ) : searchQ.isLoading ? (
                <div className="flex items-center justify-center p-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (searchQ.data ?? []).length === 0 ? (
                <p className="p-4 text-center text-xs text-muted-foreground">
                  لا توجد نتائج مطابقة
                </p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {(searchQ.data ?? []).map((a) => (
                    <li key={a.id}>
                      <button
                        onClick={() => setSelected(a)}
                        className="flex w-full items-center gap-3 p-2.5 text-start hover:bg-primary/10"
                      >
                        {a.avatar_url ? (
                          <img
                            src={a.avatar_url}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                            {displayName(a).charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold">{displayName(a)}</div>
                          {a.username && (
                            <div className="truncate text-[11px] text-muted-foreground">
                              @{a.username}
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
              <button
                onClick={() => setSelected(null)}
                aria-label="رجوع"
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              {selected.avatar_url ? (
                <img
                  src={selected.avatar_url}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 font-bold text-primary">
                  {displayName(selected).charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{displayName(selected)}</div>
                {selected.username && (
                  <div className="truncate text-[11px] text-muted-foreground">
                    @{selected.username}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-3 grid grid-cols-4 gap-2">
              {PRESETS.map((n) => (
                <button
                  key={n}
                  onClick={() => setAmount(n)}
                  className={`rounded-lg border p-2 text-center text-sm font-bold transition ${
                    amount === n
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/60 hover:border-primary/50"
                  }`}
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
                placeholder="رسالة تشجيعية..."
                className="w-full resize-none rounded-md border border-input bg-background/60 p-2 text-sm"
              />
            </label>

            {canAfford ? (
              <Button
                onClick={send}
                disabled={busy || amount < 1}
                className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
              >
                {busy ? "جارٍ الإرسال..." : `إرسال ${amount.toLocaleString("ar")} عملة`}
              </Button>
            ) : (
              <div className="space-y-2 text-center">
                <p className="text-xs text-destructive">رصيدك غير كافٍ لإتمام الهدية</p>
                <Button variant="outline" className="w-full" onClick={onClose}>
                  اشحن العملات من الأعلى
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
