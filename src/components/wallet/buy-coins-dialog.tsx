import { showError } from "@/lib/errors";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Coins, Copy, Check, Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  fetchPaymentMethods,
  submitCoinPurchase,
  fetchMyCoinPurchases,
  signedQrUrl,
  uploadPaymentProof,
  type PaymentMethod,
} from "@/lib/admin-api";
import { fetchCurrencySettings, formatMoney } from "@/lib/pricing-api";
import { useT, usePreferences } from "@/i18n/provider";

function CopyBtn({ value }: { value: string }) {
  const t = useT();
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setOk(true); toast.success(t("bc.copied")); setTimeout(() => setOk(false), 1500); }
        catch { toast.error(t("bc.copyErr")); }
      }}
      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-border/60 bg-background/60 px-2 text-xs font-semibold hover:border-primary"
      aria-label={t("bc.copy")}
    >
      {ok ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      {t("bc.copy")}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-surface/60 p-2">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold text-muted-foreground">{label}</div>
        <div className="truncate font-mono text-sm" dir="ltr">{value}</div>
      </div>
      <CopyBtn value={value} />
    </div>
  );
}

function MethodDetails({ m }: { m: PaymentMethod }) {
  const t = useT();
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => { let live = true; if (m.qr_image_url) signedQrUrl(m.qr_image_url).then(u => { if (live) setQr(u); }); return () => { live = false; }; }, [m.qr_image_url]);

  const c = m.config ?? {};
  const rows: { label: string; value: string }[] = [];
  if (m.code === "paypal" && c.email) rows.push({ label: t("bc.d.paypal"), value: c.email });
  if (m.code === "usdt") {
    if (c.address) rows.push({ label: t("bc.d.usdt", { n: c.network || "TRC20" }), value: c.address });
  }
  if (m.code === "vodafone_cash" && c.number) rows.push({ label: t("bc.d.vodafone"), value: c.number });
  if (m.code === "instapay" && c.handle) rows.push({ label: t("bc.d.instapay"), value: c.handle });
  if (rows.length === 0 && m.account_details) rows.push({ label: t("bc.d.generic"), value: m.account_details });

  return (
    <div className="space-y-2 rounded-lg border border-border/40 bg-background/40 p-3 text-xs">
      {m.instructions && <div className="whitespace-pre-wrap text-foreground/85">{m.instructions}</div>}
      <div className="grid gap-2">{rows.map((r, i) => <DetailRow key={i} {...r} />)}</div>
      {qr && (
        <div className="flex flex-col items-center gap-1 pt-1">
          <img src={qr} alt="QR" className="h-40 w-40 rounded-md border border-border/40 bg-white p-1" />
          <span className="text-[10px] text-muted-foreground">{t("bc.qrHint")}</span>
        </div>
      )}
    </div>
  );
}

