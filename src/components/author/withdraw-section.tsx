import { showError } from "@/lib/errors";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchMyWithdrawals, fetchPaymentMethods, requestWithdrawal } from "@/lib/admin-api";
import { fetchMyAuthorEarnings } from "@/lib/monetization-api";
import { useT } from "@/i18n/provider";
import { usePreferences } from "@/i18n/provider";

export function AuthorWithdrawSection() {
  const t = useT();
  const { lang } = usePreferences();
  const locale = lang === "en" ? "en-US" : "ar-EG";
  const qc = useQueryClient();
  const earningsQ = useQuery({ queryKey: ["my-earnings"], queryFn: fetchMyAuthorEarnings });
  const listQ = useQuery({ queryKey: ["my-withdrawals"], queryFn: fetchMyWithdrawals });
  const methodsQ = useQuery({
    queryKey: ["pay-methods"],
    queryFn: () => fetchPaymentMethods(false),
  });
  const [open, setOpen] = useState(false);
  const [coins, setCoins] = useState<number>(100);
  const [method, setMethod] = useState("");
  const [account, setAccount] = useState("");
  const [busy, setBusy] = useState(false);

  const pending = earningsQ.data?.coins_pending ?? 0;

  async function submit() {
    if (coins < 100) return toast.error(t("wd.err.min"));
    if (coins > pending) return toast.error(t("wd.err.balance"));
    if (!method) return toast.error(t("wd.err.method"));
    if (!account.trim()) return toast.error(t("wd.err.account"));
    setBusy(true);
    try {
      await requestWithdrawal(coins, method, account.trim());
      toast.success(t("wd.submitted"));
      qc.invalidateQueries({ queryKey: ["my-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["my-earnings"] });
      setOpen(false);
      setAccount("");
      setCoins(100);
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  const methods = methodsQ.data ?? [];
  const methodName = (code: string) => {
    const m = methods.find((x) => x.code === code);
    if (!m) return code;
    return m.name_ar;
  };

  return (
    <section className="mt-6 rounded-2xl border border-border/40 bg-surface/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black">{t("wd.title")}</h2>
        <Button size="sm" onClick={() => setOpen(true)} disabled={pending < 100}>
          {t("wd.new")}
        </Button>
      </div>
      <div className="mb-3 text-sm text-muted-foreground">
        {t("wd.available", { n: pending.toLocaleString(locale) })}
      </div>

      <div className="space-y-2">
        {(listQ.data ?? []).map((w) => (
          <div
            key={w.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/40 p-3 text-sm"
          >
            <div>
              <div>
                <b>
                  {t("wd.viaCoins", {
                    n: w.coins.toLocaleString(locale),
                    m: methodName(w.method_code),
                  })}
                </b>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(w.created_at).toLocaleString(locale)}
              </div>
              {w.admin_note && (
                <div className="text-xs">
                  {t("wd.note")}: {w.admin_note}
                </div>
              )}
            </div>
            <span
              className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                w.status === "approved"
                  ? "bg-emerald-500/20 text-emerald-500"
                  : w.status === "rejected"
                    ? "bg-destructive/20 text-destructive"
                    : "bg-amber-500/20 text-amber-500"
              }`}
            >
              {w.status === "approved"
                ? t("wd.st.approved")
                : w.status === "rejected"
                  ? t("wd.st.rejected")
                  : t("wd.st.pending")}
            </span>
          </div>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border/60 bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-black">{t("wd.dlg.title")}</h3>
              <button onClick={() => setOpen(false)} aria-label={t("bc.close")}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="mb-1 block text-xs font-bold">{t("wd.dlg.coins")}</label>
            <input
              type="number"
              min={100}
              value={coins}
              onChange={(e) => setCoins(Number(e.target.value) || 0)}
              className="mb-3 h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
            />
            <div className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
              <Coins className="h-3 w-3" />{" "}
              {t("wd.dlg.available", { n: pending.toLocaleString(locale) })}
            </div>

            <label className="mb-1 block text-xs font-bold">{t("wd.dlg.method")}</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="mb-3 h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
            >
              <option value="">{t("wd.dlg.methodPh")}</option>
              {methods.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.name_ar}
                </option>
              ))}
            </select>

            <label className="mb-1 block text-xs font-bold">{t("wd.dlg.account")}</label>
            <textarea
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder={t("wd.dlg.accountPh")}
              className="mb-4 min-h-20 w-full rounded-md border border-input bg-background/60 p-2 text-sm"
            />

            <Button disabled={busy} onClick={submit} className="w-full">
              {t("wd.dlg.submit")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
