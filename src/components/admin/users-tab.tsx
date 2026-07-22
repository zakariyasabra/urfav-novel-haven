import { showError } from "@/lib/errors";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Ban,
  Coins,
  Crown,
  Shield,
  ShieldOff,
  UserMinus,
  UserPlus,
  Search,
  X,
  Plus,
  Minus,
  Download,
  Users as UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { downloadCsv } from "@/lib/csv";
import { AdminListSkeleton, EmptyState } from "@/components/admin/list-skeleton";
import { useT } from "@/i18n/provider";
import {
  fetchAdminUsers,
  adminAdjustCoins,
  adminGrantRole,
  adminRevokeRole,
  adminSetAccountStatus,
  adminGrantVip,
  adminRevokeVip,
  // adminTransferSuperAdmin is intentionally not imported here — transfer is gated to a protected internal admin settings page.
  type AdminUserRow,
} from "@/lib/admin-api";

type SortKey = "created_at" | "coins" | "username";
type StatusFilter = "all" | "active" | "suspended" | "banned" | "vip" | "admins";

type RoleValue = "admin" | "moderator" | "editor" | "author";
type StatusAction = "suspend" | "ban";

export function UsersTab() {
  const t = useT();
  const qc = useQueryClient();
  
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 350);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [coinTarget, setCoinTarget] = useState<AdminUserRow | null>(null);
  const [vipTarget, setVipTarget] = useState<AdminUserRow | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    user: AdminUserRow;
    action: StatusAction;
  } | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const usersQ = useQuery({
    queryKey: ["admin-users-full", debounced],
    queryFn: () => fetchAdminUsers(debounced),
  });

  useEffect(() => {
    setPage(1);
  }, [debounced, filter, sortBy]);

  const filtered = useMemo(() => {
    const rows = usersQ.data ?? [];
    const f = rows.filter((u) => {
      if (filter === "all") return true;
      if (filter === "vip") return u.is_vip;
      if (filter === "admins")
        return (
          u.is_super_admin || u.roles.some((r) => ["admin", "moderator", "editor"].includes(r))
        );
      return u.account_status === filter;
    });
    const sorted = [...f].sort((a, b) => {
      if (sortBy === "coins") return b.coins - a.coins;
      if (sortBy === "username") return a.username.localeCompare(b.username);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return sorted;
  }, [usersQ.data, filter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  function exportCsv() {
    downloadCsv(`users-${new Date().toISOString().slice(0, 10)}`, filtered, [
      { key: "username", label: t("users.csv.username") },
      { key: "display_name", label: t("users.csv.displayName") },
      { key: "coins", label: t("users.csv.coins") },
      { key: "is_vip", label: "VIP", format: (v) => (v ? t("common.yes") : t("common.no")) },
      { key: "account_status", label: t("users.csv.status") },
      {
        key: "roles",
        label: t("users.csv.roles"),
        format: (v) => (Array.isArray(v) ? v.join("|") : ""),
      },
      {
        key: "created_at",
        label: t("users.csv.joined"),
        format: (v) => new Date(String(v)).toISOString().slice(0, 10),
      },
    ]);
  }

  const roleOptions: Array<{ v: RoleValue; l: string }> = [
    { v: "admin", l: t("users.role.admin") },
    { v: "moderator", l: t("users.role.moderator") },
    { v: "editor", l: t("users.role.editor") },
    { v: "author", l: t("users.role.author") },
  ];

  return (
    <div>
      <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("users.search.placeholder")}
            className="h-10 w-full rounded-md border border-input bg-background/60 pe-9 ps-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as StatusFilter)}
          className="h-10 rounded-md border border-input bg-background/60 px-2 text-sm outline-none focus:border-primary"
        >
          <option value="all">{t("users.filter.all")}</option>
          <option value="active">{t("users.filter.active")}</option>
          <option value="suspended">{t("users.filter.suspended")}</option>
          <option value="banned">{t("users.filter.banned")}</option>
          <option value="vip">{t("users.filter.vipOnly")}</option>
          <option value="admins">{t("users.filter.admins")}</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="h-10 rounded-md border border-input bg-background/60 px-2 text-sm outline-none focus:border-primary"
        >
          <option value="created_at">{t("users.sort.newest")}</option>
          <option value="coins">{t("users.sort.mostCoins")}</option>
          <option value="username">{t("users.sort.alphabetical")}</option>
        </select>
        <Button
          type="button"
          variant="outline"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="shrink-0"
        >
          <Download className="me-1 h-4 w-4" />
          CSV
        </Button>
      </div>

      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{t("users.result", { n: filtered.length })}</span>
        {totalPages > 1 && <span>{t("users.pageOf", { page, total: totalPages })}</span>}
      </div>

      {usersQ.isLoading ? (
        <AdminListSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("users.empty.title")}
          hint={t("users.empty.hint")}
          icon={<UsersIcon className="h-6 w-6" />}
        />
      ) : (
        <div className="space-y-3">
          {pageRows.map((u: AdminUserRow) => (
            <div key={u.id} className="rounded-xl border border-border/40 bg-surface/40 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{u.display_name || u.username}</span>
                    <span className="text-xs text-muted-foreground">@{u.username}</span>
                    {(() => {
                      const priority = [
                        {
                          match: u.is_super_admin,
                          emoji: "👑",
                          label: t("users.badge.superAdmin"),
                          cls: "bg-gradient-to-r from-amber-500/30 to-primary/30 text-primary",
                        },
                        {
                          match: u.roles.includes("admin"),
                          emoji: "🛡️",
                          label: t("users.role.admin"),
                          cls: "bg-primary/20 text-primary",
                        },
                        {
                          match: u.roles.includes("moderator"),
                          emoji: "⭐",
                          label: t("users.role.moderator"),
                          cls: "bg-primary/15 text-primary",
                        },
                        {
                          match: u.roles.includes("editor"),
                          emoji: "📝",
                          label: t("users.role.editor"),
                          cls: "bg-primary/10 text-primary",
                        },
                        {
                          match: u.roles.includes("author"),
                          emoji: "✍️",
                          label: t("users.role.author"),
                          cls: "bg-primary/10 text-primary",
                        },
                        {
                          match: u.is_vip,
                          emoji: "💎",
                          label: "VIP",
                          cls: "bg-primary/20 text-primary",
                        },
                      ];

                      return (
                        <>
                          {priority
                            .filter((p) => p.match)
                            .map((p) => (
                              <span
                                key={p.label}
                                className={`rounded-md px-2 py-0.5 text-[10px] font-black ${p.cls}`}
                              >
                                {p.emoji} {p.label}
                              </span>
                            ))}
                        </>
                      );
                    })()}
                    {u.account_status !== "active" && (
                      <span className="rounded-md bg-destructive/20 px-2 py-0.5 text-[10px] font-bold text-destructive">
                        {u.account_status === "banned"
                          ? t("users.status.banned")
                          : t("users.status.suspended")}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <Coins className="inline h-3 w-3" />{" "}
                    {t("users.coinsAndJoined", {
                      coins: u.coins,
                      date: new Date(u.created_at).toLocaleDateString(),
                    })}
                  </div>
                  {u.status_reason && (
                    <div className="mt-1 text-xs text-destructive">
                      {t("users.reason", { reason: u.status_reason })}
                    </div>
                  )}
                </div>
              </div>

              {u.is_super_admin ? (
                <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                  {t("users.superAdmin.notice")}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setCoinTarget(u)}>
                    <Coins className="me-1 h-4 w-4" />
                    {t("users.act.adjustCoins")}
                  </Button>

                  <Button size="sm" variant="outline" onClick={() => setVipTarget(u)}>
                    <Crown className="me-1 h-4 w-4" />
                    {t("users.act.grantVip")}
                  </Button>

                  {u.is_vip && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setConfirmTarget({
                          title: t("users.act.revokeVip"),
                          body: t("users.act.revokeVipBody", {
                            name: u.display_name || u.username,
                          }),
                          confirmLabel: t("users.act.revokeVip"),
                          danger: true,
                          onConfirm: async () => {
                            await adminRevokeVip(u.id);
                            toast.success(t("users.act.revokeVipDone"));
                            qc.invalidateQueries({ queryKey: ["admin-users-full"] });
                          },
                        })
                      }
                    >
                      {t("users.act.revokeVip")}
                    </Button>
                  )}

                  {roleOptions.map((r) =>
                    u.roles.includes(r.v) ? (
                      <Button
                        key={r.v}
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setConfirmTarget({
                            title: t("users.role.revokeTitle", { role: r.l }),
                            body: t("users.role.revokeBody", {
                              role: r.l,
                              name: u.display_name || u.username,
                            }),
                            confirmLabel: t("users.role.revokeBtn", { role: r.l }),
                            danger: true,
                            onConfirm: async () => {
                              await adminRevokeRole(u.id, r.v);
                              toast.success(t("users.role.revoked", { role: r.l }));
                              qc.invalidateQueries({ queryKey: ["admin-users-full"] });
                            },
                          })
                        }
                      >
                        <ShieldOff className="me-1 h-4 w-4" />
                        {t("users.role.revokeBtn", { role: r.l })}
                      </Button>
                    ) : (
                      <Button
                        key={r.v}
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setConfirmTarget({
                            title: t("users.role.grantTitle", { role: r.l }),
                            body: t("users.role.grantBody", {
                              role: r.l,
                              name: u.display_name || u.username,
                            }),
                            confirmLabel: t("users.role.grantBtn", { role: r.l }),
                            onConfirm: async () => {
                              await adminGrantRole(u.id, r.v);
                              toast.success(t("users.role.granted", { role: r.l }));
                              qc.invalidateQueries({ queryKey: ["admin-users-full"] });
                            },
                          })
                        }
                      >
                        <Shield className="me-1 h-4 w-4" />
                        {t("users.role.grantBtn", { role: r.l })}
                      </Button>
                    ),
                  )}

                  {u.account_status === "active" ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatusTarget({ user: u, action: "suspend" })}
                      >
                        <UserMinus className="me-1 h-4 w-4" />
                        {t("users.act.suspend")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setStatusTarget({ user: u, action: "ban" })}
                      >
                        <Ban className="me-1 h-4 w-4" />
                        {t("users.act.ban")}
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() =>
                        setConfirmTarget({
                          title: t("users.act.reactivateTitle"),
                          body: t("users.act.reactivateBody", {
                            name: u.display_name || u.username,
                          }),
                          confirmLabel: t("users.act.reactivate"),
                          onConfirm: async () => {
                            await adminSetAccountStatus(u.id, "active");
                            toast.success(t("users.act.reactivateDone"));
                            qc.invalidateQueries({ queryKey: ["admin-users-full"] });
                          },
                        })
                      }
                    >
                      <UserPlus className="me-1 h-4 w-4" />
                      {t("users.act.reactivate")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t("users.pager.prev")}
          </Button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            {t("users.pager.next")}
          </Button>
        </div>
      )}

      {coinTarget && (
        <AdjustCoinsDialog
          user={coinTarget}
          onClose={() => setCoinTarget(null)}
          onDone={() => {
            setCoinTarget(null);
            qc.invalidateQueries({ queryKey: ["admin-users-full"] });
          }}
        />
      )}

      {vipTarget && (
        <GrantVipDialog
          user={vipTarget}
          onClose={() => setVipTarget(null)}
          onDone={() => {
            setVipTarget(null);
            qc.invalidateQueries({ queryKey: ["admin-users-full"] });
          }}
        />
      )}

      {statusTarget && (
        <StatusDialog
          user={statusTarget.user}
          action={statusTarget.action}
          onClose={() => setStatusTarget(null)}
          onDone={() => {
            setStatusTarget(null);
            qc.invalidateQueries({ queryKey: ["admin-users-full"] });
          }}
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
            try {
              await confirmTarget.onConfirm();
              setConfirmTarget(null);
            } catch (e) {
              showError(e);
            }
          }}
        />
      )}
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border/60 bg-surface p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="min-w-0 truncate text-lg font-black">{title}</h3>
          <button onClick={onClose} aria-label={t("common.close")} className="shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  return (
    <ModalShell title={title} onClose={onClose}>
      <p className="mb-5 text-sm text-muted-foreground">{body}</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          {t("common.cancel")}
        </Button>
        <Button
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          className={
            danger ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""
          }
        >
          {busy ? t("users.busy") : confirmLabel}
        </Button>
      </div>
    </ModalShell>
  );
}

