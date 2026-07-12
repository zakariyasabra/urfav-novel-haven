import { useEffect, useState } from "react";
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

function CopyBtn({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setOk(true); toast.success("تم النسخ"); setTimeout(() => setOk(false), 1500); }
        catch { toast.error("تعذّر النسخ"); }
      }}
      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-border/60 bg-background/60 px-2 text-xs font-semibold hover:border-primary"
      aria-label="نسخ"
    >
      {ok ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      نسخ
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
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => { let live = true; if (m.qr_image_url) signedQrUrl(m.qr_image_url).then(u => { if (live) setQr(u); }); return () => { live = false; }; }, [m.qr_image_url]);

  const c = m.config ?? {};
  const rows: { label: string; value: string }[] = [];
  if (m.code === "paypal" && c.email) rows.push({ label: "بريد PayPal", value: c.email });
  if (m.code === "usdt") {
    if (c.address) rows.push({ label: `عنوان USDT (${c.network || "TRC20"})`, value: c.address });
  }
  if (m.code === "vodafone_cash" && c.number) rows.push({ label: "رقم فودافون كاش", value: c.number });
  if (m.code === "instapay" && c.handle) rows.push({ label: "حساب InstaPay", value: c.handle });
  if (rows.length === 0 && m.account_details) rows.push({ label: "بيانات الحساب", value: m.account_details });

  return (
    <div className="space-y-2 rounded-lg border border-border/40 bg-background/40 p-3 text-xs">
      {m.instructions && <div className="whitespace-pre-wrap text-foreground/85">{m.instructions}</div>}
      <div className="grid gap-2">{rows.map((r, i) => <DetailRow key={i} {...r} />)}</div>
      {qr && (
        <div className="flex flex-col items-center gap-1 pt-1">
          <img src={qr} alt="QR" className="h-40 w-40 rounded-md border border-border/40 bg-white p-1" />
          <span className="text-[10px] text-muted-foreground">امسح رمز QR للدفع</span>
        </div>
      )}
    </div>
  );
}

export function BuyCoinsDialog({ coins, amountUsd, onClose }: { coins: number; amountUsd: number; onClose: () => void }) {
  const qc = useQueryClient();
  const methodsQ = useQuery({ queryKey: ["pay-methods"], queryFn: () => fetchPaymentMethods(false) });
  const [method, setMethod] = useState<string>("");
  const [amount, setAmount] = useState<string>(amountUsd.toFixed(2));
  const [proofRef, setProofRef] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const selected = methodsQ.data?.find((m) => m.code === method);

  async function submit() {
    if (!method) return toast.error("اختر طريقة دفع");
    if (!proofRef.trim()) return toast.error("أدخل مرجع الدفع (رقم العملية)");
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("أدخل المبلغ المحوّل");
    setBusy(true);
    try {
      let proof_image_url: string | undefined;
      if (proofFile) proof_image_url = await uploadPaymentProof(proofFile);
      await submitCoinPurchase({
        method_code: method,
        coins,
        amount_cents: Math.round(amt * 100),
        proof_ref: proofRef.trim(),
        proof_note: proofNote.trim() || undefined,
        proof_image_url,
      });
      toast.success("تم إرسال طلبك. سيراجعه المشرف قريباً.");
      qc.invalidateQueries({ queryKey: ["my-purchases"] });
      onClose();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl border border-border/60 bg-surface p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black sm:text-xl">شراء {coins.toLocaleString("ar")} عملة</h3>
          <button onClick={onClose} aria-label="إغلاق"><X className="h-5 w-5" /></button>
        </div>

        <div className="mb-4 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
          <div>المبلغ المقترح: <b>${amountUsd.toFixed(2)}</b></div>
          <div className="flex items-center gap-1 text-primary"><Coins className="h-4 w-4" /> {coins.toLocaleString("ar")} عملة</div>
        </div>

        <label className="mb-1 block text-xs font-bold">طريقة الدفع</label>
        <div className="mb-3 grid gap-2">
          {(methodsQ.data ?? []).map((m) => (
            <button key={m.id} onClick={() => setMethod(m.code)} type="button"
              className={`rounded-lg border p-3 text-start text-sm transition-colors ${method === m.code ? "border-primary bg-primary/10" : "border-border/40 bg-background/40 hover:border-border"}`}>
              <div className="font-bold">{m.name_ar}</div>
              <div className="text-xs text-muted-foreground">
                {m.code === "usdt" && m.config?.network ? `USDT · ${m.config.network}` : m.kind}
              </div>
            </button>
          ))}
          {(methodsQ.data?.length ?? 0) === 0 && (
            <div className="rounded-lg border border-dashed border-border/50 p-6 text-center text-xs text-muted-foreground">
              لا توجد طرق دفع مفعّلة حالياً.
            </div>
          )}
        </div>

        {selected && <div className="mb-3"><MethodDetails m={selected} /></div>}

        <label className="mb-1 block text-xs font-bold">المبلغ المحوّل (USD)</label>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal"
          className="mb-3 h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm" dir="ltr" />

        <label className="mb-1 block text-xs font-bold">رقم / مرجع العملية</label>
        <input value={proofRef} onChange={(e) => setProofRef(e.target.value)}
          placeholder="TXID / رقم العملية / آخر 4 أرقام"
          className="mb-3 h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm" dir="ltr" />

        <label className="mb-1 block text-xs font-bold">لقطة شاشة (اختياري)</label>
        <label className="mb-3 flex cursor-pointer items-center justify-between gap-2 rounded-md border border-dashed border-border/60 bg-background/40 p-3 text-sm hover:border-primary">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            {proofFile ? <ImageIcon className="h-4 w-4 text-primary" /> : <Upload className="h-4 w-4" />}
            <span className="truncate">{proofFile ? proofFile.name : "اضغط لاختيار صورة"}</span>
          </span>
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
        </label>

        <label className="mb-1 block text-xs font-bold">ملاحظة (اختياري)</label>
        <textarea value={proofNote} onChange={(e) => setProofNote(e.target.value)}
          className="mb-4 min-h-16 w-full rounded-md border border-input bg-background/60 p-2 text-sm" />

        <Button disabled={busy} onClick={submit} className="w-full">
          {busy ? "جاري الإرسال..." : "إرسال الطلب"}
        </Button>
      </div>
    </div>
  );
}

export function MyPurchasesList() {
  const q = useQuery({ queryKey: ["my-purchases"], queryFn: fetchMyCoinPurchases });
  if ((q.data?.length ?? 0) === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xl font-black">طلبات شراء العملات</h2>
      <div className="divide-y divide-border/40 rounded-2xl border border-border/40 bg-surface/40">
        {(q.data ?? []).map((r) => (
          <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3 text-sm">
            <div className="min-w-0">
              <div className="truncate font-bold">{r.coins.toLocaleString("ar")} عملة عبر {r.method_code}</div>
              <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("ar")} — {(r.amount_cents / 100).toFixed(2)} {r.currency}</div>
              {r.admin_note && <div className="text-xs">ملاحظة: {r.admin_note}</div>}
            </div>
            <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${
              r.status === "approved" ? "bg-emerald-500/20 text-emerald-500" :
              r.status === "rejected" ? "bg-destructive/20 text-destructive" :
              "bg-amber-500/20 text-amber-500"
            }`}>{r.status === "approved" ? "مقبول" : r.status === "rejected" ? "مرفوض" : "قيد المراجعة"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
