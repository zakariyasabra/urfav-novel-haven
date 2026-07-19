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
import { useT } from "@/i18n/provider";
import {
  fetchAllCoinPurchases,
  adminApproveCoinPurchase,
  adminRejectCoinPurchase,
  fetchAllWithdrawals,
  adminApproveWithdrawal,
  adminRejectWithdrawal,
  fetchPaymentMethods,
  upsertPaymentMethod,
  deletePaymentMethod,
  uploadPaymentQr,
  signedQrUrl,
  signedProofUrl,
  fetchAllVipRequests,
  adminApproveVip,
  adminRejectVip,
  type PaymentMethod,
  type PaymentMethodConfig,
} from "@/lib/admin-api";


export function PaymentsTab() {
  const t = useT();
  const [sub, setSub] = useState<"purchases" | "vip" | "withdrawals" | "methods">("purchases");
  return (
    <div>
      <div className="-mx-4 mb-4 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2">
          {(["purchases", "vip", "withdrawals", "methods"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setSub(k)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold ${sub === k ? "bg-primary text-primary-foreground" : "bg-surface/60 text-muted-foreground"}`}
            >
              {k === "purchases"
                ? t("payments.sub.purchases")
                : k === "vip"
                  ? t("payments.sub.vip") || "طلبات VIP"
                  : k === "withdrawals"
                    ? t("payments.sub.withdrawals")
                    : t("payments.sub.methods")}
            </button>
          ))}
        </div>
      </div>
      {sub === "purchases" && <Purchases />}
      {sub === "vip" && <VipRequests />}
      {sub === "withdrawals" && <Withdrawals />}
      {sub === "methods" && <Methods />}
    </div>
  );
}


function ProofImage({ path }: { path: string }) {
  const t = useT();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    signedProofUrl(path).then((u) => {
      if (live) setUrl(u);
    });
    return () => {
      live = false;
    };
  }, [path]);
  if (!url) return <div className="text-xs text-muted-foreground">{t("payments.loadingImg")}</div>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-2 text-xs text-primary underline"
    >
      <ImageIcon className="h-3.5 w-3.5" /> {t("payments.openScreenshot")}
    </a>
  );
}

function Toolbar({
  search,
  setSearch,
  onExport,
  canExport,
}: {
  search: string;
  setSearch: (v: string) => void;
  onExport: () => void;
  canExport: boolean;
}) {
  const t = useT();
  return (
    <div className="ms-auto flex flex-1 gap-2 sm:flex-none">
      <div className="relative flex-1 sm:w-64">
        <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("payments.searchPh")}
          className="h-9 w-full rounded-md border border-input bg-background/60 px-3 pe-9 text-sm outline-none focus:border-primary"
        />
      </div>
      <button
        onClick={onExport}
        disabled={!canExport}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border/60 bg-surface/60 px-3 text-xs font-semibold hover:border-primary disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" /> CSV
      </button>
    </div>
  );
}

function statusFilterLabel(
  t: ReturnType<typeof useT>,
  s: "pending" | "approved" | "rejected" | "",
) {
  if (s === "") return t("payments.filter.all");
  if (s === "pending") return t("payments.filter.pending");
  if (s === "approved") return t("payments.filter.approved");
  return t("payments.filter.rejected");
}

function Purchases() {
  const t = useT();
  const qc = useQueryClient();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "">("pending");
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const q = useQuery({
    queryKey: ["admin-purchases", status],
    queryFn: () => fetchAllCoinPurchases(status || undefined),
  });

  const filtered = useMemo(() => {
    const s = debounced.trim().toLowerCase();
    if (!s) return q.data ?? [];
    return (q.data ?? []).filter(
      (r) =>
        (r.user?.username ?? "").toLowerCase().includes(s) ||
        (r.method_code ?? "").toLowerCase().includes(s) ||
        (r.proof_ref ?? "").toLowerCase().includes(s) ||
        String(r.coins).includes(s),
    );
  }, [q.data, debounced]);

  function exportCsv() {
    downloadCsv("coin-purchases", filtered, [
      {
        key: "created_at",
        label: t("payments.csv.date"),
        format: (v) => new Date(v as string).toISOString(),
      },
      {
        key: "user",
        label: t("payments.csv.user"),
        format: (v) => (v as { username?: string } | null)?.username ?? "",
      },
      { key: "coins", label: t("payments.csv.coins") },
      {
        key: "amount_cents",
        label: t("payments.csv.amount"),
        format: (v) => ((v as number) / 100).toFixed(2),
      },
      { key: "currency", label: t("payments.csv.currency") },
      { key: "method_code", label: t("payments.csv.method") },
      { key: "status", label: t("payments.csv.status") },
      { key: "proof_ref", label: t("payments.csv.ref") },
      { key: "admin_note", label: t("payments.csv.note") },
    ]);
  }

  async function act(id: string, kind: "approve" | "reject") {
    const note =
      (await promptDialog({
        title: kind === "approve" ? t("payments.approveTitle") : t("payments.rejectTitle"),
        label: t("payments.noteInputLabel"),
        multiline: true,
      })) ?? undefined;
    try {
      if (kind === "approve") await adminApproveCoinPurchase(id, note);
      else await adminRejectCoinPurchase(id, note);
      toast.success(t("admin.done"));
      qc.invalidateQueries({ queryKey: ["admin-purchases"] });
    } catch (e) {
      showError(e);
    }
  }
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["pending", "approved", "rejected", ""] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-md px-3 py-1 text-xs font-semibold ${status === s ? "bg-primary text-primary-foreground" : "bg-surface/60 text-muted-foreground"}`}
          >
            {statusFilterLabel(t, s)}
          </button>
        ))}
        <Toolbar
          search={search}
          setSearch={setSearch}
          onExport={exportCsv}
          canExport={filtered.length > 0}
        />
      </div>
      {q.isLoading ? (
        <AdminListSkeleton rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("payments.noRequests")}
          hint={debounced ? t("payments.trySearch") : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-border/40 bg-surface/40 p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  {t("payments.line", {
                    u: r.user?.username ?? "",
                    n: r.coins,
                    m: r.method_code,
                    amount: (r.amount_cents / 100).toFixed(2),
                    c: r.currency,
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
              {r.proof_ref && (
                <div className="mt-1 text-xs">
                  {t("payments.paymentRef")} <code className="break-all">{r.proof_ref}</code>
                </div>
              )}
              {r.proof_note && (
                <div className="mt-1 text-xs text-muted-foreground">{r.proof_note}</div>
              )}
              {r.proof_image_url && (
                <div className="mt-1">
                  <ProofImage path={r.proof_image_url} />
                </div>
              )}
              {r.admin_note && (
                <div className="mt-1 text-xs">
                  {t("payments.notePrefix")} {r.admin_note}
                </div>
              )}
              {r.status === "pending" && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => act(r.id, "approve")}>
                    {t("payments.approveDeposit")}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => act(r.id, "reject")}>
                    {t("payments.reject")}
                  </Button>
                </div>
              )}
              {r.status !== "pending" && <div className="mt-1 text-xs font-bold">{r.status}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Withdrawals() {
  const t = useT();
  const qc = useQueryClient();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "">("pending");
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const q = useQuery({
    queryKey: ["admin-withdrawals", status],
    queryFn: () => fetchAllWithdrawals(status || undefined),
  });

  const filtered = useMemo(() => {
    const s = debounced.trim().toLowerCase();
    if (!s) return q.data ?? [];
    return (q.data ?? []).filter(
      (r) =>
        (r.author?.username ?? "").toLowerCase().includes(s) ||
        (r.method_code ?? "").toLowerCase().includes(s) ||
        (r.payout_account ?? "").toLowerCase().includes(s) ||
        String(r.coins).includes(s),
    );
  }, [q.data, debounced]);

  function exportCsv() {
    downloadCsv("withdrawals", filtered, [
      {
        key: "created_at",
        label: t("payments.csv.date"),
        format: (v) => new Date(v as string).toISOString(),
      },
      {
        key: "author",
        label: t("payments.csv.author"),
        format: (v) => (v as { username?: string } | null)?.username ?? "",
      },
      { key: "coins", label: t("payments.csv.coins") },
      { key: "method_code", label: t("payments.csv.methodShort") },
      { key: "payout_account", label: t("payments.csv.account") },
      { key: "status", label: t("payments.csv.status") },
      { key: "admin_note", label: t("payments.csv.note") },
    ]);
  }

  async function act(id: string, kind: "approve" | "reject") {
    const note =
      (await promptDialog({
        title: kind === "approve" ? t("payments.approveTitle") : t("payments.rejectTitle"),
        label: t("payments.noteInputLabel"),
        multiline: true,
      })) ?? undefined;
    try {
      if (kind === "approve") await adminApproveWithdrawal(id, note);
      else await adminRejectWithdrawal(id, note);
      toast.success(t("admin.done"));
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    } catch (e) {
      showError(e);
    }
  }
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["pending", "approved", "rejected", ""] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-md px-3 py-1 text-xs font-semibold ${status === s ? "bg-primary text-primary-foreground" : "bg-surface/60 text-muted-foreground"}`}
          >
            {statusFilterLabel(t, s)}
          </button>
        ))}
        <Toolbar
          search={search}
          setSearch={setSearch}
          onExport={exportCsv}
          canExport={filtered.length > 0}
        />
      </div>
      {q.isLoading ? (
        <AdminListSkeleton rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("payments.noRequests")}
          hint={debounced ? t("payments.trySearch") : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-border/40 bg-surface/40 p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  {t("payments.wLine", {
                    u: r.author?.username ?? "",
                    n: r.coins,
                    m: r.method_code,
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
              <div className="mt-1 break-all text-xs">
                {t("payments.payoutAccount")} <code>{r.payout_account}</code>
              </div>
              {r.admin_note && (
                <div className="mt-1 text-xs">
                  {t("payments.notePrefix")} {r.admin_note}
                </div>
              )}
              {r.status === "pending" ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => act(r.id, "approve")}>
                    {t("payments.approvePay")}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => act(r.id, "reject")}>
                    {t("payments.reject")}
                  </Button>
                </div>
              ) : (
                <div className="mt-1 text-xs font-bold">{r.status}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QrPreview({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    signedQrUrl(path).then((u) => {
      if (live) setUrl(u);
    });
    return () => {
      live = false;
    };
  }, [path]);
  if (!url) return null;
  return (
    <img src={url} alt="QR" className="h-24 w-24 rounded-md border border-border/40 bg-white p-1" />
  );
}

function ConfigFields({
  kind,
  code,
  config,
  onChange,
}: {
  kind: string;
  code: string;
  config: PaymentMethodConfig;
  onChange: (c: PaymentMethodConfig) => void;
}) {
  const t = useT();
  if (code === "paypal" || kind === "paypal") {
    return (
      <div>
        <label className="mb-1 block text-xs font-bold">{t("payments.paypalEmail")}</label>
        <input
          value={config.email ?? ""}
          onChange={(e) => onChange({ ...config, email: e.target.value })}
          placeholder="you@example.com"
          dir="ltr"
          className="h-9 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
        />
      </div>
    );
  }
  if (code === "usdt" || kind === "crypto") {
    return (
      <div className="grid gap-2">
        <div>
          <label className="mb-1 block text-xs font-bold">{t("payments.usdtAddress")}</label>
          <input
            value={config.address ?? ""}
            onChange={(e) => onChange({ ...config, address: e.target.value })}
            placeholder="TXxx... / 0xxx..."
            dir="ltr"
            className="h-9 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold">{t("payments.network")}</label>
          <select
            value={config.network ?? "TRC20"}
            onChange={(e) => onChange({ ...config, network: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
          >
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
        <label className="mb-1 block text-xs font-bold">{t("payments.vodafoneNumber")}</label>
        <input
          value={config.number ?? ""}
          onChange={(e) => onChange({ ...config, number: e.target.value })}
          placeholder="01xxxxxxxxx"
          dir="ltr"
          className="h-9 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
        />
      </div>
    );
  }
  if (code === "instapay") {
    return (
      <div>
        <label className="mb-1 block text-xs font-bold">{t("payments.instapayHandle")}</label>
        <input
          value={config.handle ?? ""}
          onChange={(e) => onChange({ ...config, handle: e.target.value })}
          placeholder={t("payments.instapayPh")}
          dir="ltr"
          className="h-9 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
        />
      </div>
    );
  }
  return null;
}

function Methods() {
  const t = useT();
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["payment-methods-all"],
    queryFn: () => fetchPaymentMethods(true),
  });
  const [edit, setEdit] = useState<Partial<PaymentMethod> | null>(null);
  const [qrFile, setQrFile] = useState<File | null>(null);

  async function save() {
    if (!edit || !edit.code || !edit.name_ar || !edit.kind)
      return toast.error(t("payments.fillRequired"));
    try {
      let qr_image_url = edit.qr_image_url ?? null;
      if (qrFile) qr_image_url = await uploadPaymentQr(edit.code, qrFile);
      await upsertPaymentMethod({ ...edit, qr_image_url });
      toast.success(t("admin.done"));
      setEdit(null);
      setQrFile(null);
      qc.invalidateQueries({ queryKey: ["payment-methods-all"] });
      qc.invalidateQueries({ queryKey: ["pay-methods"] });
    } catch (e) {
      showError(e);
    }
  }
  async function del(id: string) {
    if (
      !(await confirmDialog({
        title: t("payments.deleteMethodTitle"),
        body: t("payments.deleteMethodBody"),
        confirmLabel: t("common.delete"),
        danger: true,
      }))
    )
      return;
    try {
      await deletePaymentMethod(id);
      toast.success(t("payments.methodDeleted"));
      qc.invalidateQueries({ queryKey: ["payment-methods-all"] });
      qc.invalidateQueries({ queryKey: ["pay-methods"] });
    } catch (e) {
      showError(e);
    }
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
        {t("payments.methodsRestricted")}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button
          onClick={() => {
            setQrFile(null);
            setEdit({ enabled: true, sort_order: 0, kind: "wallet", config: {} });
          }}
        >
          {t("payments.addMethod")}
        </Button>
      </div>
      <div className="space-y-2">
        {(q.data ?? []).map((m) => (
          <div
            key={m.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border/40 bg-surface/40 p-3 text-sm"
          >
            {m.qr_image_url && <QrPreview path={m.qr_image_url} />}
            <div className="min-w-0 flex-1">
              <div className="font-bold">
                {m.name_ar} <span className="text-xs text-muted-foreground">({m.code})</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {t("payments.methodType")} {m.kind}
                {m.code === "usdt" && m.config?.network ? ` · ${m.config.network}` : ""}{" "}
                {m.enabled ? t("payments.enabledFlag") : t("payments.disabledFlag")}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setQrFile(null);
                setEdit(m);
              }}
            >
              {t("common.edit")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => del(m.id)}>
              {t("common.delete")}
            </Button>
          </div>
        ))}
      </div>
      {edit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => {
            setEdit(null);
            setQrFile(null);
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl border border-border/60 bg-surface p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-lg font-black">{t("payments.methodTitle")}</h3>
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-bold">{t("payments.field.code")}</label>
                  <input
                    placeholder={t("payments.field.codePh")}
                    value={edit.code ?? ""}
                    onChange={(e) => setEdit({ ...edit, code: e.target.value })}
                    dir="ltr"
                    className="h-9 w-full rounded-md border border-input bg-background/60 px-3"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold">
                    {t("payments.field.nameAr")}
                  </label>
                  <input
                    value={edit.name_ar ?? ""}
                    onChange={(e) => setEdit({ ...edit, name_ar: e.target.value })}
                    className="h-9 w-full rounded-md border border-input bg-background/60 px-3"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-bold">{t("payments.field.kind")}</label>
                  <select
                    value={edit.kind ?? "wallet"}
                    onChange={(e) => setEdit({ ...edit, kind: e.target.value })}
                    className="h-9 w-full rounded-md border border-input bg-background/60 px-3"
                  >
                    <option value="paypal">PayPal</option>
                    <option value="crypto">Crypto</option>
                    <option value="wallet">Wallet</option>
                    <option value="bank">Bank</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold">
                    {t("payments.field.currency")}
                  </label>
                  <select
                    value={edit.currency ?? "USD"}
                    onChange={(e) =>
                      setEdit({ ...edit, currency: e.target.value as "USD" | "EGP" })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background/60 px-3"
                  >
                    <option value="USD">{t("payments.field.currencyUSD")}</option>
                    <option value="EGP">{t("payments.field.currencyEGP")}</option>
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
                <label className="mb-1 block text-xs font-bold">
                  {t("payments.field.instructions")}
                </label>
                <textarea
                  value={edit.instructions ?? ""}
                  onChange={(e) => setEdit({ ...edit, instructions: e.target.value })}
                  className="min-h-20 w-full rounded-md border border-input bg-background/60 p-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold">{t("payments.field.qr")}</label>
                <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-dashed border-border/60 bg-background/40 p-3 text-sm hover:border-primary">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    {qrFile ? (
                      <ImageIcon className="h-4 w-4 text-primary" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span className="truncate">
                      {qrFile
                        ? qrFile.name
                        : edit.qr_image_url
                          ? t("payments.qr.replace")
                          : t("payments.qr.choose")}
                    </span>
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setQrFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {edit.qr_image_url && !qrFile && (
                  <div className="mt-2">
                    <QrPreview path={edit.qr_image_url} />
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!edit.enabled}
                  onChange={(e) => setEdit({ ...edit, enabled: e.target.checked })}
                />
                <span>{t("payments.enabled")}</span>
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEdit(null);
                  setQrFile(null);
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button onClick={save}>{t("common.save")}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VipRequests() {
  const t = useT();
  const qc = useQueryClient();
  const [status, setStatus] = useState<
    "pending_review" | "active" | "rejected" | "cancelled" | ""
  >("pending_review");
  const q = useQuery({
    queryKey: ["admin-vip-requests", status],
    queryFn: () => fetchAllVipRequests(status || undefined),
  });

  async function act(id: string, kind: "approve" | "reject") {
    const note =
      (await promptDialog({
        title: kind === "approve" ? t("payments.approveTitle") : t("payments.rejectTitle"),
        label: t("payments.noteInputLabel"),
        multiline: true,
      })) ?? undefined;
    try {
      if (kind === "approve") await adminApproveVip(id, note);
      else await adminRejectVip(id, note);
      toast.success(t("admin.done"));
      qc.invalidateQueries({ queryKey: ["admin-vip-requests"] });
    } catch (e) {
      showError(e);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(
          ["pending_review", "active", "rejected", ""] as const
        ).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-md px-3 py-1 text-xs font-semibold ${status === s ? "bg-primary text-primary-foreground" : "bg-surface/60 text-muted-foreground"}`}
          >
            {s === "" ? t("payments.filter.all") : s}
          </button>
        ))}
      </div>
      {q.isLoading ? (
        <AdminListSkeleton rows={4} />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState title={t("payments.noRequests")} />
      ) : (
        <div className="space-y-2">
          {(q.data ?? []).map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-border/40 bg-surface/40 p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-bold">{r.user?.username ?? r.user_id.slice(0, 8)}</span>
                  {" — "}
                  {r.plan?.name_ar ?? "—"}
                  {r.method ? ` · ${r.method.name_ar}` : ""}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
              {r.proof_ref && (
                <div className="mt-1 text-xs">
                  {t("payments.paymentRef")} <code className="break-all">{r.proof_ref}</code>
                </div>
              )}
              {r.proof_note && (
                <div className="mt-1 text-xs text-muted-foreground">{r.proof_note}</div>
              )}
              {r.proof_image_url && (
                <div className="mt-1">
                  <ProofImage path={r.proof_image_url} />
                </div>
              )}
              {r.admin_note && (
                <div className="mt-1 text-xs">
                  {t("payments.notePrefix")} {r.admin_note}
                </div>
              )}
              {r.status === "pending_review" ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => act(r.id, "approve")}>
                    {t("payments.approvePay")}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => act(r.id, "reject")}>
                    {t("payments.reject")}
                  </Button>
                </div>
              ) : (
                <div className="mt-1 text-xs font-bold">{r.status}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
