import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "moderator" | "editor" | "author" | "user";
type AccountStatus = "active" | "suspended" | "banned";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  loading: boolean;

  accountStatus: AccountStatus;
  suspendedUntil: string | null;
  isBlocked: boolean;

  isSuperAdmin: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isAuthor: boolean;
  roles: Role[];

  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error?: string }>;

  signUp: (
    email: string,
    password: string,
    username: string,
  ) => Promise<{ error?: string }>;

  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [roles, setRoles] = useState<Role[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [accountStatus, setAccountStatus] =
    useState<AccountStatus>("active");

  const [suspendedUntil, setSuspendedUntil] =
    useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadUserState(uid: string) {
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

      if (!mounted) return;

      let status =
        (profile?.account_status as AccountStatus | null) ??
        "active";

      const until =
        profile?.suspended_until ?? null;

      // إذا انتهى التعليق، نعامله كحساب فعال من جهة الواجهة.
      if (
        status === "suspended" &&
        until &&
        new Date(until).getTime() <= Date.now()
      ) {
        status = "active";
      }

      setAccountStatus(status);
      setSuspendedUntil(until);

      setRoles(
        ((rolesData ?? []) as { role: Role }[]).map(
          (r) => r.role,
        ),
      );

      setIsSuperAdmin(!!sa);
    }

    const { data: sub } =
      supabase.auth.onAuthStateChange((_event, s) => {
        if (!mounted) return;

        setSession(s);

        if (s?.user) {
          setTimeout(() => {
            void loadUserState(s.user.id);
          }, 0);
        } else {
          setRoles([]);
          setIsSuperAdmin(false);
          setAccountStatus("active");
          setSuspendedUntil(null);
        }
      });

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;

      setSession(data.session);

      if (data.session?.user) {
        await loadUserState(data.session.user.id);
      }

      if (mounted) {
        setLoading(false);
      }
    });

    /*
     * مهم:
     * لو الأدمن حظر الحساب وهو فاتح الموقع،
     * نراجع الحالة بشكل دوري حتى يتوقف الموقع عنده
     * بدون الحاجة لتسجيل خروج أو إعادة فتح المتصفح.
     */
    const interval = window.setInterval(() => {
      void supabase.auth.getSession().then(({ data }) => {
        const uid = data.session?.user?.id;

        if (uid && mounted) {
          void loadUserState(uid);
        }
      });
    }, 15_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      sub.subscription.unsubscribe();
    };
  }, []);

  const suspendedNow =
    accountStatus === "suspended" &&
    (!suspendedUntil ||
      new Date(suspendedUntil).getTime() > Date.now());

  const isBlocked =
    accountStatus === "banned" || suspendedNow;

  const isAdmin =
    isSuperAdmin || roles.includes("admin");

  const isStaff =
    isAdmin ||
    roles.includes("moderator") ||
    roles.includes("editor");

  const isAuthor =
    roles.includes("author") || isAdmin;

  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    loading,

    accountStatus,
    suspendedUntil,
    isBlocked,

    isSuperAdmin,
    isAdmin,
    isStaff,
    isAuthor,
    roles,

    async signIn(email, password) {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error || !data.user) {
        return {
          error:
            error?.message ??
            "تعذر تسجيل الدخول، حاول مرة أخرى.",
        };
      }

      /*
       * لا نسجل الحساب المحظور خروج.
       *
       * لو عملنا signOut سيصبح زائرًا ويقدر يشوف
       * الصفحات العامة.
       *
       * نترك الجلسة موجودة حتى يكتشف Root أن
       * الحساب محظور ويمنع الموقع كله.
       */
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_status,suspended_until")
        .eq("id", data.user.id)
        .maybeSingle();

      const status =
        (profile?.account_status as AccountStatus | null) ??
        "active";

      const until =
        profile?.suspended_until ?? null;

      const blocked =
        status === "banned" ||
        (status === "suspended" &&
          (!until ||
            new Date(until).getTime() > Date.now()));

      if (blocked) {
        setAccountStatus(status);
        setSuspendedUntil(until);

        // رسالة عامة فقط، بدون أي ذكر للحظر.
        return {
          error: "تعذر الاتصال بالخدمة، حاول لاحقًا.",
        };
      }

      return {};
    },

    async signUp(email, password, username) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            username,
            display_name: username,
          },
        },
      });

      return {
        error: error?.message,
      };
    },

    async signOut() {
      await supabase.auth.signOut();
    },
  };

  return (
    <Ctx.Provider value={value}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);

  if (!ctx) {
    throw new Error(
      "useAuth must be used inside AuthProvider",
    );
  }

  return ctx;
}
