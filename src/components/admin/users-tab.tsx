import { showError } from "@/lib/errors";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, Coins, Crown, Shield, ShieldOff, UserMinus, UserPlus, Search, X, Plus, Minus, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchAdminUsers, adminAdjustCoins, adminGrantRole, adminRevokeRole,
  adminSetAccountStatus, adminGrantVip, adminRevokeVip, adminTransferSuperAdmin, type AdminUserRow,
} from "@/lib/admin-api";

type RoleValue = "admin" | "moderator" | "editor" | "author";
type StatusAction = "suspend" | "ban";

export function UsersTab() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [coinTarget, setCoinTarget] = useState<AdminUserRow | null>(null);
  const [vipTarget, setVipTarget] = useState<AdminUserRow | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ user: AdminUserRow; action: StatusAction } | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    title: string; body: string; confirmLabel: string; danger?: boolean; onConfirm: () => Promise<void>;
  } | null>(null);
  const usersQ = useQuery({ queryKey: ["admin-users-full", q], queryFn: () => fetchAdminUsers(q) });

  async function run(fn: () => Promise<void>, ok = "تم") {
    try { await fn(); toast.success(ok); qc.invalidateQueries({ queryKey: ["admin-users-full"] }); }
    catch (e) { showError(e); }
  }

  const roleOptions: Array<{ v: RoleValue; l: string }> = [
    { v: "admin", l: "مدير" }, { v: "moderator", l: "مشرف" }, { v: "editor", l: "محرّر" }, { v: "author", l: "كاتب" },
  ];

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); setQ(search); }} className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو المعرّف"
            className="h-10 w-full rounded-md border border-input bg-background/60 pe-9 ps-3 text-sm outline-none focus:border-primary" />
        </div>
        <Button type="submit" className="shrink-0">بحث</Button>
      </form>

      <div className="space-y-3">
        {(usersQ.data ?? []).map((u: AdminUserRow) => (
          <div key={u.id} className="rounded-xl border border-border/40 bg-surface/40 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{u.display_name || u.username}</span>
                  <span className="text-xs text-muted-foreground">@{u.username}</span>
                  {u.is_vip && <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">VIP</span>}
                  {u.account_status !== "active" && (
                    <span className="rounded-md bg-destructive/20 px-2 py-0.5 text-[10px] font-bold text-destructive">
                      {u.account_status === "banned" ? "محظور" : "معلّق"}
                    </span>
                  )}
                  {u.roles.map(r => <span key={r} className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{r}</span>)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  <Coins className="inline h-3 w-3" /> {u.coins.toLocaleString("ar")} عملة · انضم {new Date(u.created_at).toLocaleDateString("ar")}
                </div>
                {u.status_reason && <div className="mt-1 text-xs text-destructive">سبب: {u.status_reason}</div>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setCoinTarget(u)}>
                <Coins className="me-1 h-4 w-4" />تعديل رصيد
              </Button>

              <Button size="sm" variant="outline" onClick={() => setVipTarget(u)}>
                <Crown className="me-1 h-4 w-4" />منح VIP
              </Button>

              {u.is_vip && (
                <Button size="sm" variant="outline" onClick={() => setConfirmTarget({
                  title: "إلغاء VIP",
                  body: `هل تريد إلغاء اشتراك VIP لـ ${u.display_name || u.username}؟`,
                  confirmLabel: "إلغاء VIP",
                  danger: true,
                  onConfirm: async () => { await adminRevokeVip(u.id); toast.success("تم إلغاء VIP"); qc.invalidateQueries({ queryKey: ["admin-users-full"] }); },
                })}>
                  إلغاء VIP
                </Button>
              )}

              {roleOptions.map(r => (
                u.roles.includes(r.v) ? (
                  <Button key={r.v} size="sm" variant="outline" onClick={() => setConfirmTarget({
                    title: `إزالة صلاحية ${r.l}`,
                    body: `هل تريد إزالة صلاحية "${r.l}" عن ${u.display_name || u.username}؟`,
                    confirmLabel: `إزالة ${r.l}`,
                    danger: true,
                    onConfirm: async () => { await adminRevokeRole(u.id, r.v); toast.success(`أُلغي ${r.l}`); qc.invalidateQueries({ queryKey: ["admin-users-full"] }); },
                  })}>
                    <ShieldOff className="me-1 h-4 w-4" />إزالة {r.l}
                  </Button>
                ) : (
                  <Button key={r.v} size="sm" variant="outline" onClick={() => setConfirmTarget({
                    title: `منح صلاحية ${r.l}`,
                    body: `هل تريد منح صلاحية "${r.l}" لـ ${u.display_name || u.username}؟`,
                    confirmLabel: `منح ${r.l}`,
                    onConfirm: async () => { await adminGrantRole(u.id, r.v); toast.success(`مُنح ${r.l}`); qc.invalidateQueries({ queryKey: ["admin-users-full"] }); },
                  })}>
                    <Shield className="me-1 h-4 w-4" />منح {r.l}
                  </Button>
                )
              ))}

              {u.account_status === "active" ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setStatusTarget({ user: u, action: "suspend" })}>
                    <UserMinus className="me-1 h-4 w-4" />تعليق
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setStatusTarget({ user: u, action: "ban" })}>
                    <Ban className="me-1 h-4 w-4" />حظر
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setConfirmTarget({
                  title: "إعادة تفعيل الحساب",
                  body: `هل تريد إعادة تفعيل حساب ${u.display_name || u.username}؟`,
                  confirmLabel: "إعادة التفعيل",
                  onConfirm: async () => { await adminSetAccountStatus(u.id, "active"); toast.success("تم إعادة التفعيل"); qc.invalidateQueries({ queryKey: ["admin-users-full"] }); },
                })}>
                  <UserPlus className="me-1 h-4 w-4" />إعادة تفعيل
                </Button>
              )}
            </div>
          </div>
        ))}
        {usersQ.data?.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">لا يوجد مستخدمون.</div>
        )}
      </div>

      {coinTarget && (
        <AdjustCoinsDialog
          user={coinTarget}
          onClose={() => setCoinTarget(null)}
          onDone={() => { setCoinTarget(null); qc.invalidateQueries({ queryKey: ["admin-users-full"] }); }}
        />
      )}

      {vipTarget && (
        <GrantVipDialog
          user={vipTarget}
          onClose={() => setVipTarget(null)}
          onDone={() => { setVipTarget(null); qc.invalidateQueries({ queryKey: ["admin-users-full"] }); }}
        />
      )}

      {statusTarget && (
        <StatusDialog
          user={statusTarget.user}
          action={statusTarget.action}
          onClose={() => setStatusTarget(null)}
          onDone={() => { setStatusTarget(null); qc.invalidateQueries({ queryKey: ["admin-users-full"] }); }}
        />
      )}

      {confirmTarget && (
        <ConfirmDialog
          title={confirmTarget.title}
          body={confirmTarget.body}
          confirmLabel={confirmTarget.confirmLabel}
          danger={confirmTarget.danger}
          onClose={() => setConfirmTarget(null)}
          onConfirm={async () => {
            try { await confirmTarget.onConfirm(); setConfirmTarget(null); }
            catch (e) { showError(e); }
          }}
        />
      )}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-surface p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="min-w-0 truncate text-lg font-black">{title}</h3>
          <button onClick={onClose} aria-label="إغلاق" className="shrink-0"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({ title, body, confirmLabel, danger, onClose, onConfirm }: {
  title: string; body: string; confirmLabel: string; danger?: boolean; onClose: () => void; onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <ModalShell title={title} onClose={onClose}>
      <p className="mb-5 text-sm text-muted-foreground">{body}</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>إلغاء</Button>
        <Button onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}
          disabled={busy}
          className={danger ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}>
          {busy ? "جاري..." : confirmLabel}
        </Button>
      </div>
    </ModalShell>
  );
}

