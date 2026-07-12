import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, Coins, Crown, Shield, ShieldOff, UserMinus, UserPlus, Search, X, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchAdminUsers, adminAdjustCoins, adminGrantRole, adminRevokeRole,
  adminSetAccountStatus, adminGrantVip, adminRevokeVip, type AdminUserRow,
} from "@/lib/admin-api";

export function UsersTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [coinTarget, setCoinTarget] = useState<AdminUserRow | null>(null);
  const usersQ = useQuery({ queryKey: ["admin-users-full", q], queryFn: () => fetchAdminUsers(q) });

  async function run(fn: () => Promise<void>, ok = "تم") {
    try { await fn(); toast.success(ok); qc.invalidateQueries({ queryKey: ["admin-users-full"] }); }
    catch (e) { toast.error((e as Error).message); }
  }

  const roleOptions: Array<{ v: "admin"|"moderator"|"editor"|"author"; l: string }> = [
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

              <Button size="sm" variant="outline" onClick={() => {
                const d = Number(prompt("عدد أيام VIP:", "30"));
                if (!Number.isFinite(d) || d <= 0) return;
                run(() => adminGrantVip(u.id, d), "تم منح VIP");
              }}><Crown className="me-1 h-4 w-4" />منح VIP</Button>

              {u.is_vip && (
                <Button size="sm" variant="outline" onClick={() => run(() => adminRevokeVip(u.id), "تم إلغاء VIP")}>
                  إلغاء VIP
                </Button>
              )}

              {roleOptions.map(r => (
                u.roles.includes(r.v) ? (
                  <Button key={r.v} size="sm" variant="outline" onClick={() => run(() => adminRevokeRole(u.id, r.v), `أُلغي ${r.l}`)}>
                    <ShieldOff className="me-1 h-4 w-4" />إزالة {r.l}
                  </Button>
                ) : (
                  <Button key={r.v} size="sm" variant="outline" onClick={() => run(() => adminGrantRole(u.id, r.v), `مُنح ${r.l}`)}>
                    <Shield className="me-1 h-4 w-4" />منح {r.l}
                  </Button>
                )
              ))}

              {u.account_status === "active" ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => {
                    const days = Number(prompt("مدة التعليق بالأيام:", "7"));
                    if (!Number.isFinite(days) || days <= 0) return;
                    const reason = prompt("السبب:") ?? undefined;
                    const until = new Date(Date.now() + days*86400000).toISOString();
                    run(() => adminSetAccountStatus(u.id, "suspended", reason, until), "تم التعليق");
                  }}><UserMinus className="me-1 h-4 w-4" />تعليق</Button>
                  <Button size="sm" variant="destructive" onClick={() => {
                    const reason = prompt("سبب الحظر:") ?? undefined;
                    if (!confirm("تأكيد حظر الحساب؟")) return;
                    run(() => adminSetAccountStatus(u.id, "banned", reason), "تم الحظر");
                  }}><Ban className="me-1 h-4 w-4" />حظر</Button>
                </>
              ) : (
                <Button size="sm" onClick={() => run(() => adminSetAccountStatus(u.id, "active"), "تم إعادة التفعيل")}>
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
    </div>
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
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-surface p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-black">تعديل رصيد العملات</h3>
            <div className="truncate text-xs text-muted-foreground">
              {user.display_name || user.username} · الرصيد الحالي: <span className="font-bold text-foreground">{user.coins.toLocaleString("ar")}</span>
            </div>
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="shrink-0"><X className="h-5 w-5" /></button>
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
        {valid && (
          <div className="mb-4 text-xs text-muted-foreground">
            الرصيد بعد التعديل: <span className="font-bold text-foreground">{preview.toLocaleString("ar")}</span>
          </div>
        )}
        {!valid && <div className="mb-4 h-4" />}

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
      </div>
    </div>
  );
}