export function BuyCoinsDialog({
  coins, priceUsdCents, priceEgpCents, onClose,
}: {
  coins: number;
  priceUsdCents: number | null;
  priceEgpCents: number | null;
  onClose: () => void;
}) {
  const t = useT();
  const { lang } = usePreferences();
  const locale = lang === "en" ? "en-US" : "ar-EG";
  const qc = useQueryClient();
  const methodsQ = useQuery({ queryKey: ["pay-methods"], queryFn: () => fetchPaymentMethods(false) });
  const currencyQ = useQuery({ queryKey: ["currency-settings"], queryFn: fetchCurrencySettings });
  const [method, setMethod] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [proofRef, setProofRef] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const selected = methodsQ.data?.find((m) => m.code === method);
  const rate = currencyQ.data?.egp_per_usd ?? 50;

  const displayCurrency: "USD" | "EGP" = selected?.currency ?? "USD";
  const suggestedCents = useMemo(() => {
    if (displayCurrency === "USD") {
      return priceUsdCents ?? (priceEgpCents != null ? Math.round(priceEgpCents / rate) : 0);
    }
    return priceEgpCents ?? (priceUsdCents != null ? Math.round(priceUsdCents * rate) : 0);
  }, [displayCurrency, priceUsdCents, priceEgpCents, rate]);

  useEffect(() => {
    if (suggestedCents > 0) setAmount((suggestedCents / 100).toFixed(2));
  }, [suggestedCents]);

  async function submit() {
    if (!method || !selected) return toast.error(t("bc.err.method"));
    if (!proofRef.trim()) return toast.error(t("bc.err.ref"));
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error(t("bc.err.amount"));
    setBusy(true);
    try {
      let proof_image_url: string | undefined;
      if (proofFile) proof_image_url = await uploadPaymentProof(proofFile);
      await submitCoinPurchase({
        method_code: method,
        coins,
        amount_cents: Math.round(amt * 100),
        currency: selected.currency,
        proof_ref: proofRef.trim(),
        proof_note: proofNote.trim() || undefined,
        proof_image_url,
      });
      toast.success(t("bc.submitted"));
      qc.invalidateQueries({ queryKey: ["my-purchases"] });
      onClose();
    } catch (e) { showError(e); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl border border-border/60 bg-surface p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black sm:text-xl">{t("bc.title", { n: coins.toLocaleString(locale) })}</h3>
          <button onClick={onClose} aria-label={t("bc.close")}><X className="h-5 w-5" /></button>
        </div>

        <div className="mb-4 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
          <div>{t("bc.suggested")}: <b>{formatMoney(suggestedCents, displayCurrency)}</b></div>
          <div className="flex items-center gap-1 text-primary"><Coins className="h-4 w-4" /> {coins.toLocaleString(locale)}</div>
        </div>

        <label className="mb-1 block text-xs font-bold">{t("bc.method")}</label>
        <div className="mb-3 grid gap-2">
          {(methodsQ.data ?? []).map((m) => (
            <button key={m.id} onClick={() => setMethod(m.code)} type="button"
              className={`flex items-center justify-between rounded-lg border p-3 text-start text-sm transition-colors ${method === m.code ? "border-primary bg-primary/10" : "border-border/40 bg-background/40 hover:border-border"}`}>
              <div>
                <div className="font-bold">{lang === "en" ? (m.name_en || m.name_ar) : m.name_ar}</div>
                <div className="text-xs text-muted-foreground">
                  {m.code === "usdt" && m.config?.network ? `USDT · ${m.config.network}` : t(`pm.kind.${m.kind}` as never)}
                </div>
              </div>
              <span className="rounded-md bg-background/70 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{m.currency}</span>
            </button>
          ))}
          {(methodsQ.data?.length ?? 0) === 0 && (
            <div className="rounded-lg border border-dashed border-border/50 p-6 text-center text-xs text-muted-foreground">
              {t("bc.noMethods")}
            </div>
          )}
        </div>

        {selected && <div className="mb-3"><MethodDetails m={selected} /></div>}

        <label className="mb-1 block text-xs font-bold">{t("bc.amount", { c: displayCurrency === "EGP" ? t("bc.egp") : t("bc.usd") })}</label>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal"
          className="mb-3 h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm" dir="ltr" />

        <label className="mb-1 block text-xs font-bold">{t("bc.ref")}</label>
        <input value={proofRef} onChange={(e) => setProofRef(e.target.value)}
          placeholder={t("bc.ref.ph")}
          className="mb-3 h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm" dir="ltr" />

        <label className="mb-1 block text-xs font-bold">{t("bc.proof")}</label>
        <label className="mb-3 flex cursor-pointer items-center justify-between gap-2 rounded-md border border-dashed border-border/60 bg-background/40 p-3 text-sm hover:border-primary">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            {proofFile ? <ImageIcon className="h-4 w-4 text-primary" /> : <Upload className="h-4 w-4" />}
            <span className="truncate">{proofFile ? proofFile.name : t("bc.proof.ph")}</span>
          </span>
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
        </label>

        <label className="mb-1 block text-xs font-bold">{t("bc.note")}</label>
        <textarea value={proofNote} onChange={(e) => setProofNote(e.target.value)}
          className="mb-4 min-h-16 w-full rounded-md border border-input bg-background/60 p-2 text-sm" />

        <Button disabled={busy} onClick={submit} className="w-full">
          {busy ? t("bc.submitting") : t("bc.submit")}
        </Button>
      </div>
    </div>
  );
}

export function MyPurchasesList() {
  const t = useT();
  const { lang } = usePreferences();
  const locale = lang === "en" ? "en-US" : "ar-EG";
  const q = useQuery({ queryKey: ["my-purchases"], queryFn: fetchMyCoinPurchases });
  if ((q.data?.length ?? 0) === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xl font-black">{t("purchases.title")}</h2>
      <div className="divide-y divide-border/40 rounded-2xl border border-border/40 bg-surface/40">
        {(q.data ?? []).map((r) => (
          <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3 text-sm">
            <div className="min-w-0">
              <div className="truncate font-bold">{t("purchases.viaCoins", { n: r.coins.toLocaleString(locale), m: r.method_code })}</div>
              <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString(locale)} — {(r.amount_cents / 100).toFixed(2)} {r.currency}</div>
              {r.admin_note && <div className="text-xs">{t("wd.note")}: {r.admin_note}</div>}
            </div>
            <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${
              r.status === "approved" ? "bg-emerald-500/20 text-emerald-500" :
              r.status === "rejected" ? "bg-destructive/20 text-destructive" :
              "bg-amber-500/20 text-amber-500"
            }`}>{r.status === "approved" ? t("purchases.st.approved") : r.status === "rejected" ? t("purchases.st.rejected") : t("purchases.st.pending")}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
