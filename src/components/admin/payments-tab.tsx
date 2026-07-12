import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  fetchAllCoinPurchases, adminApproveCoinPurchase, adminRejectCoinPurchase,
  fetchAllWithdrawals, adminApproveWithdrawal, adminRejectWithdrawal,
  fetchPaymentMethods, upsertPaymentMethod, deletePaymentMethod, type PaymentMethod,
} from "@/lib/admin-api";

export function PaymentsTab() {
  const [sub, setSub] = useState<"purchases" | "withdrawals" | "methods">("purchases");
  return (
    <div>
      <div className="-mx-4 mb-4 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2">
          {(["purchases","withdrawals","methods"] as const).map(k => (
            <button key={k} onClick={() => setSub(k)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold ${sub===k ? "bg-primary text-primary-foreground" : "bg-surface/60 text-muted-foreground"}`}>
              {k === "purchases" ? "طلبات شراء العملات" : k === "withdrawals" ? "طلبات السحب" : "طرق الدفع"}
            </button>
          ))}
        </div>
      </div>
      {sub === "purchases" && <Purchases />}
      {sub === "withdrawals" && <Withdrawals />}
      {sub === "methods" && <Methods />}
    </div>
  );
}

function Purchases() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"pending"|"approved"|"rejected"|"">("pending");
  const q = useQuery({ queryKey: ["admin-purchases", status], queryFn: () => fetchAllCoinPurchases(status || undefined) });
  async function act(id: string, kind: "approve"|"reject") {
    const note = prompt("ملاحظة (اختياري):") ?? undefined;
    try {
      if (kind === "approve") await adminApproveCoinPurchase(id, note);
      else await adminRejectCoinPurchase(id, note);
      toast.success("تم"); qc.invalidateQueries({ queryKey: ["admin-purchases"] });
    } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <div>
      <div className="mb-3 flex gap-2">
        {(["pending","approved","rejected",""] as const).map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`rounded-md px-3 py-1 text-xs font-semibold ${status===s?"bg-primary text-primary-foreground":"bg-surface/60 text-muted-foreground"}`}>
            {s === "" ? "الكل" : s === "pending" ? "قيد المراجعة" : s === "approved" ? "مقبولة" : "مرفوضة"}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {(q.data ?? []).map(r => (
          <div key={r.id} className="rounded-lg border border-border/40 bg-surface/40 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <b>@{r.user?.username}</b> — {r.coins.toLocaleString("ar")} عملة عبر {r.method_code} ({(r.amount_cents/100).toFixed(2)} {r.currency})
              </div>
              <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("ar")}</div>
            </div>
            {r.proof_ref && <div className="mt-1 text-xs">مرجع الدفع: <code>{r.proof_ref}</code></div>}
            {r.proof_note && <div className="mt-1 text-xs text-muted-foreground">{r.proof_note}</div>}
            {r.admin_note && <div className="mt-1 text-xs">ملاحظة: {r.admin_note}</div>}
            {r.status === "pending" && (
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => act(r.id, "approve")}>قبول وإيداع</Button>
                <Button size="sm" variant="destructive" onClick={() => act(r.id, "reject")}>رفض</Button>
              </div>
            )}
            {r.status !== "pending" && <div className="mt-1 text-xs font-bold">{r.status}</div>}
          </div>
        ))}
        {q.data?.length === 0 && <div className="rounded-lg border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">لا توجد طلبات.</div>}
      </div>
    </div>
  );
}

function Withdrawals() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"pending"|"approved"|"rejected"|"">("pending");
  const q = useQuery({ queryKey: ["admin-withdrawals", status], queryFn: () => fetchAllWithdrawals(status || undefined) });
  async function act(id: string, kind: "approve"|"reject") {
    const note = prompt("ملاحظة (اختياري):") ?? undefined;
    try {
      if (kind === "approve") await adminApproveWithdrawal(id, note);
      else await adminRejectWithdrawal(id, note);
      toast.success("تم"); qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <div>
      <div className="mb-3 flex gap-2">
        {(["pending","approved","rejected",""] as const).map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`rounded-md px-3 py-1 text-xs font-semibold ${status===s?"bg-primary text-primary-foreground":"bg-surface/60 text-muted-foreground"}`}>
            {s === "" ? "الكل" : s === "pending" ? "قيد المراجعة" : s === "approved" ? "مقبولة" : "مرفوضة"}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {(q.data ?? []).map(r => (
          <div key={r.id} className="rounded-lg border border-border/40 bg-surface/40 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><b>@{r.author?.username}</b> — سحب {r.coins.toLocaleString("ar")} عملة عبر {r.method_code}</div>
              <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("ar")}</div>
            </div>
            <div className="mt-1 text-xs">حساب الدفع: <code>{r.payout_account}</code></div>
            {r.admin_note && <div className="mt-1 text-xs">ملاحظة: {r.admin_note}</div>}
            {r.status === "pending" ? (
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => act(r.id, "approve")}>قبول ودفع</Button>
                <Button size="sm" variant="destructive" onClick={() => act(r.id, "reject")}>رفض</Button>
              </div>
            ) : <div className="mt-1 text-xs font-bold">{r.status}</div>}
          </div>
        ))}
        {q.data?.length === 0 && <div className="rounded-lg border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">لا توجد طلبات.</div>}
      </div>
    </div>
  );
}

function Methods() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["payment-methods-all"], queryFn: () => fetchPaymentMethods(true) });
  const [edit, setEdit] = useState<Partial<PaymentMethod> | null>(null);

  async function save() {
    if (!edit || !edit.code || !edit.name_ar || !edit.kind) return toast.error("املأ الحقول الأساسية");
    try { await upsertPaymentMethod(edit); toast.success("تم"); setEdit(null); qc.invalidateQueries({ queryKey: ["payment-methods-all"] }); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function del(id: string) {
    if (!confirm("حذف طريقة الدفع؟")) return;
    try { await deletePaymentMethod(id); toast.success("حُذف"); qc.invalidateQueries({ queryKey: ["payment-methods-all"] }); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button onClick={() => setEdit({ enabled: true, sort_order: 0, kind: "wallet" })}>إضافة طريقة</Button>
      </div>
      <div className="space-y-2">
        {(q.data ?? []).map(m => (
          <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/40 bg-surface/40 p-3 text-sm">
            <div className="min-w-0 flex-1">
              <div className="font-bold">{m.name_ar} <span className="text-xs text-muted-foreground">({m.code})</span></div>
              <div className="text-xs text-muted-foreground">النوع: {m.kind} {m.enabled ? "· مفعّل" : "· معطّل"}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEdit(m)}>تعديل</Button>
            <Button size="sm" variant="outline" onClick={() => del(m.id)}>حذف</Button>
          </div>
        ))}
      </div>
      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setEdit(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-lg font-black">طريقة دفع</h3>
            <div className="grid gap-2 text-sm">
              <input placeholder="code" value={edit.code ?? ""} onChange={e => setEdit({ ...edit, code: e.target.value })} className="h-9 rounded-md border border-input bg-background/60 px-3" />
              <input placeholder="الاسم بالعربية" value={edit.name_ar ?? ""} onChange={e => setEdit({ ...edit, name_ar: e.target.value })} className="h-9 rounded-md border border-input bg-background/60 px-3" />
              <select value={edit.kind ?? "wallet"} onChange={e => setEdit({ ...edit, kind: e.target.value })} className="h-9 rounded-md border border-input bg-background/60 px-3">
                <option value="paypal">PayPal</option>
                <option value="crypto">Crypto</option>
                <option value="wallet">Wallet</option>
                <option value="bank">Bank</option>
              </select>
              <textarea placeholder="تعليمات الدفع" value={edit.instructions ?? ""} onChange={e => setEdit({ ...edit, instructions: e.target.value })} className="min-h-20 rounded-md border border-input bg-background/60 p-2" />
              <textarea placeholder="بيانات الحساب (تُعرض للمستخدم)" value={edit.account_details ?? ""} onChange={e => setEdit({ ...edit, account_details: e.target.value })} className="min-h-16 rounded-md border border-input bg-background/60 p-2" />
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!edit.enabled} onChange={e => setEdit({ ...edit, enabled: e.target.checked })} /><span>مفعّلة</span></label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEdit(null)}>إلغاء</Button>
              <Button onClick={save}>حفظ</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