function GrantVipDialog({
  user,
  onClose,
  onDone,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useT();
  const [days, setDays] = useState("30");
  const [busy, setBusy] = useState(false);
  const parsed = Math.floor(Number(days));
  const valid = Number.isFinite(parsed) && parsed > 0 && parsed <= 3650;

  async function submit() {
    if (!valid) return toast.error(t("users.grantVip.invalidDays"));
    setBusy(true);
    try {
      await adminGrantVip(user.id, parsed);
      toast.success(t("users.grantVip.done", { n: parsed }));
      onDone();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title={t("users.grantVip.title")} onClose={onClose}>
      <div className="mb-3 text-xs text-muted-foreground">
        {t("users.grantVip.user")}{" "}
        <span className="font-bold text-foreground">{user.display_name || user.username}</span>
      </div>
      <label className="mb-1 block text-xs font-bold">{t("users.grantVip.days")}</label>
      <input
        value={days}
        onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ""))}
        inputMode="numeric"
        autoFocus
        dir="ltr"
        className="mb-4 h-11 w-full rounded-md border border-input bg-background/60 px-3 text-base font-bold tabular-nums outline-none focus:border-primary"
      />
      <div className="mb-4 grid grid-cols-4 gap-2">
        {[7, 30, 90, 365].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(String(d))}
            className="rounded-md border border-border/40 bg-background/40 p-2 text-xs font-semibold hover:border-primary"
          >
            {t("users.grantVip.dayLabel", { d })}
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          {t("common.cancel")}
        </Button>
        <Button onClick={submit} disabled={busy || !valid}>
          {busy ? t("users.busy") : t("users.act.grantVip")}
        </Button>
      </div>
    </ModalShell>
  );
}

