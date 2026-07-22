import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAdminUsers, adminAdjustCoins, adminGrantRole, adminRevokeRole, adminSetAccountStatus, adminGrantVip, adminRevokeVip, adminTransferSuperAdmin, AdminUserRow } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Shield, Coins, Crown, Lock, Unlock, UserCheck, UserX, AlertTriangle, MoreHorizontal, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

export function UsersTab() {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [actionType, setActionType] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState("");
  const [selectVal, setSelectVal] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const usersQ = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => fetchAdminUsers(search),
  });

  const adjustCoinsMutation = useMutation({
    mutationFn: ({ userId, delta, note }: { userId: string; delta: number; note?: string }) =>
      adminAdjustCoins(userId, delta, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "تم تعديل العملات بنجاح" });
      setActionType(null);
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const grantRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "admin" | "moderator" | "editor" | "author" | "user" }) =>
      adminGrantRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "تم منح الرتبة بنجاح" });
      setActionType(null);
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const revokeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "admin" | "moderator" | "editor" | "author" | "user" }) =>
      adminRevokeRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "تم إزالة الرتبة بنجاح" });
      setActionType(null);
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const setStatusMutation = useMutation({
    mutationFn: ({ userId, status, reason, until }: { userId: string; status: "active" | "suspended" | "banned"; reason?: string; until?: string }) =>
      adminSetAccountStatus(userId, status, reason, until),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "تم تحديث حالة الحساب بنجاح" });
      setActionType(null);
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const grantVipMutation = useMutation({
    mutationFn: ({ userId, days }: { userId: string; days: number }) =>
      adminGrantVip(userId, days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "تم منح VIP بنجاح" });
      setActionType(null);
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const revokeVipMutation = useMutation({
    mutationFn: (userId: string) => adminRevokeVip(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "تم إزالة VIP بنجاح" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const transferSuperMutation = useMutation({
    mutationFn: (userId: string) => adminTransferSuperAdmin(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "تم نقل صلاحيات المالك بنجاح" });
      setActionType(null);
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const handleActionSubmit = () => {
    if (!selectedUser) return;

    if (actionType === "coins") {
      const delta = parseInt(inputVal, 10);
      if (isNaN(delta)) return;
      adjustCoinsMutation.mutate({ userId: selectedUser.id, delta });
    } else if (actionType === "grant_role") {
      if (!selectVal) return;
      grantRoleMutation.mutate({ userId: selectedUser.id, role: selectVal as any });
    } else if (actionType === "revoke_role") {
      if (!selectVal) return;
      revokeRoleMutation.mutate({ userId: selectedUser.id, role: selectVal as any });
    } else if (actionType === "status") {
      if (!selectVal) return;
      setStatusMutation.mutate({ userId: selectedUser.id, status: selectVal as any, reason: inputVal });
    } else if (actionType === "vip") {
      const days = parseInt(inputVal, 10);
      if (isNaN(days)) return;
      grantVipMutation.mutate({ userId: selectedUser.id, days });
    } else if (actionType === "transfer_super") {
      transferSuperMutation.mutate(selectedUser.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث باسم المستخدم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المستخدم</TableHead>
              <TableHead>الرتب والصلاحيات</TableHead>
              <TableHead>العملات</TableHead>
              <TableHead>VIP</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersQ.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  جاري التحميل...
                </TableCell>
              </TableRow>
            ) : usersQ.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  لا يوجد مستخدمون
                </TableCell>
              </TableRow>
            ) : (
              usersQ.data?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{user.username}</span>
                      {user.is_super_admin && (
                        <Badge variant="destructive" className="gap-1">
                          <Crown className="h-3 w-3" /> مالك
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles?.length > 0 ? (
                        user.roles.map((role) => (
                          <Badge key={role} variant="secondary">
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">مستخدم عادي</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4 text-amber-500" />
                      <span>{user.coins ?? 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.is_vip ? (
                      <Badge variant="outline" className="border-amber-500 text-amber-500">
                        VIP
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.account_status === "active"
                          ? "default"
                          : user.account_status === "suspended"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {user.account_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-left">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setActionType("coins");
                            setInputVal("0");
                          }}
                        >
                          تعديل العملات (+/-)
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setActionType("grant_role");
                            setSelectVal("moderator");
                          }}
                        >
                          منح رتبة
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setActionType("revoke_role");
                            setSelectVal("moderator");
                          }}
                        >
                          إزالة رتبة
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setActionType("status");
                            setSelectVal("active");
                            setInputVal("");
                          }}
                        >
                          تغيير حالة الحساب
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setActionType("vip");
                            setInputVal("30");
                          }}
                        >
                          منح VIP
                        </DropdownMenuItem>
                        {user.is_vip && (
                          <DropdownMenuItem
                            onClick={() => revokeVipMutation.mutate(user.id)}
                          >
                            إزالة VIP
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setSelectedUser(user);
                            setActionType("transfer_super");
                          }}
                        >
                          نقل صلاحيات المالك
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!actionType} onOpenChange={(open) => !open && setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إدارة المستخدم: {selectedUser?.username}</DialogTitle>
            <DialogDescription>
              {actionType === "coins" && "أدخل عدد العملات المراد إضافتها أو خصمها (مثلاً: 100 أو -50)."}
              {actionType === "grant_role" && "اختر الرتبة المراد منحها للمستخدم."}
              {actionType === "revoke_role" && "اختر الرتبة المراد إزالتها من المستخدم."}
              {actionType === "status" && "اختر الحالة الجديدة للحساب مع ذكر السبب إن وجد."}
              {actionType === "vip" && "أدخل عدد الأيام لتفعيل اشتراك الـ VIP."}
              {actionType === "transfer_super" && "هل أنت متأكد من نقل صلاحيات المالك الخارقة لهذا المستخدم؟"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {actionType === "coins" && (
              <Input
                type="number"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="الكمية"
              />
            )}

            {(actionType === "grant_role" || actionType === "revoke_role") && (
              <Select value={selectVal} onValueChange={setSelectVal}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الرتبة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مشرف (Admin)</SelectItem>
                  <SelectItem value="moderator">مراقب (Moderator)</SelectItem>
                  <SelectItem value="editor">محرر (Editor)</SelectItem>
                  <SelectItem value="author">كاتب (Author)</SelectItem>
                  <SelectItem value="user">مستخدم (User)</SelectItem>
                </SelectContent>
              </Select>
            )}

            {actionType === "status" && (
              <div className="space-y-3">
                <Select value={selectVal} onValueChange={setSelectVal}>
                  <SelectTrigger>
                    <SelectValue placeholder="الحالة الجديدة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط (Active)</SelectItem>
                    <SelectItem value="suspended">موقوف (Suspended)</SelectItem>
                    <SelectItem value="banned">محظور (Banned)</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="السبب (اختياري)"
                />
              </div>
            )}

            {actionType === "vip" && (
              <Input
                type="number"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="عدد الأيام"
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>
              إلغاء
            </Button>
            <Button
              variant={actionType === "transfer_super" ? "destructive" : "default"}
              onClick={handleActionSubmit}
              disabled={
                adjustCoinsMutation.isPending ||
                grantRoleMutation.isPending ||
                revokeRoleMutation.isPending ||
                setStatusMutation.isPending ||
                grantVipMutation.isPending ||
                transferSuperMutation.isPending
              }
            >
              تنفيذ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
