import { showError } from "@/lib/errors";
import { confirmDialog, promptDialog } from "@/components/ui/dialog-service";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, ImageIcon, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { downloadCsv } from "@/lib/csv";
import { AdminListSkeleton, EmptyState } from "@/components/admin/list-skeleton";
import {
  fetchAllCoinPurchases, adminApproveCoinPurchase, adminRejectCoinPurchase,
  fetchAllWithdrawals, adminApproveWithdrawal, adminRejectWithdrawal,
  fetchPaymentMethods, upsertPaymentMethod, deletePaymentMethod,
  uploadPaymentQr, signedQrUrl, signedProofUrl,
  type PaymentMethod, type PaymentMethodConfig,
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

function ProofImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { let live = true; signedProofUrl(path).then(u => { if (live) setUrl(u); }); return () => { live = false; }; }, [path]);
  if (!url) return <div className="text-xs text-muted-foreground">جاري تحميل الصورة…</div>;
  return (
    <a href={url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 text-xs text-primary underline">
      <ImageIcon className="h-3.5 w-3.5" /> فتح لقطة الشاشة
    </a>
  );
}

function Purchases() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"pending"|"approved"|"rejected"|"">("pending");
  const q = useQuery({ queryKey: ["admin-purchases", status], queryFn: () => fetchAllCoinPurchases(status || undefined) });
  async function act(id: string, kind: "approve"|"reject") {
    const note = (await promptDialog({ title: kind === "approve" ? "قبول الطلب" : "رفض الطلب", label: "ملاحظة (اختياري)", multiline: true })) ?? undefined;
    try {
      if (kind === "approve") await adminApproveCoinPurchase(id, note);
      else await adminRejectCoinPurchase(id, note);
      toast.success("تم"); qc.invalidateQueries({ queryKey: ["admin-purchases"] });
    } catch (e) { showError(e); }
  }
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
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
              <div className="min-w-0">
                <b>@{r.user?.username}</b> — {r.coins.toLocaleString("ar")} عملة عبر {r.method_code} ({(r.amount_cents/100).toFixed(2)} {r.currency})
              </div>
              <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("ar")}</div>
            </div>
            {r.proof_ref && <div className="mt-1 text-xs">مرجع الدفع: <code className="break-all">{r.proof_ref}</code></div>}
            {r.proof_note && <div className="mt-1 text-xs text-muted-foreground">{r.proof_note}</div>}
            {r.proof_image_url && <div className="mt-1"><ProofImage path={r.proof_image_url} /></div>}
            {r.admin_note && <div className="mt-1 text-xs">ملاحظة: {r.admin_note}</div>}
            {r.status === "pending" && (
              <div className="mt-2 flex flex-wrap gap-2">
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
    const note = (await promptDialog({ title: kind === "approve" ? "قبول الطلب" : "رفض الطلب", label: "ملاحظة (اختياري)", multiline: true })) ?? undefined;
    try {
      if (kind === "approve") await adminApproveWithdrawal(id, note);
      else await adminRejectWithdrawal(id, note);
      toast.success("تم"); qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    } catch (e) { showError(e); }
  }
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
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
              <div className="min-w-0"><b>@{r.author?.username}</b> — سحب {r.coins.toLocaleString("ar")} عملة عبر {r.method_code}</div>
              <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("ar")}</div>
            </div>
            <div className="mt-1 break-all text-xs">حساب الدفع: <code>{r.payout_account}</code></div>
            {r.admin_note && <div className="mt-1 text-xs">ملاحظة: {r.admin_note}</div>}
            {r.status === "pending" ? (
              <div className="mt-2 flex flex-wrap gap-2">
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

function QrPreview({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { let live = true; signedQrUrl(path).then(u => { if (live) setUrl(u); }); return () => { live = false; }; }, [path]);
  if (!url) return null;
  return <img src={url} alt="QR" className="h-24 w-24 rounded-md border border-border/40 bg-white p-1" />;
}

function ConfigFields({ kind, code, config, onChange }: {
  kind: string; code: string; config: PaymentMethodConfig; onChange: (c: PaymentMethodConfig) => void;
}) {
  if (code === "paypal" || kind === "paypal") {
    return (
      <div>
        <label className="mb-1 block text-xs font-bold">بريد PayPal</label>
        <input value={config.email ?? ""} onChange={e => onChange({ ...config, email: e.target.value })}
          placeholder="you@example.com" dir="ltr"
          className="h-9 w-full rounded-md border border-input bg-background/60 px-3 text-sm" />
      </div>
    );
  }
  if (code === "usdt" || kind === "crypto") {
    return (
      <div className="grid gap-2">
        <div>
          <label className="mb-1 block text-xs font-bold">عنوان محفظة USDT</label>
          <input value={config.address ?? ""} onChange={e => onChange({ ...config, address: e.target.value })}
            placeholder="TXxx... / 0xxx..." dir="ltr"
            className="h-9 w-full rounded-md border border-input bg-background/60 px-3 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold">الشبكة</label>
          <select value={config.network ?? "TRC20"} onChange={e => onChange({ ...config, network: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-background/60 px-3 text-sm">
            <option value="TRC20">TRC20</option>
            <option value="BEP20">BEP20</option>
            <option value="ERC20">ERC20</option>
          </select>
        </div>
      </div>
    );
  }
  if (code === "vodafone_cash") {
    return (
      <div>
        <label className="mb-1 block text-xs font-bold">رقم فودافون كاش</label>
        <input value={config.number ?? ""} onChange={e => onChange({ ...config, number: e.target.value })}
          placeholder="01xxxxxxxxx" dir="ltr"
          className="h-9 w-full rounded-md border border-input bg-background/60 px-3 text-sm" />
      </div>
    );
  }
  if (code === "instapay") {
    return (
      <div>
        <label className="mb-1 block text-xs font-bold">حساب InstaPay (اسم المستخدم أو رقم الهاتف)</label>
        <input value={config.handle ?? ""} onChange={e => onChange({ ...config, handle: e.target.value })}
          placeholder="username@instapay أو 01xxxxxxxxx" dir="ltr"
          className="h-9 w-full rounded-md border border-input bg-background/60 px-3 text-sm" />
      </div>
    );
  }
  return null;
}

function Methods() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["payment-methods-all"], queryFn: () => fetchPaymentMethods(true) });
  const [edit, setEdit] = useState<Partial<PaymentMethod> | null>(null);
  const [qrFile, setQrFile] = useState<File | null>(null);

  async function save() {
    if (!edit || !edit.code || !edit.name_ar || !edit.kind) return toast.error("املأ الحقول الأساسية");
    try {
      let qr_image_url = edit.qr_image_url ?? null;
      if (qrFile) qr_image_url = await uploadPaymentQr(edit.code, qrFile);
      await upsertPaymentMethod({ ...edit, qr_image_url });
      toast.success("تم"); setEdit(null); setQrFile(null);
      qc.invalidateQueries({ queryKey: ["payment-methods-all"] });
      qc.invalidateQueries({ queryKey: ["pay-methods"] });
    } catch (e) { showError(e); }
  }
  async function del(id: string) {
    if (!(await confirmDialog({ title: "حذف طريقة الدفع", body: "هل تريد حذف طريقة الدفع هذه؟", confirmLabel: "حذف", danger: true }))) return;
    try {
      await deletePaymentMethod(id); toast.success("حُذف");
      qc.invalidateQueries({ queryKey: ["payment-methods-all"] });
      qc.invalidateQueries({ queryKey: ["pay-methods"] });
    }
    catch (e) { showError(e); }
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
        إعدادات طرق الدفع متاحة للمدير العام فقط.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button onClick={() => { setQrFile(null); setEdit({ enabled: true, sort_order: 0, kind: "wallet", config: {} }); }}>
          إضافة طريقة
        </Button>
      </div>
      <div className="space-y-2">
        {(q.data ?? []).map(m => (
          <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/40 bg-surface/40 p-3 text-sm">
            {m.qr_image_url && <QrPreview path={m.qr_image_url} />}
            <div className="min-w-0 flex-1">
              <div className="font-bold">{m.name_ar} <span className="text-xs text-muted-foreground">({m.code})</span></div>
              <div className="text-xs text-muted-foreground">
                النوع: {m.kind}{m.code === "usdt" && m.config?.network ? ` · ${m.config.network}` : ""} {m.enabled ? "· مفعّل" : "· معطّل"}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setQrFile(null); setEdit(m); }}>تعديل</Button>
            <Button size="sm" variant="outline" onClick={() => del(m.id)}>حذف</Button>
          </div>
        ))}
      </div>
      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { setEdit(null); setQrFile(null); }}>
          <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl border border-border/60 bg-surface p-5 sm:p-6" onClick={e => e.stopPropagation()}>
            <h3 className="mb-3 text-lg font-black">طريقة دفع</h3>
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-bold">المعرّف (code)</label>
                  <input placeholder="paypal / usdt / vodafone_cash / instapay" value={edit.code ?? ""} onChange={e => setEdit({ ...edit, code: e.target.value })}
                    dir="ltr" className="h-9 w-full rounded-md border border-input bg-background/60 px-3" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold">الاسم بالعربية</label>
                  <input value={edit.name_ar ?? ""} onChange={e => setEdit({ ...edit, name_ar: e.target.value })}
                    className="h-9 w-full rounded-md border border-input bg-background/60 px-3" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-bold">النوع</label>
                  <select value={edit.kind ?? "wallet"} onChange={e => setEdit({ ...edit, kind: e.target.value })}
                    className="h-9 w-full rounded-md border border-input bg-background/60 px-3">
                    <option value="paypal">PayPal</option>
                    <option value="crypto">Crypto</option>
                    <option value="wallet">Wallet</option>
                    <option value="bank">Bank</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold">العملة</label>
                  <select value={edit.currency ?? "USD"} onChange={e => setEdit({ ...edit, currency: e.target.value as "USD" | "EGP" })}
                    className="h-9 w-full rounded-md border border-input bg-background/60 px-3">
                    <option value="USD">USD (دولار)</option>
                    <option value="EGP">EGP (جنيه مصري)</option>
                  </select>
                </div>
              </div>

              <ConfigFields
                kind={edit.kind ?? "wallet"}
                code={edit.code ?? ""}
                config={(edit.config ?? {}) as PaymentMethodConfig}
                onChange={(c) => setEdit({ ...edit, config: c })}
              />

              <div>
                <label className="mb-1 block text-xs font-bold">تعليمات تُعرض للعميل</label>
                <textarea value={edit.instructions ?? ""} onChange={e => setEdit({ ...edit, instructions: e.target.value })}
                  className="min-h-20 w-full rounded-md border border-input bg-background/60 p-2" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold">رمز QR (اختياري)</label>
                <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-dashed border-border/60 bg-background/40 p-3 text-sm hover:border-primary">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    {qrFile ? <ImageIcon className="h-4 w-4 text-primary" /> : <Upload className="h-4 w-4" />}
                    <span className="truncate">{qrFile ? qrFile.name : edit.qr_image_url ? "استبدال الصورة الحالية" : "اختر صورة QR"}</span>
                  </span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => setQrFile(e.target.files?.[0] ?? null)} />
                </label>
                {edit.qr_image_url && !qrFile && <div className="mt-2"><QrPreview path={edit.qr_image_url} /></div>}
              </div>

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!edit.enabled} onChange={e => setEdit({ ...edit, enabled: e.target.checked })} />
                <span>مفعّلة</span>
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setEdit(null); setQrFile(null); }}>إلغاء</Button>
              <Button onClick={save}>حفظ</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