function GrantVipDialog({ user, onClose, onDone }: { user: AdminUserRow; onClose: () => void; onDone: () => void }) {
  const [days, setDays] = useState("30");
  const [busy, setBusy] = useState(false);
  const parsed = Math.floor(Number(days));
  const valid = Number.isFinite(parsed) && parsed > 0 && parsed <= 3650;

  async function submit() {
    if (!valid) return toast.error("أدخل عدد أيام صحيح");
    setBusy(true);
    try { await adminGrantVip(user.id, parsed); toast.success(`تم منح VIP لمدة ${parsed} يوماً`); onDone(); }
    catch (e) { showError(e); }
    finally { setBusy(false); }
  }

  return (
    <ModalShell title="منح اشتراك VIP" onClose={onClose}>
      <div className="mb-3 text-xs text-muted-foreground">المستخدم: <span className="font-bold text-foreground">{user.display_name || user.username}</span></div>
      <label className="mb-1 block text-xs font-bold">عدد الأيام</label>
      <input value={days} onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ""))}
        inputMode="numeric" autoFocus dir="ltr"
        className="mb-4 h-11 w-full rounded-md border border-input bg-background/60 px-3 text-base font-bold tabular-nums outline-none focus:border-primary" />
      <div className="mb-4 grid grid-cols-4 gap-2">
        {[7, 30, 90, 365].map(d => (
          <button key={d} type="button" onClick={() => setDays(String(d))}
            className="rounded-md border border-border/40 bg-background/40 p-2 text-xs font-semibold hover:border-primary">
            {d} يوم
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>إلغاء</Button>
        <Button onClick={submit} disabled={busy || !valid}>{busy ? "جاري..." : "منح VIP"}</Button>
      </div>
    </ModalShell>
  );
}

function StatusDialog({ user, action, onClose, onDone }: {
  user: AdminUserRow; action: StatusAction; onClose: () => void; onDone: () => void;
}) {
  const [days, setDays] = useState("7");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const parsed = Math.floor(Number(days));
  const validDays = Number.isFinite(parsed) && parsed > 0 && parsed <= 3650;
  const isBan = action === "ban";
  const title = isBan ? "حظر الحساب" : "تعليق الحساب";

  async function submit() {
    if (!isBan && !validDays) return toast.error("أدخل مدة صحيحة");
    setBusy(true);
    try {
      const until = isBan ? undefined : new Date(Date.now() + parsed * 86400000).toISOString();
      await adminSetAccountStatus(user.id, isBan ? "banned" : "suspended", reason.trim() || undefined, until);
      toast.success(isBan ? "تم الحظر" : "تم التعليق");
      onDone();
    } catch (e) { showError(e); }
    finally { setBusy(false); }
  }

  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="mb-3 text-xs text-muted-foreground">المستخدم: <span className="font-bold text-foreground">{user.display_name || user.username}</span></div>
      {!isBan && (
        <>
          <label className="mb-1 block text-xs font-bold">مدة التعليق (بالأيام)</label>
          <input value={days} onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric" autoFocus dir="ltr"
            className="mb-4 h-11 w-full rounded-md border border-input bg-background/60 px-3 text-base font-bold tabular-nums outline-none focus:border-primary" />
        </>
      )}
      <label className="mb-1 block text-xs font-bold">السبب {isBan ? "" : "(اختياري)"}</label>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500}
        placeholder={isBan ? "سبب الحظر" : "سبب التعليق"}
        autoFocus={isBan}
        className="mb-4 min-h-20 w-full resize-none rounded-md border border-input bg-background/60 p-2.5 text-sm outline-none focus:border-primary" />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>إلغاء</Button>
        <Button onClick={submit} disabled={busy}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          {busy ? "جاري..." : (isBan ? "تأكيد الحظر" : "تأكيد التعليق")}
        </Button>
      </div>
    </ModalShell>
  );
}