function StatusDialog({
  user,
  action,
  onClose,
  onDone,
}: {
  user: AdminUserRow;
  action: StatusAction;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useT();
  const [days, setDays] = useState("7");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const parsed = Math.floor(Number(days));
  const validDays = Number.isFinite(parsed) && parsed > 0 && parsed <= 3650;
  const isBan = action === "ban";
  const title = isBan ? t("users.status.titleBan") : t("users.status.titleSuspend");

  async function submit() {
    if (!isBan && !validDays) return toast.error(t("users.status.invalidDuration"));
    setBusy(true);
    try {
      const until = isBan ? undefined : new Date(Date.now() + parsed * 86400000).toISOString();
      await adminSetAccountStatus(
        user.id,
        isBan ? "banned" : "suspended",
        reason.trim() || undefined,
        until,
      );
      toast.success(isBan ? t("users.status.doneBanned") : t("users.status.doneSuspended"));
      onDone();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="mb-3 text-xs text-muted-foreground">
        {t("users.grantVip.user")}{" "}
        <span className="font-bold text-foreground">{user.display_name || user.username}</span>
      </div>
      {!isBan && (
        <>
          <label className="mb-1 block text-xs font-bold">{t("users.status.duration")}</label>
          <input
            value={days}
            onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            autoFocus
            dir="ltr"
            className="mb-4 h-11 w-full rounded-md border border-input bg-background/60 px-3 text-base font-bold tabular-nums outline-none focus:border-primary"
          />
        </>
      )}
      <label className="mb-1 block text-xs font-bold">
        {isBan ? t("users.status.reasonRequired") : t("users.status.reasonOptional")}
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        placeholder={isBan ? t("users.status.reasonBanPh") : t("users.status.reasonSuspendPh")}
        autoFocus={isBan}
        className="mb-4 min-h-20 w-full resize-none rounded-md border border-input bg-background/60 p-2.5 text-sm outline-none focus:border-primary"
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          {t("common.cancel")}
        </Button>
        <Button
          onClick={submit}
          disabled={busy}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {busy
            ? t("users.busy")
            : isBan
              ? t("users.status.confirmBan")
              : t("users.status.confirmSuspend")}
        </Button>
      </div>
    </ModalShell>
  );
}

function AdjustCoinsDialog({
  user,
  onClose,
  onDone,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useT();
  const [op, setOp] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("100");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const parsed = Math.floor(Number(amount));
  const valid = Number.isFinite(parsed) && parsed > 0;
  const delta = op === "add" ? parsed : -parsed;
  const preview = valid ? Math.max(user.coins + delta, 0) : user.coins;

  async function submit() {
    if (!valid) return toast.error(t("users.adjust.invalid"));
    if (note.length > 500) return toast.error(t("users.adjust.noteTooLong"));
    setBusy(true);
    try {
      await adminAdjustCoins(user.id, delta, note.trim() || undefined);
      toast.success(
        op === "add"
          ? t("users.adjust.added", { n: parsed })
          : t("users.adjust.removed", { n: parsed }),
      );
      onDone();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title={t("users.adjust.title")} onClose={onClose}>
      <div className="mb-4 truncate text-xs text-muted-foreground">
        {t("users.adjust.header", { name: user.display_name || user.username, coins: user.coins })}
      </div>

      <label className="mb-1 block text-xs font-bold">{t("users.adjust.op")}</label>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setOp("add")}
          className={`flex items-center justify-center gap-1.5 rounded-md border p-2.5 text-sm font-semibold transition-colors ${op === "add" ? "border-emerald-500 bg-emerald-500/15 text-emerald-500" : "border-border/40 bg-background/40 text-muted-foreground hover:border-border"}`}
        >
          <Plus className="h-4 w-4" />
          {t("users.adjust.add")}
        </button>
        <button
          type="button"
          onClick={() => setOp("remove")}
          className={`flex items-center justify-center gap-1.5 rounded-md border p-2.5 text-sm font-semibold transition-colors ${op === "remove" ? "border-destructive bg-destructive/15 text-destructive" : "border-border/40 bg-background/40 text-muted-foreground hover:border-border"}`}
        >
          <Minus className="h-4 w-4" />
          {t("users.adjust.remove")}
        </button>
      </div>

      <label className="mb-1 block text-xs font-bold">{t("users.adjust.count")}</label>
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
          {t("users.adjust.after", { n: preview })}
        </div>
      ) : (
        <div className="mb-4 h-4" />
      )}

      <label className="mb-1 block text-xs font-bold">{t("users.adjust.note")}</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        placeholder={t("users.adjust.notePh")}
        className="mb-4 min-h-20 w-full resize-none rounded-md border border-input bg-background/60 p-2.5 text-sm outline-none focus:border-primary"
      />

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          {t("common.cancel")}
        </Button>
        <Button
          onClick={submit}
          disabled={busy || !valid}
          className={
            op === "add" ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
          }
        >
          {busy
            ? t("users.savingCoins")
            : op === "add"
              ? t("users.adjust.submitAdd")
              : t("users.adjust.submitRemove")}
        </Button>
      </div>
    </ModalShell>
  );
}
