import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Coins } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchPaymentMethods, submitCoinPurchase, fetchMyCoinPurchases } from "@/lib/admin-api";

export function BuyCoinsDialog({ coins, amountUsd, onClose }: { coins: number; amountUsd: number; onClose: () => void }) {
  const qc = useQueryClient();
  const methodsQ = useQuery({ queryKey: ["pay-methods"], queryFn: () => fetchPaymentMethods(false) });
  const [method, setMethod] = useState<string>("");
  const [proofRef, setProofRef] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = methodsQ.data?.find(m => m.code === method);

  async function submit() {
    if (!method) return toast.error("اختر طريقة دفع");
    if (!proofRef.trim()) return toast.error("أدخل مرجع الدفع (رقم العملية)");
    setBusy(true);
    try {
      await submitCoinPurchase({
        method_code: method,
        coins,
        amount_cents: Math.round(amountUsd * 100),
        proof_ref: proofRef.trim(),
        proof_note: proofNote.trim() || undefined,
      });
      toast.success("تم إرسال طلبك. سيراجعه المشرف قريباً.");
      qc.invalidateQueries({ queryKey: ["my-purchases"] });
      onClose();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl border border-border/60 bg-surface p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-black">شراء {coins.toLocaleString("ar")} عملة</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="mb-4 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
          <div>المبلغ: <b>${amountUsd.toFixed(2)}</b></div>
          <div className="flex items-center gap-1 text-primary"><Coins className="h-4 w-4" /> {coins.toLocaleString("ar")} عملة</div>
        </div>

        <label className="mb-1 block text-xs font-bold">طريقة الدفع</label>
        <div className="mb-3 grid gap-2">
          {(methodsQ.data ?? []).map(m => (
            <button key={m.id} onClick={() => setMethod(m.code)}
              className={`rounded-lg border p-3 text-start text-sm ${method === m.code ? "border-primary bg-primary/10" : "border-border/40 bg-background/40"}`}>
              <div className="font-bold">{m.name_ar}</div>
              <div className="text-xs text-muted-foreground">{m.kind}</div>
            </button>
          ))}
        </div>

        {selected && (selected.instructions || selected.account_details) && (
          <div className="mb-3 rounded-lg border border-border/40 bg-background/40 p-3 text-xs">
            {selected.instructions && <div className="mb-2 whitespace-pre-wrap">{selected.instructions}</div>}
            {selected.account_details && (
              <div className="rounded bg-surface/60 p-2">
                <div className="mb-1 text-[10px] font-bold text-muted-foreground">أرسل الدفع إلى:</div>
                <div className="whitespace-pre-wrap font-mono">{selected.account_details}</div>
              </div>
            )}
          </div>
        )}

        <label className="mb-1 block text-xs font-bold">رقم / مرجع العملية</label>
        <input value={proofRef} onChange={e => setProofRef(e.target.value)}
          placeholder="TXID, رقم العملية, آخر 4 أرقام..."
          className="mb-3 h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm" />

        <label className="mb-1 block text-xs font-bold">ملاحظة (اختياري)</label>
        <textarea value={proofNote} onChange={e => setProofNote(e.target.value)}
          className="mb-4 min-h-16 w-full rounded-md border border-input bg-background/60 p-2 text-sm" />

        <Button disabled={busy} onClick={submit} className="w-full">إرسال الطلب</Button>
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
        {(q.data ?? []).map(r => (
          <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3 text-sm">
            <div className="min-w-0">
              <div className="truncate font-bold">{r.coins.toLocaleString("ar")} عملة عبر {r.method_code}</div>
              <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("ar")} — {(r.amount_cents/100).toFixed(2)} {r.currency}</div>
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