function AdjustCoinsDialog({ user, onClose, onDone }: { user: AdminUserRow; onClose: () => void; onDone: () => void }) {
  const [op, setOp] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("100");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const parsed = Math.floor(Number(amount));
  const valid = Number.isFinite(parsed) && parsed > 0;
  const delta = op === "add" ? parsed : -parsed;
  const preview = valid ? Math.max(user.coins + delta, 0) : user.coins;

  async function submit() {
    if (!valid) return toast.error("أدخل عدداً صحيحاً أكبر من صفر");
    if (note.length > 500) return toast.error("الملاحظة طويلة جداً");
    setBusy(true);
    try {
      await adminAdjustCoins(user.id, delta, note.trim() || undefined);
      toast.success(op === "add" ? `أُضيفت ${parsed.toLocaleString("ar")} عملة` : `خُصمت ${parsed.toLocaleString("ar")} عملة`);
      onDone();
    } catch (e) { showError(e); }
    finally { setBusy(false); }
  }

  return (
    <ModalShell title="تعديل رصيد العملات" onClose={onClose}>
      <div className="mb-4 truncate text-xs text-muted-foreground">
        {user.display_name || user.username} · الرصيد الحالي: <span className="font-bold text-foreground">{user.coins.toLocaleString("ar")}</span>
      </div>

      <label className="mb-1 block text-xs font-bold">العملية</label>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setOp("add")}
          className={`flex items-center justify-center gap-1.5 rounded-md border p-2.5 text-sm font-semibold transition-colors ${op === "add" ? "border-emerald-500 bg-emerald-500/15 text-emerald-500" : "border-border/40 bg-background/40 text-muted-foreground hover:border-border"}`}>
          <Plus className="h-4 w-4" />إضافة
        </button>
        <button type="button" onClick={() => setOp("remove")}
          className={`flex items-center justify-center gap-1.5 rounded-md border p-2.5 text-sm font-semibold transition-colors ${op === "remove" ? "border-destructive bg-destructive/15 text-destructive" : "border-border/40 bg-background/40 text-muted-foreground hover:border-border"}`}>
          <Minus className="h-4 w-4" />خصم
        </button>
      </div>

      <label className="mb-1 block text-xs font-bold">عدد العملات</label>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
        inputMode="numeric"
        autoFocus
        placeholder="500"
        className="mb-1 h-11 w-full rounded-md border border-input bg-background/60 px-3 text-base font-bold tabular-nums outline-none focus:border-primary"
        dir="ltr"
      />
      {valid ? (
        <div className="mb-4 text-xs text-muted-foreground">
          الرصيد بعد التعديل: <span className="font-bold text-foreground">{preview.toLocaleString("ar")}</span>
        </div>
      ) : <div className="mb-4 h-4" />}

      <label className="mb-1 block text-xs font-bold">ملاحظة (اختياري)</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        placeholder="مثال: هدية من الإدارة"
        className="mb-4 min-h-20 w-full resize-none rounded-md border border-input bg-background/60 p-2.5 text-sm outline-none focus:border-primary"
      />

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>إلغاء</Button>
        <Button onClick={submit} disabled={busy || !valid}
          className={op === "add" ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}>
          {busy ? "جاري الحفظ..." : op === "add" ? "إضافة العملات" : "خصم العملات"}
        </Button>
      </div>
    </ModalShell>
  );
}
