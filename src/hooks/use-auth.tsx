import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "moderator" | "editor" | "author" | "user";
type AccountStatus = "active" | "banned" | "suspended";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  loading: boolean;
  accountStatus: AccountStatus;
  isBlocked: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isAuthor: boolean;
  roles: Role[];
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>("active");

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) setTimeout(() => fetchUserState(s.user.id), 0);
      else {
        setRoles([]);
        setIsSuperAdmin(false);
        setAccountStatus("active");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) fetchUserState(data.session.user.id);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function fetchUserState(uid: string) {
    const [
      { data: profile },
      { data: rolesData },
      { data: sa },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("account_status,suspended_until")
        .eq("id", uid)
        .maybeSingle(),

      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid),

      supabase
        .from("super_admins")
        .select("user_id")
        .eq("user_id", uid)
        .maybeSingle(),
    ]);

    let status: AccountStatus =
      (profile?.account_status as AccountStatus) ?? "active";

    if (
      status === "suspended" &&
      profile?.suspended_until &&
      new Date(profile.suspended_until).getTime() <= Date.now()
    ) {
      status = "active";
    }

    setAccountStatus(status);
    setRoles(((rolesData ?? []) as { role: Role }[]).map((r) => r.role));
    setIsSuperAdmin(!!sa);

    return status;
  }

  const isAdmin = isSuperAdmin || roles.includes("admin");
  const isStaff = isAdmin || roles.includes("moderator") || roles.includes("editor");
  const isAuthor = roles.includes("author") || isAdmin;

  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    loading,
    accountStatus,
    isBlocked: accountStatus === "banned" || accountStatus === "suspended",
    isSuperAdmin,
    isAdmin,
    isStaff,
    isAuthor,
    roles,
    async signIn(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        return { error: error?.message ?? "تعذر تسجيل الدخول" };
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_status,suspended_until")
        .eq("id", data.user.id)
        .maybeSingle();

      const status =
        (profile?.account_status as AccountStatus) ?? "active";

      const blocked =
        status === "banned" ||
        (
          status === "suspended" &&
          (!profile?.suspended_until ||
            new Date(profile.suspended_until).getTime() > Date.now())
        );

      if (blocked) {
        await supabase.auth.signOut();

        return { error: "تعذر الاتصال بالخدمة، حاول لاحقًا." };
      }

      return {};
    },
    async signUp(email, password, username) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { username, display_name: username },
        },
      });
      return { error: error?.message };
    },
    async signOut() {
      await supabase.auth.signOut();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
