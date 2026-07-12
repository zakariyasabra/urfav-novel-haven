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
              <Button size="sm" variant="outline" onClick={() => {
                const n = Number(prompt("عدد العملات (سالب للخصم):", "100"));
                if (!Number.isFinite(n) || n === 0) return;
                const note = prompt("ملاحظة (اختياري):") ?? undefined;
                run(() => adminAdjustCoins(u.id, n, note), "تم تعديل الرصيد");
              }}><Coins className="me-1 h-4 w-4" />تعديل رصيد</Button>

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
    </div>
  );
}
